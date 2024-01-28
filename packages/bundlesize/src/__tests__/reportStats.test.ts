import { STDOUT } from "../utilities.js";
import { fileURLToPath } from "node:url";
import kleur from "kleur";
import path from "node:path";
import { reportStats } from "../reportStats.js";

kleur.enabled = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("when testing for reportStats with errors", () => {
	it("should report there is a missing configuration file", async () => {
		const result = await reportStats({
			flags: { configuration: "" },
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: "Please provide a configuration file",
			outputFile: "",
		});
	});

	it("should report there is an invalid configuration file", async () => {
		const result = await reportStats({
			flags: { configuration: "invalid" },
		});

		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: `Invalid or missing configuration file!\n${process.cwd()}/invalid`,
			outputFile: "",
		});
	});

	it("should report there is an invalid current stat file", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/invalid-current.js",
				),
			},
		});

		const errorFile = path.join(
			__dirname,
			"fixtures/configuration/file-does-not-exist.json",
		);
		expect(result).toEqual({
			data: "",
			exitCode: 1,
			exitMessage: `Failed to read JSON file: ${errorFile}: ENOENT: no such file or directory, open '${errorFile}'`,
			outputFile: STDOUT,
		});
	});

	it("should report there is an invalid previous stat file", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/invalid-previous.js",
				),
			},
		});

		const errorFile = path.join(
			__dirname,
			"fixtures/configuration/file-does-not-exist.json",
		);
		expect(result).toEqual({
			data: "",
			exitCode: 1,
			exitMessage: `Failed to read JSON file: ${errorFile}: ENOENT: no such file or directory, open '${errorFile}'`,
			outputFile: STDOUT,
		});
	});

	it("should report stats with one non-passing result", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/with-fail.js",
				),
			},
		});

		expect(result).toEqual({
			data: `
## Bundle Size
| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| 🚫 | file.txt | 19.43 KB (-78.5 KB -80.16%) | 1.5 kB |

Overall status: 🚫 (-78.5 KB)
`,
			exitCode: 1,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});
});

describe("when testing for compareStats with no errors", () => {
	it("should report basic stats", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(__dirname, "fixtures/configuration/basic.js"),
			},
		});

		expect(result).toEqual({
			data: `
## Bundle Size
| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file.txt | 19.43 KB (-78.5 KB -80.16%) | 1.5 kB |
| ✅ | file.zip | 19.53 KB (+19.51 KB +105,157.89%) | 1.5 kB |
| ✅ | file-no-change | 19.53 KB | 1.5 kB |

Overall status: ✅ (-58.99 KB)
`,
			exitCode: 0,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});

	it("should report stats where overall diff is 0", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/overall-diff-0.js",
				),
			},
		});

		expect(result).toEqual({
			data: `
## Bundle Size
| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file.txt | 19.43 KB | 1.5 kB |
| ✅ | file.zip | 19.53 KB | 1.5 kB |
| ✅ | file-no-change | 19.53 KB | 1.5 kB |

Overall status: ✅
`,
			exitCode: 0,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});

	it("should report stats where overall diff is > 0", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/overall-diff-positive.js",
				),
			},
		});

		expect(result).toEqual({
			data: `
## Bundle Size
| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file.txt | 97.93 KB (+78.5 KB +403.92%) | 1.5 kB |
| ✅ | file.zip | 19 B (-19.51 KB -99.90%) | 1.5 kB |
| ✅ | file-no-change | 19.53 KB | 1.5 kB |

Overall status: ✅ (+58.99 KB)
`,
			exitCode: 0,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});

	it("should report stats even if there are no previous stats", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/no-previous.js",
				),
			},
		});

		expect(result).toEqual({
			data: `
## Bundle Size
| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file.txt | 19.43 KB | 1.5 kB |
| ✅ | file.zip | 19.53 KB | 1.5 kB |
| ✅ | file-no-change | 19.53 KB | 1.5 kB |

Overall status: ✅
`,
			exitCode: 0,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});

	it("should report stats even if previous stats are incomplete", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/previous-incomplete.js",
				),
			},
		});

		expect(result).toEqual({
			data: `
## Bundle Size
| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file.txt | 19.43 KB (-78.5 KB -80.16%) | 1.5 kB |
| ✅ | file.zip | 19.53 KB | 1.5 kB |
| ✅ | file-no-change | 19.53 KB | 1.5 kB |

Overall status: ✅ (-58.97 KB)
`,
			exitCode: 0,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});
});
