import { Logger } from "@node-cli/logger";
import fs from "fs-extra";
import inquirer from "inquirer";

import { decrypt, encrypt } from "./lib.js";

export const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

const UTF8 = "utf8";
const DEFAULT_FILE_ENCODING = UTF8;

/**
 * Process a file with a given password. The file can be encoded or decoded
 * depending on the `encode` flag.
 * @param  {Boolean} encode   whether to encode or decode the file
 * @param  {String}  input    the input file path
 * @param  {String}  [output] the output file path
 * @param  {String}  password the password to use
 * @return {Promise}          a promise that resolves when
 *                            the file has been processed.
 */
export type ProcessFileOptions = {
	encode: boolean;
	input: string;
	output?: string;
	password: string;
};
export const processFileWithPassword = async (
	options: ProcessFileOptions,
): Promise<void> => {
	const { encode, input, output, password } = options;
	const fileProcessor = encode ? encrypt : decrypt;
	const data = await fs.readFile(input, DEFAULT_FILE_ENCODING);

	if (output) {
		// Save data to output file.
		await fs.outputFile(output, fileProcessor(password, data));
	} else {
		// Print to stdout directly.
		logger.log(fileProcessor(password, data));
	}
};

/* v8 ignore start */
export const displayConfirmation = async (message: string) => {
	const questions = {
		default: true,
		message: message || "Do you want to continue?",
		name: "goodToGo",
		type: "confirm",
	};
	logger.log();
	const answers = await inquirer.prompt(questions);
	return answers.goodToGo;
};

export const displayPromptWithPassword = async (message: string) => {
	const questions = {
		message: message,
		name: "password",
		type: "password",
		validate(value: string) {
			if (!value) {
				return "Password cannot be empty...";
			}
			return true;
		},
	};
	const answers = await inquirer.prompt(questions);
	return answers.password;
};

export const shouldContinue = (goodToGo: boolean) => {
	if (!goodToGo) {
		logger.log("\nBye then!");
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(0);
	}
	return true;
};
/* v8 ignore stop */
