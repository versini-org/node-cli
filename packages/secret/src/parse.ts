import { parser } from "@node-cli/parser";
import kleur from "kleur";

export type Flags = {
	decrypt?: boolean;
	encrypt?: boolean;
	help?: boolean;
	version?: boolean;
};

export type Parameters = {
	input?: string;
	output?: string;
};

export type Configuration = {
	flags?: Flags;
	parameters?: Parameters;
};

/* istanbul ignore next */
export const config: Configuration = parser({
	meta: import.meta,
	examples: [
		{
			command: 'secret -e "my-file.txt" "my-file.txt.enc"',
			comment:
				'## Encrypt the file "my-file.txt" and save the result in\n    ## "my-file.txt.enc" - password will be prompted',
		},
		{
			command: 'secret -d "my-file.txt.enc" "my-file.txt"',
			comment: `## Decrypt the file "my-file.txt.enc" and save the\n    ## result in "my-file.txt" - password will be prompted`,
		},
	],
	flags: {
		decrypt: {
			shortFlag: "d",
			description: `Decrypt a password protected file`,
			type: "boolean",
		},
		encrypt: {
			shortFlag: "e",
			description: `Encrypt a file with a password`,
			type: "boolean",
		},
		help: {
			shortFlag: "h",
			description: "Display help instructions",
			type: "boolean",
		},
		version: {
			shortFlag: "v",
			description: "Output the current version",
			type: "boolean",
		},
	},
	parameters: {
		input: {
			description: "The file to encrypt or decrypt",
		},
		output: {
			description:
				"The file to create in order to save the result of the encryption or decryption",
		},
	},
	restrictions: [
		{
			exit: 1,
			message: () =>
				kleur.red(
					`\nError: one of --encrypt or --decrypt option must be provided.`,
				),
			test: (x: { encrypt: boolean; decrypt: boolean }) =>
				x.encrypt === false && x.decrypt === false,
		},
		{
			exit: 1,
			message: () =>
				kleur.red(
					`\nError: either --encrypt or --decrypt option must be provided, but not both.`,
				),
			test: (x: { encrypt: boolean; decrypt: boolean }) =>
				x.encrypt === true && x.decrypt === true,
		},
	],

	usage: "secret [options] [input] [output]",
});
