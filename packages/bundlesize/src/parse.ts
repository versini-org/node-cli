import { parser } from "@node-cli/parser";
import { defaultFlags } from "./defaults.js";

export type Flags = {
	boring?: boolean;
	help?: boolean;
	version?: boolean;
	configuration?: string;
	output?: string;
	prefix?: string;
	silent?: boolean;
	type?: "size" | "report";
	force?: boolean;
};

export type Configuration = {
	flags?: Flags;
	usage?: boolean;
	showHelp?: () => void;
};

/* istanbul ignore next */
export const config: Configuration = parser({
	meta: import.meta,
	examples: [],
	flags: {
		force: {
			shortFlag: "f",
			description: "Overwrite existing results",
			type: "boolean",
			default: defaultFlags.force,
		},
		type: {
			shortFlag: "t",
			description: "Specify the type of output: size or report",
			type: "string",
			default: defaultFlags.type,
		},
		configuration: {
			shortFlag: "c",
			description: "Specify a configuration file",
			type: "string",
		},
		output: {
			shortFlag: "o",
			description: "Specify the output file",
			type: "string",
		},
		prefix: {
			shortFlag: "p",
			description: "Specify a prefix to use in the output file",
			type: "string",
		},
		silent: {
			shortFlag: "s",
			default: defaultFlags.silent,
			description: "Do not exit in error when a limit is exceeded",
			type: "boolean",
		},
		boring: {
			shortFlag: "b",
			default: defaultFlags.boring,
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
	usage: true,
	defaultFlags,
});
