import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// The package's "." export, so this also locks the public surface.
import { readSizes } from "../config.js";

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
	dir = mkdtempSync(join(tmpdir(), "bundlesize-read-sizes-"));
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe("readSizes", () => {
	it("is exported from the package entry", () => {
		expect(typeof readSizes).toBe("function");
	});

	it("returns the entries of a valid sizes file", () => {
		const sizes = [
			{ name: "first-paint", passed: true, size: 2048, sizeLimit: 4096 },
			{ name: "lazy", size: 0 },
		];
		expect(readSizes(write("sizes.json", sizes))).toEqual({
			sizes,
			error: "",
		});
	});

	it("reports a file that cannot be read", () => {
		const result = readSizes(join(dir, "missing.json"));
		expect(result.sizes).toEqual([]);
		expect(result.error).toMatch(/^Failed to read JSON file: /);
	});

	it("surfaces the error size-limit prints when its own run fails", () => {
		const file = write("sizes.json", { error: "Cannot find dist/main.js" });
		expect(readSizes(file)).toEqual({
			sizes: [],
			error: `Sizes file ${file} reports an error: Cannot find dist/main.js`,
		});
	});

	it.each([
		["a non-array", { name: "a", size: 1 }],
		["a missing name", [{ size: 1 }]],
		["a negative size", [{ name: "a", size: -1 }]],
		["a non-numeric limit", [{ name: "a", size: 1, sizeLimit: "1 kB" }]],
		["a non-boolean passed", [{ name: "a", size: 1, passed: "yes" }]],
	])("rejects %s", (_label, content) => {
		const result = readSizes(write("sizes.json", content));
		expect(result.sizes).toEqual([]);
		expect(result.error).toMatch(/^Invalid sizes file /);
	});

	it("rejects duplicate entry names", () => {
		const file = write("sizes.json", [
			{ name: "a", size: 1 },
			{ name: "a", size: 2 },
		]);
		const result = readSizes(file);
		expect(result.sizes).toEqual([]);
		expect(result.error).toContain('Duplicate entry name "a"');
	});
});
