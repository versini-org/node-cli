import { defaultFlags } from "./defaults.js";
import { parser } from "@node-cli/parser";

export type Parameters = {
	["0"]?: string;
};
export type Configuration = {
	flags?: any;
	parameters?: Parameters;
	showHelp?: () => void;
};

/* istanbul ignore next */
export const config: Configuration = parser({
	meta: import.meta,
	examples: [
		{
			command: "timer 4h2m15s",
			comment: "## Start a timer for 4 hours, 2 minutes and 15 seconds",
		},
		{
			command: "timer 1m42s",
			comment: "## Start a timer for 1 minute and 42 seconds",
		},
	],
	flags: {
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
		notification: {
			shortFlag: "n",
			default: defaultFlags.notification,
			description: "Display a notification when the timer is done",
			type: "boolean",
		},
		version: {
			shortFlag: "v",
			description: "Output the current version",
			type: "boolean",
		},
	},
	parameters: {
		formattedTime: {
			description: "Formatted time to start the timer",
		},
	},

	usage: "timer [formattedTime]",
});
