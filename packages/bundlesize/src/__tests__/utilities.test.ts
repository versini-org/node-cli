import { describe, expect, it } from "vitest";

import {
	addMDrow,
	formatFooter,
	getOutputFile,
	readJSONFile,
} from "../utilities.js";

describe("when testing for utilities", () => {
	it("should return the provided file prefixed with CWD", async () => {
		const result = getOutputFile("file.txt");
		expect(result).toEqual(`${process.cwd()}/file.txt`);
	});

	it("should throw an error if readJsonSync fails", async () => {
		const result = readJSONFile("file.txt");
		expect(result).toEqual({
			exitCode: 1,
			exitMessage:
				"Failed to read JSON file: file.txt: ENOENT: no such file or directory, open 'file.txt'",
		});
	});

	it("should format the footer", async () => {
		const result1 = formatFooter({
			limitReached: false,
			overallDiff: 100,
			totalGzipSize: 200,
		});
		const result2 = formatFooter({
			limitReached: true,
			overallDiff: 100,
			totalGzipSize: 200,
		});
		const result11 = formatFooter({
			limitReached: false,
			overallDiff: -100,
			totalGzipSize: 200,
		});
		const result22 = formatFooter({
			limitReached: true,
			overallDiff: -100,
			totalGzipSize: 200,
		});
		const result3 = formatFooter({
			limitReached: true,
			overallDiff: 0,
			totalGzipSize: 200,
		});
		const result4 = formatFooter({
			limitReached: false,
			overallDiff: 0,
			totalGzipSize: 200,
		});
		const result5 = formatFooter({
			limitReached: false,
			overallDiff: -10,
			totalGzipSize: 0,
		});

		expect(result1).toEqual(
			`Overall bundle size: 200 B (+100 B +100.00%)
Overall status: ✅`,
		);
		expect(result2).toEqual(
			`Overall bundle size: 200 B (+100 B +100.00%)
Overall status: 🚫`,
		);
		expect(result11).toEqual(
			`Overall bundle size: 200 B (-100 B -33.33%)
Overall status: ✅`,
		);
		expect(result22).toEqual(
			`Overall bundle size: 200 B (-100 B -33.33%)
Overall status: 🚫`,
		);
		expect(result3).toEqual(
			`Overall bundle size: 200 B
Overall status: 🚫`,
		);
		expect(result4).toEqual(
			`Overall bundle size: 200 B
Overall status: ✅`,
		);
		expect(result5).toEqual(
			`Overall bundle size: 0 B (-10 B -100.00%)
Overall status: ✅`,
		);
	});

	it("should add a 'passed' row to the markdown table", async () => {
		const result = addMDrow({
			type: "row",
			name: "file.txt",
			size: 666_666,
			limit: "1.5 kB",
			passed: true,
			columns: [
				{ status: "Status" },
				{ file: "File" },
				{ size: "Size" },
				{ limits: "Limits" },
				{ notAValidKey: "Not a valid key" },
			],
		});
		expect(result).toEqual("| ✅ | file.txt | 651.04 KB | 1.5 kB |");
	});

	it("should add a 'failed' row to the markdown table", async () => {
		const result = addMDrow({
			type: "row",
			name: "file.txt",
			size: 666_666,
			limit: "1.5 kB",
			passed: false,
			columns: [
				{ status: "Status" },
				{ file: "File" },
				{ size: "Size" },
				{ limits: "Limits" },
			],
		});
		expect(result).toEqual("| 🚫 | file.txt | 651.04 KB | 1.5 kB |");
	});
});
