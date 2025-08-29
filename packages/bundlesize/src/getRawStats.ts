import { statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import bytes from "bytes";
import fs from "fs-extra";
import { glob } from "glob";
import {
	GLOB_HASH,
	GLOB_SEMVER,
	getOutputFile,
	gzipSizeFromFileSync,
	HASH_KEY,
	IGNORE,
	SEMVER_KEY,
	STDOUT,
	validateConfigurationFile,
} from "./utilities.js";

type SizeEntry = {
	limit: string;
	path: string;
	alias?: string;
};

type HeaderEntry = { header: string };

type SizesConfiguration = SizeEntry | HeaderEntry;

type ReportStats = {
	data: Record<string, unknown>;
	exitCode: number;
	exitMessage: string;
	outputFile: string;
	pass: boolean;
	prefix: string;
};

export const getRawStats = async ({ flags }): Promise<ReportStats> => {
	const result: ReportStats = {
		pass: true,
		exitCode: 0,
		exitMessage: "",
		outputFile: "",
		prefix: "",
		data: {},
	};
	let failed = false;
	const isValidConfigResult = validateConfigurationFile(flags.configuration);
	if (isValidConfigResult.exitMessage !== "") {
		return {
			...result,
			...isValidConfigResult,
		};
	}
	const configurationFile = isValidConfigResult.data;
	const outputFile = getOutputFile(flags.output);
	const prefix = flags.prefix || "0.0.0";
	const currentResults = {};

	const configuration: { sizes: SizesConfiguration[] } = await import(
		configurationFile
	).then((m) => m.default);

	if (configuration.sizes === undefined) {
		result.exitMessage = "Invalid configuration file: missing sizes object!";
		result.exitCode = 1;
		return result;
	}

	for (const artifact of configuration.sizes) {
		// Support header-only entries (group markers) that do not contribute to raw
		// stats.
		if ((artifact as HeaderEntry).header) {
			continue;
		}

		const sizeArtifact = artifact as SizeEntry;
		const rootPath = sizeArtifact.path.startsWith("/")
			? ""
			: dirname(configurationFile);
		const artifactPath = dirname(sizeArtifact.path);
		const hasHash = sizeArtifact.path.includes(HASH_KEY);
		const hasSemver = sizeArtifact.path.includes(SEMVER_KEY);

		if (hasSemver && hasHash) {
			result.exitCode = 1;
			result.exitMessage = `Invalid path: ${sizeArtifact.path}.\nCannot use ${HASH_KEY} and ${SEMVER_KEY} in the same path.`;
			return result;
		}

		let location = sizeArtifact.path;
		if (hasHash) {
			location = sizeArtifact.path.replace(HASH_KEY, GLOB_HASH);
		}
		if (hasSemver) {
			location = sizeArtifact.path.replace(SEMVER_KEY, GLOB_SEMVER);
		}
		const fileGlob = join(rootPath, location);
		const files = glob.sync(fileGlob);

		if (files.length === 0) {
			result.exitCode = 1;
			result.exitMessage = `File not found: ${fileGlob}`;
			return result;
		}

		if (files.length > 1) {
			result.exitCode = 1;
			result.exitMessage = `Multiple files found for: ${sizeArtifact.path}.\nPlease use a more specific path.`;
			return result;
		}

		for (const file of files) {
			const fileSize = statSync(file).size;
			const fileSizeGzip = gzipSizeFromFileSync(file);
			const passed = fileSizeGzip < bytes(sizeArtifact.limit);

			if (passed === false) {
				result.pass = false;
				failed = true;
			}

			let index =
				hasHash || hasSemver
					? sizeArtifact.path
					: join(artifactPath, basename(file));
			if (sizeArtifact.alias) {
				index = sizeArtifact.alias;
			}

			currentResults[index] = {
				fileSize,
				fileSizeGzip,
				limit: sizeArtifact.limit,
				passed,
			};
		}
	}

	let existingResults = {};
	if (outputFile !== STDOUT) {
		try {
			existingResults = fs.readJsonSync(outputFile);
			/* v8 ignore next 6 */
		} catch {
			/**
			 * There are no existing results, so we can ignore this error, and simply
			 * write the current results to the output file.
			 */
		}
	}

	/**
	 * If the prefix already exists in the output file,
	 * - if --force flag is used, overwrite the existing results
	 * - if --force flag is not used, ignore the new results and
	 *   keep the existing ones.
	 */
	if (existingResults[prefix] !== undefined && flags.force === false) {
		result.outputFile = IGNORE;
	} else {
		result.outputFile = outputFile;
		existingResults[prefix] = currentResults;
	}

	result.prefix = prefix;
	result.exitCode = flags.silent === true ? 0 : Number(failed);
	result.data = existingResults;
	return result;
};
