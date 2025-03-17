#!/usr/bin/env node
/* istanbul ignore file */

import path from "node:path";
import { Logger } from "@node-cli/logger";
import fs from "fs-extra";
import { Search } from "./core.js";
import { config } from "./parse.js";
import { STR_TYPE_FILE } from "./utilities.js";

const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

let customPath = config.parameters[0];
if (fs.pathExistsSync(customPath)) {
	customPath = path.resolve(customPath);
} else {
	logger.printErrorsAndExit([`Folder ${customPath} does not exist!`], 0);
}

if (config.flags.grep) {
	// forcing simplified display if grep is true.
	config.flags.short = true;
	// And forcing type to files
	config.flags.type = STR_TYPE_FILE;
}

const search = new Search({
	...config.flags,
	path: customPath,
});

await search.start();
