import { Mock, SpiedFunction, UnknownFunction } from "jest-mock";

import { jest } from "@jest/globals";
import kleur from "kleur";
import { Search } from "../core";
import { defaultFlags } from "../defaults";

kleur.enabled = false;

let mockLog: Mock<UnknownFunction>,
	mockLogError: Mock<UnknownFunction>,
	mockLogWarning: Mock<UnknownFunction>,
	spyExit: SpiedFunction<{
		(code?: number | undefined): never;
		(code?: number | undefined): never;
	}>,
	spyLog: SpiedFunction<{
		(...data: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
	}>,
	spyLogError: SpiedFunction<{
		(...data: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
	}>,
	spyLogWarning: SpiedFunction<{
		(...data: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
		(message?: any, ...optionalParameters: any[]): void;
	}>,
	mockExit: any;

/**
 * Some utilities have logging capabilities that needs to be
 * tested a little bit differently:
 * - mocking process.exit
 * - console.log
 * - inquirer.prompt
 */
describe("when testing for utilities with logging side-effects", () => {
	beforeEach(() => {
		mockExit = jest.fn();
		mockLog = jest.fn();
		mockLogError = jest.fn();
		mockLogWarning = jest.fn();

		spyExit = jest.spyOn(process, "exit").mockImplementation(mockExit);
		spyLog = jest.spyOn(console, "log").mockImplementation(mockLog);
		spyLogError = jest.spyOn(console, "error").mockImplementation(mockLogError);
		spyLogWarning = jest
			.spyOn(console, "warn")
			.mockImplementation(mockLogWarning);
	});
	afterEach(() => {
		spyExit.mockRestore();
		spyLog.mockRestore();
		spyLogError.mockRestore();
		spyLogWarning.mockRestore();
	});

	it("should find and list a specific folder based on the arguments", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "__tests__$",
			short: true,
			stats: false,
			type: "d",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" src/__tests__");
	});

	it("should find and list details for a folder based on the arguments", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "__tests__$",
			short: false,
			stats: false,
			type: "d",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("drwxr-xr-x"));
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("src/__tests__"),
		);
	});

	it("should find and list all folders based on the arguments", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
			type: "d",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("src"));
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("node_modules"),
		);
	});

	it("should find and list a git ignored folder when ignoreGitIgnore is true", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
			type: "d",
			ignoreGitIgnore: true,
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("src"));
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("node_modules"),
		);
	});

	it("should find and list all folders based on the arguments (ignore src)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
			type: "d",
			ignoreFolder: ["src"],
		});
		await search.start();
		expect(mockLog).not.toHaveBeenCalledWith(expect.stringContaining("src"));
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("node_modules"),
		);
	});

	it("should find and list a specific file based on the arguments", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "README.md",
			short: true,
			stats: true,
			type: "f",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" README.md");
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files matching: 1"),
		);
	});

	it("should find and print specific files based on the arguments (md, simple)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: ".md",
			short: true,
			stats: true,
			type: "f",
			printMode: "simple",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("---\n./README.md\n---"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining(
				"A powerful and flexible command line tool for searching files and directories with advanced filtering capabilities",
			),
		);
	});

	it("should find and print a specific file based on the arguments (xml)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "README.md",
			short: true,
			stats: true,
			type: "f",
			printMode: "xml",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("<documents>"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining('<document index="1">'),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("<source>./README.md</source>"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("<document_content>"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("</documents>"),
		);
	});

	it("should find and list all files based on the arguments", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
			type: "f",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("README.md"));
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("CHANGELOG.md"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("package.json"),
		);
	});

	it("should find and list all files based on the arguments including ignoreFile", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
			type: "f",
			ignoreFile: ["README.md"],
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("README.md"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("CHANGELOG.md"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("package.json"),
		);
	});

	it("should find and list all files expect json ones", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
			type: "f",
			ignoreExtension: ["json"],
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("README.md"));
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("CHANGELOG.md"),
		);
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("package.json"),
		);
	});

	it("should find and list all js files expect test ones", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
			type: "f",
			ignoreExtension: ["test.ts"],
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("core.ts"));
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("core.test.js"),
		);
	});

	it("should find and list a hidden file based on the arguments", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			dot: true,
			path: `${process.cwd()}`,
			pattern: "swcrc",
			short: true,
			stats: true,
			type: "f",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" .swcrc");
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
	});

	it("should find and list files while ignoring the case based on the arguments", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			ignoreCase: true,
			path: `${process.cwd()}`,
			pattern: "a",
			short: true,
			stats: true,
			type: "f",
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" README.md");
		expect(mockLog).toHaveBeenCalledWith(" package.json");
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
	});

	it("should find and list all files and directories when there is no patterns or types provided", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			short: true,
			stats: true,
		});
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" README.md");
		expect(mockLog).toHaveBeenCalledWith(" package.json");
		expect(mockLog).toHaveBeenCalledWith(" src");
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Duration: "));
	});

	it("should run a command on the file that matches the pattern", async () => {
		const config = {
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "package.json",
			short: true,
			stats: false,
			command: "grep name",
		};

		const search = new Search(config);
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" package.json");
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("@node-cli/search"),
		);
	});

	it("should run a command on the file that matches the pattern but does not return anything", async () => {
		const config = {
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "package.json",
			short: true,
			stats: false,
			command: "chmod +r",
		};

		const search = new Search(config);
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" package.json");
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("@node-cli/search"),
		);
	});

	it("should grep some text on the file that matches the pattern", async () => {
		const config = {
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "README.md",
			short: true,
			stats: true,
			grep: "^# @node-cli/search",
		};

		const search = new Search(config);
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" README.md (1 occurrence)");
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("# @node-cli/search"),
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files matching: 1"),
		);
	});

	it("should grep some text on the file that matches the pattern", async () => {
		const config = {
			...defaultFlags,
			boring: true,
			ignoreCase: true,
			path: `${process.cwd()}`,
			pattern: "package.json",
			short: true,
			stats: false,
			grep: "type",
		};

		const search = new Search(config);
		await search.start();
		expect(mockLog).toHaveBeenCalledWith(" package.json (5 occurrences)");
	});

	it("should exit in error if the grep pattern is invalid", async () => {
		const config = {
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "package.json",
			short: true,
			stats: false,
			grep: "description [",
		};

		const search = new Search(config);
		await search.start();
		expect(mockLog).not.toHaveBeenCalledWith(" package.json (1 occurrence)");
		expect(mockExit).toHaveBeenCalledWith(1);
	});
});

describe("when testing for utilities with NO logging side-effects", () => {
	it("should find and print specific files based on the arguments (md, simple)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: ".md",
			short: true,
			stats: false,
			type: "f",
			printMode: "simple",
		});
		const res = await search.start(true);
		expect(res).toContain("README.md\n---");
		expect(res).toContain("CHANGELOG.md\n---");
	});

	it("should find and print a specific file based on the arguments (xml)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: "README.md",
			short: true,
			stats: false,
			type: "f",
			printMode: "xml",
		});
		const res = await search.start(true);
		expect(res).toContain("<source>./README.md</source>");
	});

	it("should find and print a minified content of a specific file based on the arguments (xml, cjs)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: ".cjs",
			short: true,
			stats: false,
			type: "f",
			printMode: "xml",
			minifyForLLM: true,
		});
		const res = await search.start(true);
		expect(res).toContain("<source>./jest.config.cjs</source>");
		expect(res).toContain(
			'const commonJest=require("../../configuration/jest.config.common.cjs");module.exports={...commonJest,};',
		);
	});

	it("should find and print a minified content of a specific file based on the arguments (xml, ts)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: ".ts",
			short: true,
			stats: false,
			type: "f",
			printMode: "xml",
			minifyForLLM: true,
		});
		const res = await search.start(true);
		expect(res).toContain("<source>./src/__tests__/core.test.ts</source>");
		expect(res).toContain(
			'import {Mock,SpiedFunction,UnknownFunction} from "jest-mock";import {jest} from "@jest/globals";',
		);
	});

	it("should find and print a NON minified content of a specific file based on the arguments (xml, md)", async () => {
		const search = new Search({
			...defaultFlags,
			boring: true,
			path: `${process.cwd()}`,
			pattern: ".md",
			short: true,
			stats: false,
			type: "f",
			printMode: "xml",
			minifyForLLM: true,
		});
		const res = await search.start(true);
		expect(res).toContain("<source>./CHANGELOG.md</source>");
		expect(res).toContain("# Changelog\n\n");
	});
});
