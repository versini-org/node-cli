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
		const file = path.join(rootPath, artifact.path);
		const files = glob.sync(file);

		if (files.length === 0) {
			log.error(`File not found: ${file}`);
			process.exit(flags.silent === false ? 1 : 0);
		}

		for (const file of files) {
			const fileSize = statSync(file).size;
			const fileSizeGzip = gzipSizeFromFileSync(file);
			const passed = fileSizeGzip < bytes(artifact.limit);

			if (passed === false) {
				failed = true;
			}
			let index = file.replace(rootPath, "");
			if (!artifact.path.startsWith("/") && index.startsWith("/")) {
				index = index.slice(1);
			}

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
