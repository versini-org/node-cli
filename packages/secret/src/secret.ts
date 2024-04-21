#!/usr/bin/env node
/* istanbul ignore file */

import {
	displayConfirmation,
	displayPromptWithPassword,
	logger,
	processFileWithPassword,
	shouldContinue,
} from "./utilities.js";

import path from "node:path";
import fs from "fs-extra";
import { config } from "./parse.js";

const ENCRYPT = "encrypt";
const DECRYPT = "decrypt";

/**
 * Caching the "action" for future usage (encrypt or decrypt).
 */
const actionName = config.flags.encrypt ? ENCRYPT : DECRYPT;

/**
 * Extracting the input and output files.
 */
let inputFile: string,
	outputFile: string,
	outputFileExists: boolean = false;
if (Object.entries(config.parameters).length > 0) {
	inputFile = config.parameters["0"];
	outputFile = config.parameters["1"];
	if (!fs.existsSync(inputFile)) {
		logger.printErrorsAndExit([`File "${inputFile}" does not exist!`], 1);
	}
	if (fs.existsSync(outputFile)) {
		outputFileExists = true;
	}
}

if (outputFileExists) {
	const goodToGo = await displayConfirmation(
		`The file ${outputFile} already exists, overwrite it?`,
	);
	shouldContinue(goodToGo);
}

const password = await displayPromptWithPassword(
	`Enter password to ${actionName} the file`,
);

try {
	await processFileWithPassword({
		encode: config.flags.encrypt,
		input: inputFile,
		output: outputFile,
		password,
	});
	logger.log();
	logger.info(`File ${path.basename(inputFile)} was ${actionName}ed.`);
	if (outputFileExists) {
		logger.info(`The result was saved in the file ${outputFile}`);
	}
} catch (error) {
	logger.error(error);
}
