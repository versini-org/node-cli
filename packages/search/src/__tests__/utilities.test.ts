import { Mock, UnknownFunction } from "jest-mock";
import {
	STR_TYPE_BOTH,
	STR_TYPE_DIRECTORY,
	STR_TYPE_FILE,
	checkPattern,
	convertDate,
	convertSize,
	extractMode,
	formatLongListings,
	getOwnerNameFromId,
	printStatistics,
	runGrepOnNode,
} from "../utilities.js";

import { jest } from "@jest/globals";
import kleur from "kleur";
import path from "node:path";

kleur.enabled = false;

describe("when testing for individual utilities with no logging side-effects", () => {
	it("should extract the correct mode based on the numerical representation", async () => {
		expect(extractMode(33_188)).toStrictEqual("rw-r--r--");
	});

	it("should convert bytes to human readable strings spanning on 5 characters", async () => {
		expect(convertSize(1)).toStrictEqual("   1B");
		expect(convertSize(1000)).toStrictEqual("   1K");
		expect(convertSize(1000 * 1000)).toStrictEqual("   1M");
		expect(convertSize(1000 * 1000 * 1000)).toStrictEqual("   1G");
		expect(convertSize(1000 * 1000 * 1000 * 1000)).toStrictEqual("   1T");
	});

	it("should convert a timestamp into a human readable string", async () => {
		const someDate = new Date("Jul 4 2020 1:22:00 PST");
		expect(convertDate(someDate)).toStrictEqual("Jul 04  09:22");
	});

	it("should get the owner name based on the id", async () => {
		expect(await getOwnerNameFromId(0)).toStrictEqual("root");
	});

	it("should format file stats into an expected long listing", async () => {
		expect(
			await formatLongListings(
				{
					mode: 33_188,
					mtime: new Date("Jul 4 2020 11:22:00 EST"),
					size: 1024 * 1000,
					uid: 0,
				},
				"f"
			)
		).toStrictEqual(
			expect.objectContaining({
				mode: "-rw-r--r--",
				owner: "root",
				size: "   1M",
			})
		);
	});

	it("should format dir stats into an expected long listing", async () => {
		expect(
			await formatLongListings(
				{
					mode: 33_188,
					mtime: new Date("Jul 4 2020 11:22:00 EST"),
					size: 1024 * 1000,
					uid: 0,
				},
				"d"
			)
		).toStrictEqual(
			expect.objectContaining({
				mode: "drw-r--r--",
				owner: "root",
				size: "   1M",
			})
		);
	});

	it("should return an array with the matched string", async () => {
		const re = /some/;
		const string_ = "this is some string";
		re.lastIndex = 0;
		expect(checkPattern(re, string_)).toStrictEqual(re.exec(string_));
	});

	it("should return true if the pattern is not defined ", async () => {
		const string_ = "this is some string";
		expect(checkPattern(undefined, string_)).toBe(true);
	});

	it("should return one entry matching the pattern for package.json", async () => {
		const file = path.join(process.cwd(), "package.json");
		const rePattern = /author/;
		const { totalMatchingLines } = await runGrepOnNode(file, rePattern);
		expect(totalMatchingLines).toBe(1);
	});

	it("should return no entries matching the pattern for package.json", async () => {
		const file = path.join(process.cwd(), "package.json");
		const rePattern = /toto/;

		const { totalMatchingLines } = await runGrepOnNode(file, rePattern);
		expect(totalMatchingLines).toBe(0);
	});
});

/**
 * Some utilities have logging capabilities that needs to be
 * tested a little bit differently:
 * - mocking process.exit
 * - console.log
 * - inquirer.prompt
 */
let mockLog: Mock<UnknownFunction>,
	mockLogError: Mock<UnknownFunction>,
	mockLogWarning: Mock<UnknownFunction>,
	spyExit: any,
	spyLog: any,
	spyLogError: any,
	spyLogWarning: any,
	mockExit: any;

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

	it("should print statistics for files scans in a nice little box", async () => {
		printStatistics({
			duration: 42,
			pattern: true,
			totalDirScanned: 222,
			totalDirsFound: 111,
			totalFileScanned: 44,
			totalFilesFound: 33,
			type: STR_TYPE_FILE,
		});

		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total folders scanned: 222")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files scanned: 44")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files matching: 33")
		);
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("Total folders matching: 111")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Duration: 42ms")
		);
	});

	it("should print statistics for folders scans in a nice little box", async () => {
		printStatistics({
			duration: 42,
			pattern: true,
			totalDirScanned: 222,
			totalDirsFound: 111,
			totalFileScanned: 44,
			totalFilesFound: 33,
			type: STR_TYPE_DIRECTORY,
		});

		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total folders scanned: 222")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files scanned: 44")
		);
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("Total files matching: 33")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total folders matching: 111")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Duration: 42ms")
		);
	});

	it("should print statistics for files AND folders scans in a nice little box", async () => {
		printStatistics({
			duration: 42,
			pattern: true,
			totalDirScanned: 222,
			totalDirsFound: 111,
			totalFileScanned: 44,
			totalFilesFound: 33,
			type: STR_TYPE_BOTH,
		});

		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total folders scanned: 222")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files scanned: 44")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files matching: 33")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total folders matching: 111")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Duration: 42ms")
		);
	});

	it("should print statistics for files AND folders scans in a nice little box, but with no pattern results", async () => {
		printStatistics({
			duration: 42,
			pattern: false,
			totalDirScanned: 222,
			totalDirsFound: 111,
			totalFileScanned: 44,
			totalFilesFound: 33,
			type: STR_TYPE_BOTH,
		});

		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total folders scanned: 222")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Total files scanned: 44")
		);
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("Total files matching: 33")
		);
		expect(mockLog).not.toHaveBeenCalledWith(
			expect.stringContaining("Total folders matching: 111")
		);
		expect(mockLog).toHaveBeenCalledWith(
			expect.stringContaining("Duration: 42ms")
		);
	});
});
