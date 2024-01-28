import { IGNORE } from "../utilities.js";
import { fileURLToPath } from "node:url";
import { getRawStats } from "../getRawStats.js";
import kleur from "kleur";
import path from "node:path";

kleur.enabled = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("when testing for getRawStats with errors", () => {
	it("should report there is a missing configuration file", async () => {
		expect(true).toBe(true);
		const result = await getRawStats({
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
		const result = await getRawStats({
			flags: { configuration: "invalid" },
		});

		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: `Invalid or missing configuration file!\n${process.cwd()}/invalid`,
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report that file cannot be found", async () => {
		const result = await getRawStats({
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
			exitMessage: `File not found: /tmp/data/file-does-not-exist.txt`,
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report that too many files were found", async () => {
		const result = await getRawStats({
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
		const result = await getRawStats({
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

	it("should report <semver> cannot be used with a single start (*)", async () => {
		const result = await getRawStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/semver-and-star.js",
				),
			},
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage:
				"Invalid path: ../data/index-<semver>*.js.\nSingle stars (*) are not allowed when using the special keyword <semver>",
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report <hash> and <semver> cannot be used together", async () => {
		const result = await getRawStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/hash-and-semver.js",
				),
			},
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage:
				"Invalid path: ../data/index-<hash>-<semver>.js.\nCannot use <hash> and <semver> in the same path.",
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report there is a configuration file missing sizes entry", async () => {
		const result = await getRawStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/no-sizes.js",
				),
			},
		});

		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: `Invalid configuration file: missing sizes object!`,
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});
});

describe("when testing for getRawStats with no errors", () => {
	it("should report basic stats", async () => {
		const result = await getRawStats({
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

	it("should report basic stats that overall do not pass", async () => {
		const result = await getRawStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/basic-do-not-pass.js",
				),
			},
		});
		expect(result).toEqual({
			data: {
				"0.0.0": {
					"../data/**/file.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1 B",
						passed: false,
					},
					"../data/**/file-2.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1 B",
						passed: false,
					},
					"../data/**/file-3.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1 B",
						passed: false,
					},
				},
			},
			exitCode: 1,
			exitMessage: "",
			outputFile: "stdout",
			pass: false,
			prefix: "0.0.0",
		});
	});

	it("should report stats that overall do not pass but no exit error", async () => {
		const result = await getRawStats({
			flags: {
				silent: true,
				configuration: path.join(
					__dirname,
					"fixtures/configuration/basic-do-not-pass.js",
				),
			},
		});
		expect(result).toEqual({
			data: {
				"0.0.0": {
					"../data/**/file.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1 B",
						passed: false,
					},
					"../data/**/file-2.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1 B",
						passed: false,
					},
					"../data/**/file-3.txt": {
						fileSize: 22,
						fileSizeGzip: 42,
						limit: "1 B",
						passed: false,
					},
				},
			},
			exitCode: 0,
			exitMessage: "",
			outputFile: "stdout",
			pass: false,
			prefix: "0.0.0",
		});
	});

	it("should report basic stats with <hash>", async () => {
		const result = await getRawStats({
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

	it("should report basic stats with <semver>", async () => {
		const result = await getRawStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/with-semver.js",
				),
			},
		});
		expect(result).toEqual({
			data: {
				"0.0.0": {
					"../data/react-<semver>.js": {
						fileSize: 47,
						fileSizeGzip: 64,
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

	it("should report report existing stats", async () => {
		const result = await getRawStats({
			flags: {
				force: false,
				prefix: "0.0.8",
				output: "src/__tests__/fixtures/stats/current.json",
				configuration: path.join(__dirname, "fixtures/configuration/basic.js"),
			},
		});
		expect(result.outputFile).toBe(IGNORE);
	});
});
