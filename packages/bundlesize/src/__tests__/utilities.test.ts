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
		const result1 = formatFooter(false, 100);
		const result2 = formatFooter(true, 100);
		const result3 = formatFooter(false, "100");
		const result4 = formatFooter(true, "100");

		expect(result1).toEqual("Overall status: ✅ 100");
		expect(result2).toEqual("Overall status: 🚫 100");
		expect(result3).toEqual("Overall status: ✅ 100");
		expect(result4).toEqual("Overall status: 🚫 100");
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
