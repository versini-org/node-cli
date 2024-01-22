import bytes from "bytes";
import fs from "fs-extra";
import { glob } from "glob";
import path from "node:path";
import { statSync } from "node:fs";
import zlib from "node:zlib";

type Artifact = {
	path: string;
	limit: string;
};

type ReportStats = {
	pass: boolean;
	exitCode: number;
	exitMessage: string;
	outputFile: string;
	prefix: string;
	data: Record<string, unknown>;
};

export const STDOUT = "stdout";
const CWD = process.cwd();

const gzipSizeFromFileSync = (file: string): number => {
	return zlib.gzipSync(fs.readFileSync(file)).length;
};

export const reportStats = async ({ flags }): Promise<ReportStats> => {
	const result = {
		pass: true,
		exitCode: 0,
		exitMessage: "",
		outputFile: "",
		prefix: "",
		data: {},
	};
	let failed = false;
	const configurationFile = flags.configuration.startsWith("/")
		? flags.configuration
		: path.join(CWD, flags.configuration);

	const outputFile =
		flags.output === "" || flags.output === undefined
			? STDOUT
			: path.join(CWD, flags.output);
	const prefix = flags.prefix || "0.0.0";
	const currentResults = {};

	if (flags.configuration === "") {
		result.exitMessage = "Please provide a configuration file";
		result.exitCode = 1;
		return result;
	}

	if (fs.existsSync(configurationFile) === false) {
		result.exitMessage = "Invalid or missing configuration file!";
		result.exitCode = 1;
		return result;
	}
	const configuration: Artifact[] = await import(configurationFile).then(
		(m) => m.default,
	);

	for (const artifact of configuration) {
		const rootPath = artifact.path.startsWith("/")
			? ""
			: path.dirname(configurationFile);
		const artifactPath = path.dirname(artifact.path);
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

		const fileGlob = path.join(
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
			let index = hasHash
				? artifact.path
				: path.join(artifactPath, path.basename(file));

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
	existingResults[prefix] = currentResults;

	result.prefix = prefix;
	result.outputFile = outputFile;
	result.exitCode = failed && flags.silent === false ? 1 : 0;
	result.data = existingResults;
	return result;
};
