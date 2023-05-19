import {
	meowOptionsHelper,
	meowParserHelper,
	shallowMerge,
} from "./utilities.js";

import meow from "meow";

export type Configuration = {
	flags?: any;
	parameters?: any;
	usage?: boolean | string;
	examples?:
		| string
		| { command?: string; description?: string; comment?: string }[];
};

export const parser = (
	configuration: Configuration,
	defaultFlags?: any,
	defaultsParameters?: any
) => {
	const { helpText, options } = meowOptionsHelper(configuration);
	const cli = meow(helpText, { ...options, importMeta: import.meta });
	meowParserHelper({ cli });

	return {
		flags: shallowMerge(defaultFlags, cli.flags),
		parameters: shallowMerge(defaultsParameters, cli.input),
	};
};
