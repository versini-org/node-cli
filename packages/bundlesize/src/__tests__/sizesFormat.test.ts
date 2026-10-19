import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compareStats, readSizes } from "../compareStats.js";
import { getRawStats } from "../getRawStats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixture = (name: string): string =>
	path.join(__dirname, "fixtures/configuration", name);

const originalArgv = process.argv;

afterEach(() => {
	process.argv = originalArgv;
	vi.resetModules();
});

describe("when testing getRawStats with --format sizes", () => {
	it("should report sizes in the shape --type compare reads", async () => {
		const result = await getRawStats({
			flags: { format: "sizes", configuration: fixture("basic.js") },
		});
		expect(result).toEqual({
			data: [
				{
					name: "../data/**/file.txt",
					size: 42,
					sizeLimit: 1536,
					passed: true,
				},
			],
			exitCode: 0,
			exitMessage: "",
			outputFile: "stdout",
			pass: true,
			prefix: "",
		});
	});

	it("should keep the configuration order, skip headers and use aliases", async () => {
		const result = await getRawStats({
			flags: { format: "sizes", configuration: fixture("sizes-multiple.js") },
		});
		expect(result.data).toEqual([
			{ name: "../data/file.txt", size: 42, sizeLimit: 1536, passed: true },
			{ name: "second file", size: 42, sizeLimit: 1, passed: false },
		]);
		expect(result.pass).toBe(false);
		expect(result.exitCode).toBe(1);
	});

	it("should not exit in error over a limit with --silent", async () => {
		const result = await getRawStats({
			flags: {
				format: "sizes",
				silent: true,
				configuration: fixture("basic-do-not-pass.js"),
			},
		});
		expect(result.data).toEqual([
			{ name: "../data/**/file.txt", size: 42, sizeLimit: 1, passed: false },
		]);
		expect(result.pass).toBe(false);
		expect(result.exitCode).toBe(0);
	});

	it("should write a new output instead of skipping an existing prefix", async () => {
		const output = "src/__tests__/fixtures/stats/current.json";
		const result = await getRawStats({
			flags: {
				format: "sizes",
				force: false,
				prefix: "0.0.8",
				output,
				configuration: fixture("basic.js"),
			},
		});
		expect(result.outputFile).toBe(path.resolve(process.cwd(), output));
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("should reject an unknown format", async () => {
		const result = await getRawStats({
			flags: { format: "csv", configuration: fixture("basic.js") },
		});
		expect(result.exitCode).toBe(1);
		expect(result.exitMessage).toBe(
			"Invalid format: csv. Please use 'stats' or 'sizes'",
		);
	});

	it("should reject a limit that cannot be parsed", async () => {
		const result = await getRawStats({
			flags: {
				format: "sizes",
				configuration: fixture("sizes-invalid-limit.js"),
			},
		});
		expect(result.exitCode).toBe(1);
		expect(result.exitMessage).toBe(
			'Invalid limit "lots" for: ../data/file.txt',
		);
	});

	it("should reject two entries with the same name", async () => {
		const result = await getRawStats({
			flags: {
				format: "sizes",
				configuration: fixture("sizes-duplicate-alias.js"),
			},
		});
		expect(result.exitCode).toBe(1);
		expect(result.exitMessage).toBe(
			"Duplicate entry name: same name.\nGive each size its own alias.",
		);
	});

	it("should leave the stats format unchanged by default", async () => {
		const result = await getRawStats({
			flags: { configuration: fixture("sizes-duplicate-alias.js") },
		});
		expect(result.exitCode).toBe(0);
		const stats = result.data as Record<string, Record<string, unknown>>;
		expect(Object.keys(stats["0.0.0"])).toEqual(["same name"]);
	});
});

describe("when feeding --format sizes output to --type compare", () => {
	it("should be read by readSizes and rendered against a baseline", async () => {
		const dir = mkdtempSync(path.join(tmpdir(), "bundlesize-sizes-"));
		try {
			const current = await getRawStats({
				flags: { format: "sizes", configuration: fixture("sizes-multiple.js") },
			});
			const currentFile = path.join(dir, "current.json");
			const baselineFile = path.join(dir, "baseline.json");
			writeFileSync(currentFile, JSON.stringify(current.data));
			writeFileSync(
				baselineFile,
				JSON.stringify([{ name: "second file", size: 20, sizeLimit: 1 }]),
			);

			expect(readSizes(currentFile)).toEqual({
				sizes: current.data,
				error: "",
			});

			const result = compareStats({
				flags: {
					current: currentFile,
					baseline: baselineFile,
					kilo: 1024,
					silent: true,
				},
			});
			expect(result.exitMessage).toBe("");
			expect(result.data).toContain(
				"| ✅ | ../data/file.txt | 42 B | new | 1.5 kB |",
			);
			expect(result.data).toContain(
				"| ❌ | second file | 42 B | ▲ +22 B (+110.00%) | 1 B |",
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("size CLI flags", () => {
	it("maps --format sizes and defaults to stats", async () => {
		process.argv = ["node", "bundlesize", "--format", "sizes"];
		vi.resetModules();
		const sized = await import("../parse.js");
		expect(sized.config.flags?.format).toBe("sizes");

		process.argv = ["node", "bundlesize"];
		vi.resetModules();
		const plain = await import("../parse.js");
		expect(plain.config.flags?.format).toBe("stats");
	});
});
