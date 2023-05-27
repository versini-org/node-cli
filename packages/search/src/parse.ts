import { defaultFlags, defaultParameters } from "./defaults.js";

import { parser } from "@node-cli/parser";

export type Flags = {
	boring?: boolean;
	dot?: boolean;
	ignoreCase?: boolean;
	short?: boolean;
	stats?: boolean;
	grep?: string;
	type?: string;
};

export type Parameters = {
	path?: string;
};

export type Configuration = {
	flags?: Flags;
	parameters?: Parameters;
};

/* istanbul ignore next */
export const config: Configuration = parser({
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
			default: "N/A",
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
			default: "N/A",
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
			default: "N/A",
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
