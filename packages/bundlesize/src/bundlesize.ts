#!/usr/bin/env node
/* istanbul ignore file */

import { Logger } from "@node-cli/logger";
import { STDOUT } from "./utilities.js";
import { config } from "./parse.js";
import fs from "fs-extra";
import { getRawStats } from "./getRawStats.js";
import { reportStats } from "./reportStats.js";

const flags = config.flags;

const log = new Logger({
	boring: flags.boring,
});

if (flags.type === "size") {
	try {
		const result = await getRawStats({ flags });

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
		process.exit(1);
	}
}

if (flags.type === "report") {
	try {
		const result = await reportStats({ flags });

		if (result.exitMessage !== "") {
			log.error(result.exitMessage);
			process.exit(result.exitCode);
		}

		if (result.outputFile === STDOUT) {
			log.info(`Configuration: ${flags.configuration}`);
			log.info(`Output: ${result.outputFile}`);
			log.log(result.data);
		} else {
			try {
				fs.outputFileSync(result.outputFile, result.data);
			} catch (error) {
				log.error(`Failed to write to file: ${error.message}`);
				process.exit(1);
			}
		}
		process.exit(result.exitCode);
	} catch (error) {
		log.error(error);
		process.exit(1);
	}
}

log.error("Invalid type, please use 'size' or 'report'");
process.exit(1);
