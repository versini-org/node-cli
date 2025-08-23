/* v8 ignore start */

import { parser } from "@node-cli/parser";
import { defaultFlags, defaultParameters } from "./defaults.js";

export type Flags = {
	boring?: boolean;
	dot?: boolean;
	ignoreCase?: boolean;
	short?: boolean;
	stats?: boolean;
	grep?: string;
	type?: string;
	ignore?: string[];
	printMode?: string;
};

export type Parameters = {
	path?: string;
};

export type Configuration = {
	flags?: Flags;
	parameters?: Parameters;
};

/* v8 ignore start */
export const config: Configuration = parser({
	meta: import.meta,
	examples: [
		{
			command: 'search --type f --pattern ".jsx$" src/',
			comment:
				'## Find all files with the extension ".jsx" in the "src" folder',
		},
		{
			command: 'search --type f --pattern ".sh$" --command "chmod +x" bin/',
			comment: `## Change the permissions to executable for all the files with\n    ## the extension ".sh" found under the "bin" folder`,
		},
		{
			command: 'search --type f --pattern ".md$" --grep "Table of Content"',
			comment: `## Search in all the markdown files under the "src" folder for\n    ## the keywords "Table of Content"`,
		},
	],
	flags: {
		boring: {
			shortFlag: "b",
			default: defaultFlags.boring,
			description: "Do not use color output",
			type: "boolean",
		},
		command: {
			shortFlag: "c",
			description: "Command to execute over each node (ex: chmod +x)",
			type: "string",
		},
		dot: {
			default: defaultFlags.dot,
			description: "Show hidden files and directories",
			type: "boolean",
		},
		grep: {
			shortFlag: "g",
			description: "A RegExp to match the content of the files found",
			type: "string",
		},
		help: {
			shortFlag: "h",
			description: "Display help instructions",
			type: "boolean",
		},
		ignoreCase: {
			shortFlag: "i",
			default: defaultFlags.ignoreCase,
			description: "Ignore case when searching",
			type: "boolean",
		},
		pattern: {
			shortFlag: "p",
			description: "A regular expression to match file or folder names",
			type: "string",
		},
		short: {
			default: defaultFlags.short,
			description: "Short listing format (equivalent to ls)",
			type: "boolean",
		},
		stats: {
			shortFlag: "s",
			default: defaultFlags.stats,
			description: "Display some statistics",
			type: "boolean",
		},
		type: {
			shortFlag: "t",
			default: "both",
			description: "Search for files (f) or directories (d)",
			type: "string",
		},
		version: {
			shortFlag: "v",
			description: "Output the current version",
			type: "boolean",
		},
		ignoreExtension: {
			shortFlag: "I",
			description: "Ignore files extension, can be used multiple times",
			type: "string",
			isMultiple: true,
		},
		ignoreFile: {
			shortFlag: "F",
			description: "Ignore files name, can be used multiple times",
			type: "string",
			isMultiple: true,
		},
		ignoreFolder: {
			shortFlag: "D",
			description: "Ignore folders name, can be used multiple times",
			type: "string",
			isMultiple: true,
		},
		printMode: {
			shortFlag: "P",
			description: "Print mode (simple or xml)",
			type: "string",
		},
		ignoreGitIgnore: {
			description: "Ignore .gitignore files",
			default: defaultFlags.ignoreGitIgnore,
			type: "boolean",
		},
	},
	parameters: {
		path: {
			default: "current folder",
			description: "the path where to start the search",
		},
	},
	usage: "search [options] [path]",
	defaultFlags,
	defaultParameters,
});
/* v8 ignore stop */
