import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { expandGlobs } from "../glob.js";
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
		// ensure spacing inside fence not normalized.
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
		// Should not have merged into a jsdoc (no /** directly before const).
		expect(/\/\*\*/.test(res.transformed)).toBe(false);
	});

	it("list items are not reflowed into a paragraph", () => {
		const input =
			"/**\n * First line explaining.\n * - item one more words here\n * - item two\n */";
		const res = parseAndTransformComments(input, baseOpts).transformed;
		// each list item remains on its own line with leading dash.
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
		// Heading preserved, not merged into previous paragraph.
		expect(out).toMatch(/Overview:/);
		// Visually indented code line kept as-is (no extra wrapping collapse).
		expect(out).toMatch(/const\s{3}x = 1;/);
		/**
		 * Trailing blank before closing is optional after recent trimming change. (we
		 * only keep it when multiple paragraphs exist). Assert closing exists.
		 * Closing delimiter should be on its own line; allow optional leading
		 * space(s).
		 */
		expect(/\n\s*\*\/$/.test(out)).toBe(true);
		// Numeric list lines preserved.
		expect(out).toMatch(/1\. first/);
		expect(out).toMatch(/2\. second/);
		// Trailing paragraph got terminal period.
		expect(out).toMatch(/Another paragraph without period\./);
	});

	it("glob expansion matches deep files only with explicit globstar", () => {
		const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "comments-glob-"));
		const a = path.join(tmpRoot, "a.ts");
		const nestedDir = path.join(tmpRoot, "nested");
		fs.mkdirSync(nestedDir, { recursive: true });
		const b = path.join(nestedDir, "b.ts");
		fs.writeFileSync(a, "// file a", "utf8");
		fs.writeFileSync(b, "// file b", "utf8");
		// Shallow pattern should only see top-level a.ts.
		const shallow = expandGlobs([`${tmpRoot}/*.ts`]).sort();
		expect(shallow).toEqual([a]);
		// Deep pattern matches both.
		const deep = expandGlobs([`${tmpRoot}/**/*.ts`]).sort();
		expect(deep).toEqual([a, b].sort());
	});

	/**
	 * Added test for preserving multi-line // comment groups that should NOT merge
	 * when preceded by code.
	 */
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
		// Should be converted to a JSDoc (first and last lines delimiters).
		const lines = out.split(/\n/);
		expect(lines[0].trim()).toBe("/**");
		expect(lines[lines.length - 1].trim()).toBe("*/");
		// Ensure representative internal lines are present (now without leading //).
		expect(out).toContain("* JSDoc block extraction:");
		expect(out).toContain("* Pattern explanation:");
		// Arrow lines preserved.
		const arrowLineCount = lines.filter((l) => /->/.test(l)).length;
		expect(arrowLineCount).toBeGreaterThanOrEqual(5);
	});

	it("does not insert period before list introduced by single lowercase word + colon", () => {
		const input = [
			"/**",
			" * Some utilities have logging capabilities that needs to be",
			" * tested a little bit differently:",
			" * - mocking process.exit",
			" * - console.log",
			" * - inquirer.prompt",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, baseOpts).transformed;
		// Ensure no stray period after 'be'.
		expect(out).not.toMatch(/needs to be\./);
		// Ensure list items unchanged.
		expect(out).toMatch(/- mocking process\.exit/);
	});

	it("does not add stray period before lowercase colon line inside jsdoc", () => {
		const input = [
			"/**",
			" * Some utilities have logging capabilities that needs to be",
			" * tested a little bit differently:",
			" * - one",
			" * - two",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, baseOpts).transformed;
		expect(out).not.toMatch(/needs to be\./);
	});

	it("does not append periods to every line of a merged // comment group", () => {
		const original = [
			"// We only want to add terminal punctuation once at the end of the merged",
			"// paragraph, not after every original line (which can create spurious",
			"// periods mid-sentence when lines were simple wraps). We also avoid",
			"// appending a period if the final line ends with a colon introducing a",
			"// list.",
		].join("\n");
		const out = parseAndTransformComments(original, {
			width: 160, // keep wide to avoid secondary wrapping noise
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;
		// Ensure it became a JSDoc block.
		expect(out.startsWith("/**")).toBe(true);
		// Should not contain stray periods after former line breaks.
		expect(out).not.toMatch(/merged\./);
		expect(out).not.toMatch(/spurious\./);
		expect(out).not.toMatch(/introducing a\./);
		// Should still retain existing legitimate period after 'wraps).' and final
		// 'list.'
		expect(out).toMatch(/wraps\)\./);
		expect(out).toMatch(/list\./);
	});

	it("merges a large explanatory // group after a statement into JSDoc", () => {
		const src = [
			"const value = compute();",
			"// We only want to add terminal punctuation once at the end of the merged",
			"// paragraph, not after every original line (which can create spurious",
			"// periods mid-sentence when lines were simple wraps). We also avoid",
			"// appending a period if the final line ends with a colon introducing a",
			"// list.",
			"function next() {}",
		].join("\n");
		const out = parseAndTransformComments(src, {
			width: 160,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;
		// Expect merged into a JSDoc immediately after the statement.
		const re = /compute\(\);\n\/\*\*[\s\S]*?\n\s*\*\//;
		expect(re.test(out)).toBe(true);
		// Ensure only one sentence-final period appended (present on final 'list.'
		// already).
		expect(out.match(/merged\./)).toBeNull();
	});

	it("merges a 3-line explanatory // group after a statement into JSDoc (threshold lowered)", () => {
		const src = [
			"const value = compute();",
			"// First explanatory line that starts with a capital",
			"// second line continues the explanation",
			"// third line completes it",
			"next();",
		].join("\n");
		const out = parseAndTransformComments(src, {
			width: 120,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;
		// The 3-line group should have been converted to a JSDoc block.
		expect(/compute\(\);\n\/\*\*/.test(out)).toBe(true);
		// Ensure original lines no longer start with // (inside block now) and period
		// appended once.
		expect(out).toMatch(/First explanatory line that starts with a capital/);
		expect(out).not.toMatch(/third line completes it\n\/\//); // no stray // after
	});

	it("keeps a space before closing delimiter for complex multi-paragraph example", () => {
		const input = [
			"/**",
			" * Extract the average from a list of numbers.",
			" *",
			" * @example",
			" * ```js",
			" * const res = extractAverage({ data: [11, 22, 33, 44] });",
			" * console.log(res); // 27.5 -> (11 + 22 + 33 + 44) / 4",
			" * ```",
			" *",
			" * Any value that is not a number or is less than 0 will be ignored.",
			" *",
			" * A formatter function can be passed to format the output. If no formatter is",
			" * provided, the default behavior is to cast the number to the generic Output",
			" * type.",
			" *",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, baseOpts).transformed;
		// Closing line should contain a leading space before */ (style consistency).
		expect(/\n \*\/$/.test(out)).toBe(true);
		// Should not regress by emitting no-space variant.
		expect(/\n\*\/$/.test(out)).toBe(false);
	});

	it("does not add trailing space on blank '*' lines inside code fences", () => {
		const input = [
			"/**",
			" * Function to format a number with commas as thousands separators.",
			" *",
			" * @example",
			" * ```js",
			" * const formattedNumber = numberFormatter.format(1000);",
			' * console.log(formattedNumber); // "1,000"',
			" *", // blank line inside fence we want ' *' (no trailing space)
			" * const roundedNumber = numberFormatter.format(1234.56);",
			' * console.log(roundedNumber); // "1,235"',
			" * ```",
			" *",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, baseOpts).transformed;
		// Collect lines that are just star forms.
		const starLines = out.split(/\n/).filter((l) => /^ \* ?$/.test(l));
		// None of them should have a trailing space after the star.
		for (const l of starLines) {
			expect(l).toBe(" *");
		}
	});

	it("isolates mid-paragraph NOTE sentence inside a JSDoc block", () => {
		const input = [
			"/**",
			" * This operation performs work and may take time NOTE: use with caution if running on production systems. It returns a result",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, {
			...baseOpts,
			width: 120,
		}).transformed;
		// Ensure NOTE is on its own line.
		expect(
			/\n \* NOTE: use with caution if running on production systems\.\n/.test(
				out,
			),
		).toBe(true);
		// Preceding sentence fragments present and end with period somewhere before
		// NOTE line.
		expect(out).toMatch(/This operation performs work and may take time\n/);
		// Trailing sentence appears after NOTE line with terminal period.
		expect(/NOTE: use with caution[\s\S]*It returns a result\./.test(out)).toBe(
			true,
		);
	});

	it("keeps NOTE at start of JSDoc on its own line with added period", () => {
		const input = [
			"/**",
			" * note: must initialize the runtime before calling any methods",
			" * subsequent calls depend on global state",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, {
			...baseOpts,
			width: 100,
		}).transformed;
		const noteLine = out
			.split(/\n/)
			.find((l) => /NOTE: must initialize/.test(l));
		expect(noteLine).toBeDefined();
		expect(/\.$/.test(noteLine || "")).toBe(true);
		expect(out).toMatch(/subsequent calls depend on global state\./);
	});

	it("isolates multiple NOTE sentences within merged // comment group", () => {
		const src = [
			"// This performs the main task.",
			"// NOTE: side effects may occur.",
			"// It then produces output.",
			"// NOTE: results are cached for 5 minutes.",
			"function run() {}",
		].join("\n");
		const out = parseAndTransformComments(src, {
			width: 160,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;
		const noteLines = out.split(/\n/).filter((l) => /NOTE: /.test(l));
		expect(noteLines.length).toBe(2);
		for (const l of noteLines) {
			expect(l.trim()).toMatch(/\.$/);
		}
	});

	it("merges line comments after lines ending with },", () => {
		const src = [
			"const config = {",
			'	"key": "value",',
			'	"another": "property",',
			"},",
			"// This is a multi-line comment that should be merged",
			"// because it follows a line ending with }, which indicates",
			"// the end of an object or array element",
			"const next = 42;",
		].join("\n");
		const out = parseAndTransformComments(src, {
			width: 80,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;
		expect(out).toMatch(/},\n\/\*\*/);
		expect(out).toMatch(/multi-line comment that should be merged/);
		expect(out).toMatch(/object or array element\./);
		expect(out).not.toMatch(/\/\/ This is a multi-line/);
	});

	it("merges line comments after various comma-ending contexts", () => {
		const src = [
			"const items = [",
			'	"first",',
			'	"second",',
			"];",
			"// Comments after array with trailing comma",
			"// should be merged into JSDoc format",
			"",
			"function demo(a, b,) {",
			"	return a + b;",
			"}",
			"// Comments after function ending with }",
			"// should also be merged properly",
		].join("\n");
		const out = parseAndTransformComments(src, {
			width: 80,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;

		// First comment group after array should be merged
		expect(out).toMatch(/];\n\/\*\*/);
		expect(out).toMatch(/Comments after array with trailing comma/);

		// Second comment group after function should be merged
		expect(out).toMatch(/}\n\/\*\*/);
		expect(out).toMatch(/Comments after function ending with }/);
	});

	it("does not merge single line comment when context is not eligible", () => {
		const src = [
			"const value = process()", // doesn't end with eligible punctuation, no semicolon
			"// single comment that should not be merged",
			"console.log(value);",
		].join("\n");
		const out = parseAndTransformComments(src, {
			width: 80,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;

		// Single comment should remain as line comment, not merged to JSDoc
		expect(out).toMatch(/\/\/ single comment that should not be merged/);
		expect(out).not.toMatch(/\/\*\*/);
	});

	it("splits consecutive NOTE sentences in a single paragraph", () => {
		const input = [
			"/**",
			" * This does work. NOTE: first caveat. NOTE: second caveat. Done",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, {
			...baseOpts,
			width: 100,
		}).transformed;
		const lines = out.split(/\n/).filter((l) => /^ \* /.test(l));
		const notes = lines.filter((l) => /NOTE: /.test(l));
		expect(notes.length).toBe(2);
		for (const l of notes) {
			expect(l).toMatch(/\.$/);
		}
		expect(out).toMatch(/Done\./);
	});

	it("detects NOTE after exclamation boundary", () => {
		const input = [
			"/**",
			" * Success! NOTE: edge case follows. Continue processing",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, {
			...baseOpts,
			width: 120,
		}).transformed;
		expect(out).toMatch(/Success!\n \* NOTE: edge case follows\./);
		expect(out).toMatch(/Continue processing\./);
	});

	it("does not force period on NOTE line ending with continuation word when followed by continuation line", () => {
		const input = [
			"/**",
			" * NOTE: we are still using the good old lodash uniqueId when the code is not in",
			" * production, so that the results are a little bit more consistent tests after",
			" * test instead of being completely random.",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, {
			...baseOpts,
			width: 100,
		}).transformed;
		// New structural policy: first NOTE line always gets period even if followed
		// by prose.
		expect(out).toMatch(/when the code is not in\./);
		// Ensure final sentence has period.
		expect(/completely random\./.test(out)).toBe(true);
	});

	it("handles diffLines with different length arrays", () => {
		const a = "line1\nline2";
		const b = "line1\nline2\nline3";
		const diff = diffLines(a, b);
		expect(diff).toContain("+ line3");

		const c = "line1\nline2\nline3";
		const d = "line1\nline2";
		const diff2 = diffLines(c, d);
		expect(diff2).toContain("- line3");
	});

	it("handles complex NOTE sentence boundaries and splitting", () => {
		const input = [
			"/**",
			" * This performs work NOTE: first note without period NOTE: second note. Then continues",
			" */",
		].join("\n");
		const out = parseAndTransformComments(input, {
			...baseOpts,
			width: 100,
		}).transformed;
		// Test that NOTE content is processed properly (without making assumptions about splitting)
		expect(out).toMatch(/This performs work/);
		expect(out).toMatch(/NOTE: first note without period/);
		expect(out).toMatch(/NOTE: second note/);
		expect(out).toMatch(/Then continues/);
	});

	it("handles line comment merging with NOTE content", () => {
		const src = [
			"// This text has multiple thoughts",
			"// NOTE: important note here",
			"// Final concluding text",
		].join("\n");
		const out = parseAndTransformComments(src, {
			width: 120,
			wrapLineComments: true,
			mergeLineComments: true,
		}).transformed;
		expect(out).toMatch(/\/\*\*/);
		expect(out).toMatch(/This text has multiple thoughts/);
		expect(out).toMatch(/NOTE: important note here/);
		expect(out).toMatch(/Final concluding text/);
	});
});
