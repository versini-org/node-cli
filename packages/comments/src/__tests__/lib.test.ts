import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { augmentPatterns, expandGlobs } from "../glob.js";
import { diffLines, parseAndTransformComments } from "../lib.js";

const baseOpts = {
	width: 60,
	wrapLineComments: true,
	mergeLineComments: false,
};

describe("parseAndTransformComments", () => {
	it("reflows a simple jsdoc and adds period", () => {
		const input = "/**\n * This function does something\n * important\n */";
		const res = parseAndTransformComments(input, baseOpts);
		expect(res.transformed).toContain("does something important.");
	});

	it("normalizes NOTE capitalization", () => {
		const input = "/**\n * note: edge case\n */";
		const res = parseAndTransformComments(input, baseOpts);
		expect(/NOTE: edge case/.test(res.transformed)).toBe(true);
	});

	it("wraps single line comments", () => {
		const input =
			"// this is a very long comment that should be wrapped across multiple lines to satisfy width";
		const res = parseAndTransformComments(input, baseOpts);
		expect(res.transformed.split(/\n/).length).toBeGreaterThan(1);
	});

	it("merges groups of line comments into jsdoc", () => {
		const input = [
			"// first line",
			"// second line",
			"// third line",
			"const x = 1;",
		].join("\n");
		const res = parseAndTransformComments(input, {
			...baseOpts,
			mergeLineComments: true,
		});
		expect(/\/\*\*/.test(res.transformed)).toBe(true);
	});

	it("is idempotent (second pass unchanged)", () => {
		const input = "/**\n * Example doc that will be normalized\n */";
		const first = parseAndTransformComments(input, baseOpts).transformed;
		const second = parseAndTransformComments(first, baseOpts).transformed;
		expect(diffLines(first, second)).toBe("");
	});

	it("preserves code fence blocks", () => {
		const input =
			"/**\n * Before\n * ```js\n * const  x=  1;   \n * ```\n * After\n */";
		const res = parseAndTransformComments(input, baseOpts).transformed;
		expect(/```js/.test(res)).toBe(true);
		// ensure spacing inside fence not normalized
		expect(/const {2}x= {2}1;/.test(res)).toBe(true);
	});

	it("does not merge directive or license groups", () => {
		const input = [
			"// eslint-disable-next-line",
			"// second line should prevent merge due to directive",
			"const y = 2;",
			"// Copyright 2024 Example",
			"// another line",
		].join("\n");
		const res = parseAndTransformComments(input, {
			...baseOpts,
			mergeLineComments: true,
		});
		expect(/eslint-disable/.test(res.transformed)).toBe(true);
		// Should not have merged into a jsdoc (no /** directly before const)
		expect(/\/\*\*/.test(res.transformed)).toBe(false);
	});

	it("list items are not reflowed into a paragraph", () => {
		const input =
			"/**\n * First line explaining.\n * - item one more words here\n * - item two\n */";
		const res = parseAndTransformComments(input, baseOpts).transformed;
		// each list item remains on its own line with leading dash
		const lines = res.split(/\n/).filter((l) => /- item/.test(l));
		expect(lines.length).toBe(2);
	});

	it("tag lines are preserved", () => {
		const input =
			"/**\n * short description\n * @param x value\n * @returns something\n */";
		const res = parseAndTransformComments(input, baseOpts).transformed;
		expect(/@param x value/.test(res)).toBe(true);
		expect(/@returns something/.test(res)).toBe(true);
	});

	it("glob expansion matches created files", () => {
		// create a temporary structure under OS temp inside test workspace
		const tmpRoot = path.join(
			process.cwd(),
			"packages",
			"comments",
			"tmp-test",
		);
		fs.mkdirSync(tmpRoot, { recursive: true });
		const a = path.join(tmpRoot, "a.ts");
		const nestedDir = path.join(tmpRoot, "nested");
		fs.mkdirSync(nestedDir, { recursive: true });
		const b = path.join(nestedDir, "b.ts");
		fs.writeFileSync(a, "// file a", "utf8");
		fs.writeFileSync(b, "// file b", "utf8");
		const patterns = [`${tmpRoot}/*.ts`];
		const augmented = augmentPatterns(patterns);
		expect(augmented.some((p) => p.includes("**/*.ts"))).toBe(true);
		const expanded = expandGlobs(patterns);
		expect(expanded.sort()).toEqual([a, b].sort());
	});

	// Added test for preserving multi-line // comment groups that should NOT merge when preceded by code.
	it("does not merge an inline explanatory multi-line // comment group following code", () => {
		const src = [
			"function demo() {",
			"  const x = 1; // keep",
			"  // first line explains next block",
			"  // still explaining",
			"  // final line",
			"  return x; // done",
			"}",
			"",
		].join("\n");
		const out = parseAndTransformComments(src, {
			mergeLineComments: true,
			wrapLineComments: true,
			width: 80,
		}).transformed;
		expect(out).toContain("  // first line explains next block");
		expect(out).toContain("  // still explaining");
		expect(out).toContain("  // final line");
		expect(out).not.toContain("/**");
	});
});
