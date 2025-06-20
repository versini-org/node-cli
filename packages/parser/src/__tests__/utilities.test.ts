import { meowOptionsHelper, meowParserHelper } from "../utilities.js";

import kleur from "kleur";
import { vi } from "vitest";

kleur.enabled = false;

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

	it("should return the right helpText and valid options for meow", async () => {
		const { helpText, options } = meowOptionsHelper(parserOptions);
		expect(options).toStrictEqual({
			allowUnknownFlags: false,
			autoHelp: false,
			autoVersion: false,
			description: false,
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
		});
		expect(helpText).toEqual(expect.stringContaining("  Usage:"));
		expect(helpText).toEqual(
			expect.stringContaining("> my-cli [options] <command> [path]"),
		);
		expect(helpText).toEqual(
			expect.stringContaining(
				"  -b, --boring      Do not use color output                                       (default: false)",
			),
		);
		expect(helpText).toEqual(
			expect.stringContaining(
				"  -c, --command     Command to execute over each node (ex: chmod +x)",
			),
		);
		expect(helpText).toEqual(
			expect.stringContaining("  Folder:  some folder out of nowhere"),
		);
		expect(helpText).toEqual(
			expect.stringContaining(
				"  Path:    the path where to search for files or directories  (default: current folder)",
			),
		);
		expect(helpText).toEqual(expect.stringContaining("  Examples:"));
		expect(helpText).toEqual(
			expect.stringContaining(
				'   ## Find files with the extension ".jsx" in the "src" folder',
			),
		);
		expect(helpText).toEqual(
			expect.stringContaining(
				'   > my-cli --type f --pattern=".sh$" --command "chmod +x"',
			),
		);
	});

	it("should return the right helpText for meow with no usage", async () => {
		const { helpText } = meowOptionsHelper({});
		expect(helpText).not.toEqual(expect.stringContaining("Usage:"));
	});

	it("should return the right helpText for meow with usage but no optional params", async () => {
		const { helpText } = meowOptionsHelper({
			usage: "my-cli <command>",
		});
		expect(helpText).toEqual(expect.stringContaining("Usage:"));
		expect(helpText).toEqual(expect.stringContaining("> my-cli <command>"));
	});

	it("should return the right helpText for meow with usage but no required params", async () => {
		const { helpText } = meowOptionsHelper({
			usage: "my-cli [options]",
		});
		expect(helpText).toEqual(expect.stringContaining("Usage:"));
		expect(helpText).toEqual(expect.stringContaining("> my-cli [options]"));
	});

	it("should return the right helpText for meow with auto-usage, no options and no params", async () => {
		const { helpText } = meowOptionsHelper({
			usage: true,
		});
		expect(helpText).toEqual(expect.stringContaining("Usage:"));
		expect(helpText).toEqual(expect.stringContaining(`> ${mockProcessName}`));
		expect(helpText).not.toEqual(expect.stringContaining("[options]"));
	});

	it("should return the right helpText for meow with auto-usage, with options and no params", async () => {
		const { helpText } = meowOptionsHelper({
			flags: {
				help: true,
			},
			usage: true,
		});
		expect(helpText).toEqual(expect.stringContaining("Usage:"));
		expect(helpText).toEqual(
			expect.stringContaining(`> ${mockProcessName} [options]`),
		);
		expect(helpText).not.toEqual(expect.stringContaining("[path]"));
	});

	it("should return the right helpText for meow with auto-usage, with params and no options", async () => {
		const { helpText } = meowOptionsHelper({
			parameters: {
				path: {
					description: "some description",
				},
			},
			usage: true,
		});
		expect(helpText).toEqual(expect.stringContaining("Usage:"));
		expect(helpText).toEqual(
			expect.stringContaining(`> ${mockProcessName} [path]`),
		);
		expect(helpText).not.toEqual(expect.stringContaining("[options]"));
	});

	it("should return the right helpText for meow with auto-usage, with options and params", async () => {
		const { helpText } = meowOptionsHelper({
			flags: {
				help: true,
			},
			parameters: {
				pathOne: {
					description: "some description",
				},
				pathTwo: {
					description: "some other description",
				},
			},
			usage: true,
		});
		expect(helpText).toEqual(expect.stringContaining("Usage:"));
		expect(helpText).toEqual(
			expect.stringContaining(
				`> ${mockProcessName} [options] [pathOne] [pathTwo]`,
			),
		);
	});
});

/**
 * Some utilities have logging capabilities that needs to be
 * tested a little bit differently:
 * - mocking process.exit
 * - console.log
 * - inquirer.prompt
 */
let mockLog:
		| ReturnType<typeof vi.fn>
		| ((message?: any, ...optionalParameters: any[]) => void)
		| undefined,
	mockLogError:
		| ReturnType<typeof vi.fn>
		| ((message?: any, ...optionalParameters: any[]) => void)
		| undefined,
	mockLogWarning:
		| ReturnType<typeof vi.fn>
		| ((message?: any, ...optionalParameters: any[]) => void)
		| undefined,
	spyExit: any,
	spyLog: any,
	spyLogError: any,
	spyLogWarning: any,
	mockExit:
		| ReturnType<typeof vi.fn>
		| ((code?: string | number | null | undefined) => never)
		| undefined;
describe("when testing for utilities with logging side-effects", () => {
	beforeEach(() => {
		mockExit = () => {
			return undefined as never;
		};
		mockLog = vi.fn();
		mockLogError = vi.fn();
		mockLogWarning = vi.fn();

		spyExit = vi.spyOn(process, "exit").mockImplementation(mockExit);
		spyLog = vi.spyOn(console, "log").mockImplementation(mockLog);
		spyLogError = vi.spyOn(console, "error").mockImplementation(mockLogError);
		spyLogWarning = vi
			.spyOn(console, "warn")
			.mockImplementation(mockLogWarning);
	});
	afterEach(() => {
		spyExit.mockRestore();
		spyLog.mockRestore();
		spyLogError.mockRestore();
		spyLogWarning.mockRestore();
	});

	it("should display the proper help message and exit with 0", async () => {
		meowParserHelper({
			cli: {
				flags: {
					help: true,
				},
				// eslint-disable-next-line no-console
				showHelp: () => console.log("showing help"),
			},
			restrictions: [],
		});
		expect(mockLog).toHaveBeenCalledWith("showing help");
		expect(spyExit).toHaveBeenCalledWith(0);
	});

	it("should display the proper version and exit with 0", async () => {
		meowParserHelper({
			cli: {
				flags: {
					version: true,
				},
				// eslint-disable-next-line no-console
				showVersion: () => console.log("6.6.6"),
			},
			restrictions: [],
		});
		expect(mockLog).toHaveBeenCalledWith("6.6.6");
		expect(spyExit).toHaveBeenCalledWith(0);
	});

	it("should display the error message and exit with 666", async () => {
		meowParserHelper({
			cli: {
				flags: {
					type: "s",
				},
			},
			restrictions: [
				{
					exit: 666,
					message: (flag: { type: any }) =>
						`Error: option '${flag.type}' is invalid`,
					test: (flag: { type: string }) => flag.type !== "d",
				},
			],
		});
		expect(mockLogError).toHaveBeenCalledWith("Error: option 's' is invalid");
		// eslint-disable-next-line no-magic-numbers
		expect(spyExit).toHaveBeenCalledWith(666);
	});

	it("should display the simple error message and exit with 666", async () => {
		meowParserHelper({
			cli: {
				flags: {
					type: "s",
				},
			},
			restrictions: [
				{
					exit: 666,
					message: "Error: option is invalid",
					test: (flag: { type: string }) => flag.type !== "d",
				},
			],
		});
		expect(mockLogError).toHaveBeenCalledWith("Error: option is invalid");
		// eslint-disable-next-line no-magic-numbers
		expect(spyExit).toHaveBeenCalledWith(666);
	});

	it("should NOT display the error message and should not exit with 666", async () => {
		meowParserHelper({
			cli: {
				flags: {
					type: "d",
				},
			},
			restrictions: [
				{
					exit: 666,
					message: (flag: { type: any }) =>
						`Error: option '${flag.type}' is invalid`,
					test: (flag: { type: string }) => flag.type !== "d",
				},
			],
		});
		expect(mockLogError).not.toHaveBeenCalled();
		// eslint-disable-next-line no-magic-numbers
		expect(spyExit).not.toHaveBeenCalled();
	});
});
