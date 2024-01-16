import { defaultFlags } from "./defaults.js";
import { parser } from "@node-cli/parser";

export type Flags = {
	boring?: boolean;
	help?: boolean;
	version?: boolean;
	configuration?: string;
	output?: string;
	outputName?: string;
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
		outputName: {
			shortFlag: "n",
			description: "Specify the output name to use in the output file",
			type: "string",
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
