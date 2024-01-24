import {
	IGNORE,
	STDOUT,
	getOutputFile,
	gzipSizeFromFileSync,
	validateConfigurationFile,
} from "./utilities.js";
import { basename, dirname, join } from "node:path";

import bytes from "bytes";
import fs from "fs-extra";
import { glob } from "glob";
import { statSync } from "node:fs";

type SizesConfiguration = {
	limit: string;
	path: string;
};

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
		const rootPath = artifact.path.startsWith("/")
			? ""
			: dirname(configurationFile);
		const artifactPath = dirname(artifact.path);
		const globReplace = "+([a-zA-Z0-9_-])";
		const hasHash = artifact.path.includes("<hash>");

		/**
		 * if the artifact.path has the string <hash> in it,
		 * then we need to check for other characters:
		 * - Double stars ** are allowed.
		 * - Single stars * are not allowed.
		 */
		if (hasHash && /(?<!\*)\*(?!\*)/.test(artifact.path)) {
			result.exitCode = 1;
			result.exitMessage = `Invalid path: ${artifact.path}.\nSingle stars (*) are not allowed when using the special keyword <hash>`;
			return result;
		}

		const fileGlob = join(
			rootPath,
			artifact.path.replace("<hash>", globReplace),
		);
		const files = glob.sync(fileGlob);

		if (files.length === 0) {
			result.exitCode = 1;
			result.exitMessage = `File not found: ${fileGlob}`;
			return result;
		}

		if (files.length > 1 && hasHash) {
			result.exitCode = 1;
			result.exitMessage = `Multiple files found for: ${artifact.path}.\nPlease use a more specific path when using the special keyword <hash>.`;
			return result;
		}

		for (const file of files) {
			const fileSize = statSync(file).size;
			const fileSizeGzip = gzipSizeFromFileSync(file);
			const passed = fileSizeGzip < bytes(artifact.limit);

			if (passed === false) {
				result.pass = false;
				failed = true;
			}
			let index = hasHash ? artifact.path : join(artifactPath, basename(file));

			currentResults[index] = {
				fileSize,
				fileSizeGzip,
				limit: artifact.limit,
				passed,
			};
		}
	}

	let existingResults = {};
	if (outputFile !== STDOUT) {
		try {
			existingResults = fs.readJsonSync(outputFile);
		} catch {
			/**
			 * There are no existing results, so we can ignore this error,
			 * and simply write the current results to the output file.
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

	result.exitCode = failed && flags.silent === false ? 1 : 0;
	result.data = existingResults;
	return result;
};
