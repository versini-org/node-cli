/* v8 ignore start */
import { parser } from "@node-cli/parser";
import { defaultFlags } from "./defaults.js";

export type Flags = {
	width?: number;
	dryRun?: boolean;
	stdout?: boolean;
	noLineWrap?: boolean;
	mergeLineComments?: boolean;
	boring?: boolean;
	help?: boolean;
	version?: boolean;
};
export type Parameters = {
	files?: string;
};
export type Configuration = {
	flags?: Flags;
	parameters?: Parameters;
	showHelp?: () => void;
};

/* v8 ignore next 120 */
export const config: Configuration = parser({
	meta: import.meta,
	examples: [
		{
			command: "comments src/**/*.ts",
			comment: "## Reflow comments in all TS source files",
		},
		{
			command: "comments --dry-run src/index.ts",
			comment: "## Show diff for a single file without writing",
		},
		{
			command: "comments --width 100 --merge-line-comments 'src/**/*.ts'",
			comment: "## Use width 100 and merge groups of line comments",
		},
		{
			command: "comments --no-line-wrap src/file.ts",
			comment: "## Disable wrapping of // comments",
		},
	],
	flags: {
		width: {
			description: "Max output line width (default 80)",
			type: "number",
			default: defaultFlags.width,
		},
		dryRun: {
			shortFlag: "D",
			description: "Show diff, don't write files (exit 1 if changes)",
			type: "boolean",
		},
		stdout: {
			description: "Print transformed output of a single file to STDOUT",
			type: "boolean",
		},
		noLineWrap: {
			description: "Disable wrapping of // single-line comments",
			type: "boolean",
		},
		mergeLineComments: {
			description: "Merge consecutive // lines into JSDoc blocks",
			type: "boolean",
			default: defaultFlags.mergeLineComments,
		},
		boring: {
			shortFlag: "b",
			description: "Do not use color output",
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
		files: {
			description: "File paths and/or glob patterns to process",
		},
	},
	restrictions: [
		{
			exit: 1,
			message: "You must provide at least one file path or glob pattern",
			test: (_flags: Flags, parameters: Record<string, string>) =>
				Object.keys(parameters || {}).length === 0,
		},
		{
			exit: 1,
			message: "--stdout can only be used with a single file",
			test: (flags: Flags, parameters: Record<string, string>) =>
				flags.stdout === true &&
				parameters &&
				Object.keys(parameters).length > 1,
		},
	],
	usage: "comments [options] <files...>",
});
/* v8 ignore stop */
