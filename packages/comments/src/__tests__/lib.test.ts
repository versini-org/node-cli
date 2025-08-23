import fs from "node:fs";
import os from "node:os";
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

	it("handles heading-like lines with colon and visually indented code & numeric lists", () => {
		const input = [
			"/**",
			" * Overview:",
			" *   const   x = 1;",
			" * 1. first",
			" * 2. second",
			" *", // blank separation
			" * Another paragraph without period",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, baseOpts).transformed;
		// Heading preserved, not merged into previous paragraph
		expect(out).toMatch(/Overview:/);
		// Visually indented code line kept as-is (no extra wrapping collapse)
		expect(out).toMatch(/const\s{3}x = 1;/);
		// Ensure final blank line before closing preserved (one line ending with ' *')
		const trailingBlank = /\n \*\n\*\/$/.test(out.replace(/\r/g, ""));
		expect(trailingBlank).toBe(true);
		// Numeric list lines preserved
		expect(out).toMatch(/1\. first/);
		expect(out).toMatch(/2\. second/);
		// Trailing paragraph got terminal period
		expect(out).toMatch(/Another paragraph without period\./);
	});

	it("glob expansion matches created files", () => {
		// Create a truly temporary isolated directory outside source tree
		const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "comments-glob-"));
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

	it("converts the multi-line explanatory block from lib.ts into a multi-line JSDoc, preserving lines", () => {
		const snippet = [
			"// JSDoc block extraction:",
			"// Previous pattern used a lazy dot-all: ([\\s\\S]*?) which could, under",
			"// pathological inputs, produce excessive backtracking. We replace it with a",
			"// tempered pattern that advances linearly by never letting the inner part",
			"// consume a closing '*/'. This avoids catastrophic behavior while keeping",
			"// correctness.",
			"// Pattern explanation:",
			"//  (^ [\\t ]* )    -> capture indentation at start of line (multiline mode)",
			"//  /\\*\\*          -> opening delimiter",
			"//  (              -> capture group 2 body",
			"//    (?:[^*]      -> any non-* char",
			"//      |\\*(?!/)   -> or a * not followed by /",
			"//    )*           -> repeated greedily (cannot cross closing */)",
			"//  )",
			"//  \\n?[\\t ]*\\*/   -> optional newline + trailing indent + closing */",
			"// The greedy repetition is safe because the inner alternatives are mutually",
			"// exclusive and each consumes at least one char without overlapping on the",
			"// closing sentinel.",
		].join("\n");
		const out = parseAndTransformComments(snippet, {
			width: 100,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;
		// Should be converted to a JSDoc (first and last lines delimiters)
		const lines = out.split(/\n/);
		expect(lines[0].trim()).toBe("/**");
		expect(lines[lines.length - 1].trim()).toBe("*/");
		// Ensure representative internal lines are present (now without leading //)
		expect(out).toContain("* JSDoc block extraction:");
		expect(out).toContain("* Pattern explanation:");
		// Arrow lines preserved
		const arrowLineCount = lines.filter((l) => /->/.test(l)).length;
		expect(arrowLineCount).toBeGreaterThanOrEqual(5);
	});
});
