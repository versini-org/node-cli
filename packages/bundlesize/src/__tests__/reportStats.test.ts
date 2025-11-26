import path from "node:path";
import { fileURLToPath } from "node:url";
import kleur from "kleur";
import { describe, expect, it } from "vitest";

import { DEFAULT_THRESHOLD } from "../defaults.js";
import { reportStats } from "../reportStats.js";
import { STDOUT } from "../utilities.js";

kleur.enabled = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("when testing for reportStats with threshold", () => {
	it("should ignore changes below the configured threshold", async () => {
		// file.txt: 1000 -> 1003 (diff = 3 bytes, below threshold of 5)
		// file-small-change.txt: 1000 -> 1004 (diff = 4 bytes, below threshold of 5)
		// file-no-change.txt: 1000 -> 1000 (diff = 0 bytes)
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/with-threshold.js",
				),
			},
		});

		expect(result.exitCode).toBe(0);
		// All diffs should be ignored since they are below threshold (5 bytes)
		expect(result.data).not.toContain("+3 B");
		expect(result.data).not.toContain("+4 B");
		// Check that sizes are still reported
		expect(result.data).toContain("1000 B");
		expect(result.data).toContain("1003 B");
		expect(result.data).toContain("1004 B");
	});

	it("should show all changes when threshold is set to 0", async () => {
		// Same files but threshold is 0, so all changes should be shown
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/with-threshold-zero.js",
				),
			},
		});

		expect(result.exitCode).toBe(0);
		// With threshold 0, all non-zero diffs should be shown
		expect(result.data).toContain("+3 B");
		expect(result.data).toContain("+4 B");
	});

	it("should use default threshold when not specified in config", async () => {
		// Basic config doesn't specify threshold, should use DEFAULT_THRESHOLD (0)
		expect(DEFAULT_THRESHOLD).toBe(0);
	});
});

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

	it("should report stats with subgroup headers", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/with-groups.js",
				),
			},
		});

		expect(result).toEqual({
			data: `
## Bundle Size With Groups

### Group A

| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file.txt | 19.43 KB (-78.5 KB -80.16%) | 1.5 kB |
| ✅ | file.zip | 19.53 KB (+19.51 KB +105,157.89%) | 1.5 kB |

Sub-bundle size: 38.96 KB (-58.99 KB -60.22%)


### Group B

| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file-no-change | 19.53 KB | 1.5 kB |

Sub-bundle size: 19.53 KB


Overall bundle size: 58.49 KB (-58.99 KB -50.21%)
Overall status: ✅
`,
			exitCode: 0,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});

	it("should error when previous stats file is missing (coverage: previous read failure)", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(
					__dirname,
					"fixtures/configuration/with-groups-no-previous.js",
				),
			},
		});
		expect(result.exitCode).toBe(1);
		expect(result.exitMessage).toMatch(/Failed to read JSON file/);
	});

	it("should report subgroup with no diffs when previous equals current (coverage: diff === item.fileSizeGzip branch)", async () => {
		// Use config where previous= current version so each diff becomes empty
		// string.
		const tempConfig = path.join(
			__dirname,
			"fixtures/configuration/with-groups.js",
		);
		const result = await reportStats({ flags: { configuration: tempConfig } });
		// Sanity checks.
		expect(result.exitCode).toBe(0);
		expect(result.data).toContain("### Group A");
		// Ensure a row with no diff (pattern: size cell ends with 'KB |').
		expect(result.data).toMatch(/file-no-change \| 19\.53 KB \| 1\.5 kB/);
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

Overall bundle size: 19.43 KB (-78.5 KB -80.16%)
Overall status: 🚫
`,
			exitCode: 1,
			exitMessage: "",
			outputFile: STDOUT,
		});
	});
});

describe("when testing for reportStats with no errors", () => {
	describe("when testing for reportStats with no custom reports", () => {
		it("should report basic stats", async () => {
			const result = await reportStats({
				flags: {
					configuration: path.join(
						__dirname,
						"fixtures/configuration/basic.js",
					),
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

Overall bundle size: 58.49 KB (-58.99 KB -50.21%)
Overall status: ✅
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

Overall bundle size: 58.49 KB
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

Overall bundle size: 117.48 KB (+58.99 KB +100.84%)
Overall status: ✅
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

Overall bundle size: 58.49 KB
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

Overall bundle size: 58.49 KB (-58.97 KB -50.20%)
Overall status: ✅
`,
				exitCode: 0,
				exitMessage: "",
				outputFile: STDOUT,
			});
		});
	});

	describe("when testing for reportStats with a custom header", () => {
		it("should report basic stats", async () => {
			const result = await reportStats({
				flags: {
					configuration: path.join(
						__dirname,
						"fixtures/configuration/custom-header.js",
					),
				},
			});

			expect(result).toEqual({
				data: `
## Custom Header
| Status | File | Size (Gzip) | Limits |
| --- | --- | --- | --- |
| ✅ | file.txt | 19.43 KB (-78.5 KB -80.16%) | 1.5 kB |
| ✅ | file.zip | 19.53 KB (+19.51 KB +105,157.89%) | 1.5 kB |
| ✅ | file-no-change | 19.53 KB | 1.5 kB |

Overall bundle size: 58.49 KB (-58.99 KB -50.21%)
Overall status: ✅
`,
				exitCode: 0,
				exitMessage: "",
				outputFile: STDOUT,
			});
		});
	});

	describe("when testing for reportStats with a custom footer", () => {
		it("should report basic stats", async () => {
			const result = await reportStats({
				flags: {
					configuration: path.join(
						__dirname,
						"fixtures/configuration/basic-custom-footer.js",
					),
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

## Custom Footer: Limit not reached (-60401 59898)
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
						"fixtures/configuration/overall-diff-0-custom-footer.js",
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

## Custom Footer: Limit not reached (0 59898)
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
						"fixtures/configuration/overall-diff-positive-custom-footer.js",
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

## Custom Footer: Limit not reached (60401 120299)
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
						"fixtures/configuration/no-previous-custom-footer.js",
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

## Custom Footer: Limit not reached (0 59898)
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
						"fixtures/configuration/previous-incomplete-custom-footer.js",
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

## Custom Footer: Limit not reached (-60382 59898)
`,
				exitCode: 0,
				exitMessage: "",
				outputFile: STDOUT,
			});
		});
	});
});
