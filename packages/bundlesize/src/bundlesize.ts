#!/usr/bin/env node

import { Logger } from "@node-cli/logger";
import bytes from "bytes";
import { config } from "./parse.js";
import fs from "fs-extra";
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
const resultsMap = new Map();
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
		const file = path.join(path.dirname(configurationFile), artifact.path);
		const fileSize = statSync(file).size;
		const fileSizeGzip = gzipSizeFromFileSync(file);
		const passed = fileSizeGzip < bytes(artifact.limit);

		if (passed === false) {
			failed = true;
		}

		resultsMap.set(artifact.path, {
			path: file,
			fileSize,
			fileSizeGzip,
			limit: artifact.limit,
			passed,
		});
	}

	const results = [...resultsMap.values()];
	let existingResults = {};
	if (outputFile !== STDOUT) {
		try {
			existingResults = fs.readJsonSync(outputFile);
		} catch {
			// nothing to declare officer
		}
	}
	existingResults[prefix] = results;
	if (outputFile !== STDOUT) {
		fs.outputJsonSync(outputFile, existingResults, { spaces: 2 });
	}

	if (outputFile === STDOUT) {
		log.info(`Configuration: ${flags.configuration}`);
		log.info(`Output: ${outputFile}`);
		log.info(`Output prefix: ${prefix}`);
		log.log(`\n${JSON.stringify(results, undefined, 2)}`);
	}
} catch (error) {
	log.error(error);
	process.exit(0);
}

if (failed && flags.silent === false) {
	process.exit(1);
}
