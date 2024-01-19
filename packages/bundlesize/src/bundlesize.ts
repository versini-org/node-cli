#!/usr/bin/env node

import { Logger } from "@node-cli/logger";
import bytes from "bytes";
import { config } from "./parse.js";
import fs from "fs-extra";
import { glob } from "glob";
import { gzipSizeFromFileSync } from "gzip-size";
import path from "node:path";
import { statSync } from "node:fs";

const STDOUT = "stdout";
const CWD = process.cwd();

const flags = config.flags;
const configurationFile = path.join(CWD, flags.configuration);
const outputFile =
	flags.output === "" || flags.output === undefined
		? STDOUT
		: path.join(CWD, flags.output);
const prefix = flags.prefix || Date.now().toString();
const currentResults = {};
const log = new Logger({
	boring: flags.boring,
});

let failed = false;

if (flags.configuration === "") {
	log.error("Please provide a configuration file");
	process.exit(0);
}

if (fs.existsSync(configurationFile) === false) {
	log.error("Invalid or missing configuration file!");
	process.exit(0);
}

try {
	const configuration = await import(configurationFile).then((m) => m.default);

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
			log.error(`Invalid path: ${artifact.path}.`);
			log.error(
				"Single stars (*) are not allowed when using the special keyword <hash>",
			);
			process.exit(1);
		}

		const fileGlob = path.join(
			rootPath,
			artifact.path.replace("<hash>", globReplace),
		);
		const files = glob.sync(fileGlob);

		if (files.length === 0) {
			log.error(`File not found: ${fileGlob}`);
			process.exit(1);
		}

		if (files.length > 1 && hasHash) {
			log.error(`Multiple files found for: ${artifact.path}.`);
			log.error(
				"Please use a more specific path when using the special keyword <hash>.",
			);
			process.exit(1);
		}

		for (const file of files) {
			const fileSize = statSync(file).size;
			const fileSizeGzip = gzipSizeFromFileSync(file);
			const passed = fileSizeGzip < bytes(artifact.limit);

			if (passed === false) {
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
			// nothing to declare officer
		}
	}
	existingResults[prefix] = currentResults;
	if (outputFile !== STDOUT) {
		fs.outputJsonSync(outputFile, existingResults, { spaces: 2 });
	}

	if (outputFile === STDOUT) {
		log.info(`Configuration: ${flags.configuration}`);
		log.info(`Output: ${outputFile}`);
		log.info(`Output prefix: ${prefix}`);
		log.log(`\n${JSON.stringify(currentResults, undefined, 2)}`);
	}
} catch (error) {
	log.error(error);
	process.exit(0);
}

if (failed && flags.silent === false) {
	process.exit(1);
}
