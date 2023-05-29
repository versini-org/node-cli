import {
	meowOptionsHelper,
	meowParserHelper,
	shallowMerge,
} from "./utilities.js";

import meow from "meow";

type Flags = {
	[key: string]: {
		shortFlag?: string;
		default?: string | number | boolean;
		description: string;
		type: string;
	};
};
type Parameters = {
	[key: string]: {
		default?: string | number | boolean;
		description: string;
	};
};
type Restriction = {
	exit: number;
	message: string | (() => void);
	test: (value: any) => boolean;
};

export type ParserConfiguration = {
	meta: any;
	flags?: Flags;
	parameters?: Parameters;
	usage?: boolean | string;
	examples?:
		| string
		| { command?: string; description?: string; comment?: string }[];
	defaultFlags?: any;
	defaultParameters?: any;
	restrictions?: Restriction[];
};

export const parser = (configuration: ParserConfiguration) => {
	const {
		meta,
		defaultFlags = {},
		defaultParameters = {},
		restrictions,
		...others
	} = configuration;
	const { helpText, options } = meowOptionsHelper(others);
	const cli = meow(helpText, {
		...options,
		importMeta: meta,
	});
	meowParserHelper({ cli, restrictions });

	return {
		showHelp: cli.showHelp,
		flags: shallowMerge(defaultFlags, cli.flags),
		parameters: shallowMerge(defaultParameters, cli.input),
	};
};
