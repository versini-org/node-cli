import { fileURLToPath } from "node:url";
import kleur from "kleur";
import path from "node:path";
import { reportStats } from "../utilities.js";

kleur.enabled = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("when testing for reportStats with errors", () => {
	it("should report there is a missing configuration file", async () => {
		expect(true).toBe(true);
		const result = await reportStats({
			flags: { configuration: "" },
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: "Please provide a configuration file",
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report there is an invalid configuration file", async () => {
		const result = await reportStats({
			flags: { configuration: "invalid" },
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: "Invalid or missing configuration file!",
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report that file cannot be found", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/not-found.js",
				),
			},
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: `File not found: ${process.cwd()}/src/__tests__/fixtures/data/file-does-not-exist.txt`,
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report that too many files were found", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/hash-too-many.js",
				),
			},
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: `Multiple files found for: ../data/file-<hash>.txt.\nPlease use a more specific path when using the special keyword <hash>.`,
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report <hash> cannot be used with a single start (*)", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/hash-and-star.js",
				),
			},
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage:
				"Invalid path: ../data/index-<hash>*.js.\nSingle stars (*) are not allowed when using the special keyword <hash>",
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});
});

describe("when testing for reportStats with no errors", () => {
	it("should report basic stats", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(__dirname, "fixtures/configuration/basic.js"),
			},
		});
		expect(result).toEqual({
			data: {
				"0.0.0": {
					"../data/**/file.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1.5 kB",
						passed: true,
					},
					"../data/**/file-2.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1.5 kB",
						passed: true,
					},
					"../data/**/file-3.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1.5 kB",
						passed: true,
					},
				},
			},
			exitCode: 0,
			exitMessage: "",
			outputFile: "stdout",
			pass: true,
			prefix: "0.0.0",
		});
	});

	it("should report basic stats with <hash>", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/with-hash.js",
				),
			},
		});
		expect(result).toEqual({
			data: {
				"0.0.0": {
					"../data/index-<hash>.js": {
						fileSize: 160,
						fileSizeGzip: 139,
						limit: "1.5 kB",
						passed: true,
					},
				},
			},
			exitCode: 0,
			exitMessage: "",
			outputFile: "stdout",
			pass: true,
			prefix: "0.0.0",
		});
	});
});
