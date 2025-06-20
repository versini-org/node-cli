/* v8 ignore start */
import { parser } from "@node-cli/parser";
import { defaultFlags } from "./defaults.js";

export type Parameters = {
	["0"]?: string;
};
export type Flags = {
	verbose?: boolean;
	delete?: boolean;
	create?: boolean;
	list?: boolean;
	update?: boolean;
	boring?: boolean;
	help?: boolean;
	version?: boolean;
};
export type Configuration = {
	flags?: Flags;
	parameters?: Parameters;
	showHelp?: () => void;
};

/* v8 ignore next 80 */
export const config: Configuration = parser({
	meta: import.meta,
	examples: [
		{
			command: "npmrc -l",
			comment: "## List existing profiles",
		},
		{
			command: "npmrc -c [name]",
			comment: "## Create a profile",
		},
		{
			command: "npmrc [name]",
			comment: "## Switch to an existing profile",
		},
		{
			command: "npmrc -d [name]",
			comment: "## Delete an existing profile",
		},
	],
	flags: {
		verbose: {
			shortFlag: "V",
			description: "Output debugging information",
			type: "boolean",
		},
		delete: {
			shortFlag: "d",
			description: "Delete a profile",
			type: "boolean",
		},
		create: {
			shortFlag: "c",
			description: "Create a new profile",
			type: "boolean",
		},
		list: {
			shortFlag: "l",
			description: "List all profiles",
			type: "boolean",
		},
		update: {
			shortFlag: "u",
			description: "Update the current profile",
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
	parameters: {
		profile: {
			description: "profile name",
		},
	},
	restrictions: [
		{
			exit: 1,
			message: "To create a profile, you must provide a profile name",
			test: (flags?: Flags, parameters?: Parameters) => {
				return flags.create && (!parameters || !parameters["0"]);
			},
		},
	],
	usage: "npmrc [options] [profile]",
});
/* v8 ignore stop */
