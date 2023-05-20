import {
	meowOptionsHelper,
	meowParserHelper,
	shallowMerge,
} from "./utilities.js";

import meow from "meow";

export type ParserConfiguration = {
	flags?: any;
	parameters?: any;
	usage?: boolean | string;
	examples?:
		| string
		| { command?: string; description?: string; comment?: string }[];
	defaultFlags?: any;
	defaultParameters?: any;
};

export const parser = (configuration: ParserConfiguration) => {
	const {
		defaultFlags = {},
		defaultParameters = {},
		...others
	} = configuration;
	const { helpText, options } = meowOptionsHelper(others);
	const cli = meow(helpText, { ...options, importMeta: import.meta });
	meowParserHelper({ cli });

	return {
		flags: shallowMerge(defaultFlags, cli.flags),
		parameters: shallowMerge(defaultParameters, cli.input),
	};
};
