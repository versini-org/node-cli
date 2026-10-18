import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { compareStats } from "../compareStats.js";
import { getOutputFile } from "../utilities.js";

const originalArgv = process.argv;

afterEach(() => {
	process.argv = originalArgv;
	vi.resetModules();
});

/**
 * Parse argv with the real CLI flag definitions, so a renamed flag in parse.ts
 * breaks this test instead of silently breaking the documented CLI.
 */
const parseFlags = async (argv: string[]) => {
	process.argv = ["node", "bundlesize", ...argv];
	vi.resetModules();
	const { config } = await import("../parse.js");
	return config.flags;
};

describe("compare CLI flags", () => {
	it("maps the documented kebab-case flags into a working compare run", async () => {
		const dir = mkdtempSync(join(tmpdir(), "bundlesize-cli-"));
		try {
			const current = join(dir, "current.json");
			const baseline = join(dir, "baseline.json");
			writeFileSync(current, JSON.stringify([{ name: "a", size: 2000 }]));
			writeFileSync(baseline, JSON.stringify([{ name: "a", size: 1000 }]));
			const flags = await parseFlags([
				"--type",
				"compare",
				"--current",
				current,
				"--baseline",
				baseline,
				"--base-ref",
				"trunk",
				"--base-sha",
				"abc1234",
				"--kilo",
				"1000",
				"--threshold",
				"5",
				"--footer=- see docs",
				"-o",
				join(dir, "out.md"),
			]);
			expect(flags.type).toBe("compare");
			const result = compareStats({ flags });
			expect(result.exitCode).toBe(0);
			expect(result.outputFile).toBe(join(dir, "out.md"));
			expect(result.data).toContain("| vs trunk |");
			expect(result.data).toContain("| ▲ +1 kB (+100.00%) |");
			expect(result.data).toContain("Compared with `trunk` @ `abc1234`.");
			expect(result.data).toContain("- see docs");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("getOutputFile", () => {
	it("keeps an absolute output path as is", () => {
		expect(getOutputFile("/tmp/report.md")).toBe("/tmp/report.md");
	});
});
