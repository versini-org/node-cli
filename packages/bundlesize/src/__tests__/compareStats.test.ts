import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { compareStats } from "../compareStats.js";
import { STDOUT } from "../utilities.js";

let dir: string;
const write = (name: string, content: unknown) => {
	const file = join(dir, name);
	writeFileSync(
		file,
		typeof content === "string" ? content : JSON.stringify(content),
	);
	return file;
};

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "bundlesize-compare-"));
});

describe("compareStats", () => {
	it("compares size-limit JSON against a baseline file", () => {
		const current = write("current.json", [
			{ name: "first-paint", passed: true, size: 2048, sizeLimit: 4096 },
		]);
		const baseline = write("baseline.json", [
			{ name: "first-paint", size: 1024 },
		]);
		const result = compareStats({
			flags: { current, baseline, baseSha: "abc1234" },
		});
		expect(result.exitCode).toBe(0);
		expect(result.exitMessage).toBe("");
		expect(result.outputFile).toBe(STDOUT);
		expect(result.data).toContain("| ▲ +1 kB (+100.00%) |");
		expect(result.data).toContain("Compared with `main` @ `abc1234`.");
	});

	it("renders the no-baseline note when the baseline file is missing", () => {
		const current = write("current.json", [{ name: "a", size: 1 }]);
		const result = compareStats({
			flags: { current, baseline: join(dir, "missing.json") },
		});
		expect(result.exitCode).toBe(0);
		expect(result.data).toContain("No baseline found");
	});

	it("passes header, footer, base ref, kilo and threshold through", () => {
		const current = write("current.json", [
			{ name: "a", size: 1010, sizeLimit: 2000 },
		]);
		const baseline = write("baseline.json", [{ name: "a", size: 1000 }]);
		const result = compareStats({
			flags: {
				current,
				baseline,
				header: "### Custom",
				footer: "done",
				baseRef: "trunk",
				kilo: 1000,
				threshold: 20,
			},
		});
		expect(result.data).toContain("### Custom");
		expect(result.data).toContain("| vs trunk |");
		expect(result.data).toContain("| 1.01 kB | = no change | 2 kB |");
		expect(result.data).toContain("done\n");
	});

	it("exits 1 when over the limit unless silent", () => {
		const current = write("current.json", [
			{ name: "a", size: 11, sizeLimit: 10 },
		]);
		expect(compareStats({ flags: { current } }).exitCode).toBe(1);
		expect(compareStats({ flags: { current, silent: true } }).exitCode).toBe(0);
	});

	it("resolves the output file", () => {
		const current = write("current.json", [{ name: "a", size: 1 }]);
		const result = compareStats({ flags: { current, output: "tmp/out.md" } });
		expect(result.outputFile).toBe(join(process.cwd(), "tmp/out.md"));
	});

	it("requires --current", () => {
		const result = compareStats({ flags: {} });
		expect(result.exitCode).toBe(1);
		expect(result.exitMessage).toContain("--current");
	});

	it("rejects a kilo other than 1000 or 1024", () => {
		const current = write("current.json", [{ name: "a", size: 1 }]);
		const result = compareStats({ flags: { current, kilo: 1001 } });
		expect(result.exitCode).toBe(1);
		expect(result.exitMessage).toBe("--kilo must be 1000 or 1024");
	});

	it("reports unreadable and malformed files", () => {
		const current = write("current.json", [{ name: "a", size: 1 }]);
		expect(
			compareStats({ flags: { current: join(dir, "nope.json") } }).exitMessage,
		).toContain("Failed to read JSON file");
		expect(
			compareStats({ flags: { current: write("bad.json", "{oops") } })
				.exitMessage,
		).toContain("Failed to read JSON file");
		// size-limit --json prints an object, not an array, when it errors.
		expect(
			compareStats({
				flags: { current: write("error.json", { error: "boom" }) },
			}).exitMessage,
		).toContain("expected an array");
		expect(
			compareStats({
				flags: {
					current,
					baseline: write("wrong.json", [{ name: "a", size: "1" }]),
				},
			}).exitMessage,
		).toContain("Invalid sizes file");
		expect(
			compareStats({
				flags: { current: write("nulls.json", [null]) },
			}).exitMessage,
		).toContain("Invalid sizes file");
		expect(
			compareStats({
				flags: {
					current: write("types.json", [
						{ name: "a", size: 1, sizeLimit: "10", passed: "yes" },
					]),
				},
			}).exitMessage,
		).toContain("Invalid sizes file");
	});
});
