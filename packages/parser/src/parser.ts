import { fastMerge } from "@node-cli/utilities";
import meow from "meow";
import { meowOptionsHelper, meowParserHelper } from "./utilities.js";

type Flags = {
	[key: string]: {
		shortFlag?: string;
		default?: string | number | boolean;
		description: string;
		type: string;
		isMultiple?: boolean;
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
	test: (flags: any, parameters: any) => boolean;
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
		flags: fastMerge(defaultFlags, cli.flags),
		parameters: fastMerge(defaultParameters, cli.input),
	};
};
