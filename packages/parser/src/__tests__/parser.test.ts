import { parser } from "../parser.js";

let processArgv: string[];
const mockProcessName = "my-app";
const parserOptions = {
	examples: [
		{
			command: 'my-cli --type f --pattern=".sh$" --command "chmod +x"',
			comment: '## Find files with the extension ".jsx" in the "src" folder',
		},
		{
			command: 'my-cli --type f --pattern=".sh$" --command "chmod +x"',
			comment:
				'## Change the permissions to executable for all the files with extension ".sh" found under the "bin" folder',
		},
		{
			command: 'my-cli --type f --pattern ".md$" --grep "Table of Content"',
			comment:
				'## Search in all the markdown files under the `src` folder for the keywords "Table of Content"',
		},
	],
	flags: {
		boring: {
			shortFlag: "b",
			default: false,
			description: "Do not use color output",
			type: "boolean",
		},
		command: {
			shortFlag: "c",
			description: "Command to execute over each node (ex: chmod +x)",
			type: "string",
		},
		dot: {
			default: false,
			description: "Show hidden files and directories",
			type: "boolean",
		},
		grep: {
			shortFlag: "g",
			description:
				"A regular expression to match the content of the files found",
			type: "string",
		},
		help: {
			shortFlag: "h",
			description: "Display help instructions",
			type: "boolean",
		},
		ignoreCase: {
			shortFlag: "i",
			default: false,
			description: "Ignore case when searching",
			type: "boolean",
		},
		pattern: {
			shortFlag: "p",
			description: "A regular expression to match file or folder names",
			type: "string",
		},
		short: {
			default: false,
			description: "Short listing format (equivalent to ls)",
			type: "boolean",
		},
		stats: {
			shortFlag: "s",
			default: false,
			description: "Display some statistics",
			type: "boolean",
		},
		type: {
			shortFlag: "t",
			description: "Search for files (f) or directories (d)",
			type: "string",
		},
		version: {
			shortFlag: "v",
			description: "Output the current version",
			type: "boolean",
		},
	},
	parameters: {
		folder: {
			description: "some folder out of nowhere",
		},
		path: {
			default: "current folder",
			description: "the path where to search for files or directories",
		},
	},
	usage: "my-cli [options] <command> [path]",
};

describe("when testing for meowHelpers with no logging side-effects", () => {
	beforeEach(() => {
		processArgv = process.argv;
		process.argv = ["node", mockProcessName];
	});
	afterEach(() => {
		process.argv = processArgv;
	});

	it("should return the right result from parser", async () => {
		const { flags, parameters } = parser(parserOptions);
	});
});
