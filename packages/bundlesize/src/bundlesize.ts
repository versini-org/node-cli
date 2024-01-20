#!/usr/bin/env node
/* istanbul ignore file */

import { STDOUT, reportStats } from "./utilities.js";

import { Logger } from "@node-cli/logger";
import { config } from "./parse.js";
import fs from "fs-extra";

const flags = config.flags;

const log = new Logger({
	boring: flags.boring,
});

try {
	const result = await reportStats({ flags });

	if (result.exitMessage !== "") {
		log.error(result.exitMessage);
		process.exit(result.exitCode);
	}

	if (result.outputFile === STDOUT) {
		log.info(`Configuration: ${flags.configuration}`);
		log.info(`Output: ${result.outputFile}`);
		log.info(`Output prefix: ${result.prefix}`);
		log.log(result.data);
	} else {
		try {
			fs.outputJsonSync(result.outputFile, result.data, { spaces: 2 });
		} catch (error) {
			log.error(`Failed to write to file: ${error.message}`);
			process.exit(1);
		}
	}
	process.exit(result.exitCode);
} catch (error) {
	log.error(error);
	process.exit(0);
}
