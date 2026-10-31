import { describe, expect, it } from "vitest";
import { parseAndTransformComments } from "../lib.js";

/**
 * Structure a reflow must keep: list items and blank-line paragraphs in a
 * merged // group, runs of spaces inside inline code, and regex lines the merge
 * path keeps line by line (issue 727).
 */
const opts = { width: 80, wrapLineComments: true, mergeLineComments: true };
const run = (input: string) =>
	parseAndTransformComments(input, opts).transformed;
const lines = (...l: string[]) => l.join("\n");

describe("parseAndTransformComments keeps structure", () => {
	it("keeps list items of a merged // group on their own lines", () => {
		const input = lines(
			"foo();",
			"// Supported modes:",
			"// - safe: never sends credentials.",
			"// - fast: skips the cache.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Supported modes:",
				" * - safe: never sends credentials.",
				" * - fast: skips the cache.",
				" */",
				"bar();",
			),
		);
	});

	it("keeps a list item after a NOTE of a merged // group on its own line", () => {
		const input = lines(
			"foo();",
			"// NOTE: Supported modes.",
			"// - safe: never sends credentials.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * NOTE: Supported modes.",
				" * - safe: never sends credentials.",
				" */",
				"bar();",
			),
		);
	});

	it("ends a NOTE at a blank line of a merged // group", () => {
		const input = lines(
			"foo();",
			"// NOTE: the cache is shared.",
			"//",
			"// Unrelated paragraph about retries.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * NOTE: the cache is shared.",
				" *",
				" * Unrelated paragraph about retries.",
				// A block with several paragraphs keeps a trailing blank line.
				" *",
				" */",
				"bar();",
			),
		);
	});

	it("keeps runs of spaces inside inline code in a JSDoc paragraph", () => {
		const input = lines("/**", " * Collapses `a  b` in prose.", " */");
		expect(run(input)).toBe(input);
	});

	it("keeps runs of spaces inside inline code in a NOTE", () => {
		const input = lines("/**", " * NOTE: Match `/  /g`, not `/ /g`.", " */");
		expect(run(input)).toBe(input);
	});

	it("keeps runs of spaces inside inline code in a // comment", () => {
		const input = lines("function f() {", "\t// Match `/  /g` only.", "}");
		expect(run(input)).toBe(input);
	});

	it("keeps (?: regex lines of a merged // group line by line", () => {
		const input = lines(
			"foo();",
			"// Match the prefix.",
			"// (?:abc) matches abc",
			"// (?:def) matches def",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Match the prefix.",
				" * (?:abc) matches abc",
				" * (?:def) matches def",
				" */",
			),
		);
	});
});
