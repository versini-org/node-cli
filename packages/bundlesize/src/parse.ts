/* istanbul ignore file */
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
	type?: "size" | "report" | "compare";
	force?: boolean;
	current?: string;
	baseline?: string;
	header?: string;
	baseRef?: string;
	baseSha?: string;
	footer?: string;
	kilo?: number;
	threshold?: number;
};

export type Configuration = {
	flags?: Flags;
	usage?: boolean;
	showHelp?: () => void;
};

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
			description: "Specify the type of output: size, report or compare",
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
		current: {
			description: "compare: sizes JSON measured by this run",
			type: "string",
		},
		baseline: {
			description: "compare: sizes JSON measured on the base branch",
			type: "string",
		},
		header: {
			description: "compare: markdown heading above the table",
			type: "string",
		},
		baseRef: {
			description: "compare: branch the baseline was measured on",
			type: "string",
		},
		baseSha: {
			description: "compare: commit the baseline was measured on",
			type: "string",
		},
		footer: {
			description: "compare: markdown appended after the table",
			type: "string",
		},
		kilo: {
			description: "compare: bytes per kB, 1000 or 1024",
			type: "number",
		},
		threshold: {
			description: "compare: changes under this many bytes count as none",
			type: "number",
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
