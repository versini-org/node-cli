#!/usr/bin/env node

import { Logger } from "@node-cli/logger";
import bytes from "bytes";
import { config } from "./parse.js";
import fs from "fs-extra";
import { gzipSizeFromFileSync } from "gzip-size";
import path from "node:path";
import { statSync } from "node:fs";

const DEFAULT_OUTPUT_FILE = "bundlesize-results.json";
const CWD = process.cwd();

const flags = config.flags;
const configurationFile = path.join(CWD, flags.configuration);
const outputFile = path.join(CWD, flags.output || DEFAULT_OUTPUT_FILE);
const outputName = flags.outputName || Date.now().toString();
const resultsMap = new Map();
const log = new Logger();

if (flags.configuration === "") {
	log.error("Missing configuration file!");
	process.exit(0);
}

if (fs.existsSync(configurationFile) === false) {
	log.error("Invalid configuration file!");
	process.exit(0);
}

try {
	const configuration = await import(configurationFile).then((m) => m.default);

	for (const artifact of configuration) {
		const file = path.join(path.dirname(configurationFile), artifact.path);
		const fileSize = statSync(file).size;
		const fileSizeGzip = gzipSizeFromFileSync(file);

		resultsMap.set(artifact.path, {
			path: file,
			fileSize,
			fileSizeGzip,
			limit: artifact.limit,
			passed: fileSizeGzip < bytes(artifact.limit),
		});
	}

	const results = [...resultsMap.values()];
	let existingResults = {};
	try {
		existingResults = fs.readJsonSync(outputFile);
	} catch {
		// nothing to declare officer
	}
	existingResults[outputName] = results;
	fs.outputJsonSync(outputFile, existingResults, { spaces: 2 });
} catch (error) {
	log.error(error);
	process.exit(0);
}
