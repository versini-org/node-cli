import { describe, expect, it } from "vitest";
import { parseAndTransformComments } from "../lib.js";

/**
 * Structure a reflow must keep: list items, tags, headings, NOTE lines and
 * blank-line paragraphs in a merged // group, hand-wrapped sentences that only
 * look like structure, and regex lines kept line by line (issue 727).
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

	it("joins a merged // line that only looks like a tag mid-sentence", () => {
		const input = lines(
			"foo();",
			"// Calls the handler registered through the",
			"// @Injectable decorator on the class",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Calls the handler registered through the @Injectable decorator on the class.",
				" */",
				"bar();",
			),
		);
	});

	it("joins a merged // line that only looks like a numbered item mid-sentence", () => {
		const input = lines(
			"foo();",
			"// The limit is",
			"// 10. The client must not exceed it.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * The limit is 10. The client must not exceed it.",
				" */",
				"bar();",
			),
		);
	});

	it("keeps the lines after a merged // list item on their own lines", () => {
		const input = lines(
			"foo();",
			"// - item one",
			"//   continued text",
			"// 2. Not-prose class",
			"// Must be processed first",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * - item one",
				" *   continued text",
				" * 2. Not-prose class",
				" * Must be processed first.",
				" */",
				"bar();",
			),
		);
	});

	it("starts a NOTE at a lowercase note: line of a merged // group", () => {
		const input = lines(
			"foo();",
			"// Be careful.",
			"// note:",
			"// Never send tokens to this host.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Be careful.",
				" * NOTE: Never send tokens to this host.",
				" */",
				"bar();",
			),
		);
	});

	it("still reflows a JSDoc block whose code fence contains (?:", () => {
		const input = lines(
			"/**",
			" * Parses the header and returns the value; this sentence is long enough that it must wrap at eighty.",
			" *",
			" * ```ts",
			" * const re = /(?:a|b)+/;",
			" * ```",
			" */",
		);
		expect(run(input)).toBe(
			lines(
				"/**",
				" * Parses the header and returns the value; this sentence is long enough that it",
				" * must wrap at eighty.",
				" *",
				" * ```ts",
				" * const re = /(?:a|b)+/;",
				" * ```",
				" *",
				" */",
			),
		);
	});

	it("keeps a merged // bullet after an unindented continuation", () => {
		const input = lines(
			"foo();",
			"// - Never log credentials",
			"// or secret keys",
			"// - Delete temporary files",
			"bar();",
		);
		const once = run(input);
		expect(once).toContain("\n * - Delete temporary files\n");
		expect(run(once)).toBe(once);
	});

	it("keeps indented lines after a merged // tag as they are", () => {
		const input = lines(
			"foo();",
			"// @example",
			"//   const a = useTheme();",
			"//   <Icon />",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * @example",
				" *   const a = useTheme();",
				" *   <Icon />",
				" */",
				"bar();",
			),
		);
	});

	it("keeps a heading of a merged // group on its own line", () => {
		const input = lines(
			"foo();",
			"// Overview:",
			"// This module does X.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Overview:",
				" * This module does X.",
				" */",
				"bar();",
			),
		);
	});

	it("keeps a merged // group with a fenced arrow line by line", () => {
		const input = lines(
			"foo();",
			"// The limit was raised from 9 to",
			"// 10. See the table:",
			"// ```",
			"// old -> new",
			"// ```",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * The limit was raised from 9 to",
				" * 10. See the table:",
				" * ```",
				" * old -> new",
				" * ```",
				" */",
				"bar();",
			),
		);
	});

	it("keeps a JSDoc block with an arrow inside nested fences verbatim", () => {
		const input = lines(
			"/**",
			" * ````markdown",
			" * a -> b",
			" * ```sh",
			" * rm -f scratch.tmp",
			" * echo keep.txt;",
			" * ```",
			" * ````",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("escapes a comment closer in a merged // group", () => {
		const input = lines(
			"foo();",
			"// Strips a */ closer",
			"// from the text.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Strips a *\\/ closer from the text.",
				" */",
				"bar();",
			),
		);
	});

	it("keeps a merged // Pattern explanation: group line by line", () => {
		const input = lines(
			"foo();",
			"// Pattern explanation:",
			"// a b c",
			"// d e f",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Pattern explanation:",
				" * a b c",
				" * d e f",
				" */",
				"bar();",
			),
		);
	});

	it("keeps the lines and indent of a code fence in a merged // group", () => {
		const input = lines(
			"foo();",
			"// Example:",
			"// ```",
			"// if (a) {",
			"//   run();",
			"// }",
			"// ```",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Example:",
				" * ```",
				" * if (a) {",
				" *   run();",
				" * }",
				" * ```",
				" */",
				"bar();",
			),
		);
	});

	it("ends a merged // list at a blank line", () => {
		const input = lines(
			"foo();",
			"// - one",
			"//",
			"// The limit is",
			"// 10. The client must not exceed it.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * - one",
				" *",
				" * The limit is 10. The client must not exceed it.",
				" *",
				" */",
				"bar();",
			),
		);
	});

	it("drops the indent of a merged // line after a blank line or prose", () => {
		const afterBlank = lines(
			"foo();",
			"// Intro.",
			"//",
			"//   indented text",
			"bar();",
		);
		expect(run(afterBlank)).toBe(
			lines(
				"foo();",
				"/**",
				" * Intro.",
				" *",
				" * indented text.",
				" *",
				" */",
				"bar();",
			),
		);
		const afterProse = lines("foo();", "// Done.", "//   NOTE: x y", "bar();");
		expect(run(afterProse)).toBe(
			lines("foo();", "/**", " * Done.", " * NOTE: x y.", " */", "bar();"),
		);
	});

	it("starts a merged // heading after a sentence end", () => {
		const input = lines(
			"foo();",
			"// Done.",
			"// Overview:",
			"// This module does X.",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Done.",
				" * Overview:",
				" * This module does X.",
				" */",
				"bar();",
			),
		);
	});

	it("keeps a JSDoc block with an optional-colon regex verbatim", () => {
		const input = lines(
			"/**",
			" * /^prefix:?  suffix$/ matches an optional colon and exactly two spaces.",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("joins a numbered-looking line after a merged // bullet list", () => {
		const afterProse = lines(
			"foo();",
			"// - a",
			"// Then the limit is",
			"// 10. The client must not exceed it.",
			"bar();",
		);
		expect(run(afterProse)).toBe(
			lines(
				"foo();",
				"/**",
				" * - a",
				" * Then the limit is 10. The client must not exceed it.",
				" */",
				"bar();",
			),
		);
		const afterHeading = lines(
			"foo();",
			"// - a",
			"// Overview:",
			"// The limit is",
			"// 10. The client must not exceed it.",
			"bar();",
		);
		expect(run(afterHeading)).toBe(
			lines(
				"foo();",
				"/**",
				" * - a",
				" * Overview:",
				" * The limit is 10. The client must not exceed it.",
				" */",
				"bar();",
			),
		);
	});

	it("keeps a ``` fence inside a ```` fence as code", () => {
		const fence = [
			"````md",
			"```sh",
			"rm -f a.tmp",
			"echo keep.txt",
			"```",
			"````",
		];
		const merged = lines(
			"foo();",
			"// Example:",
			...fence.map((l) => `// ${l}`),
			"bar();",
		);
		expect(run(merged)).toBe(
			lines(
				"foo();",
				"/**",
				" * Example:",
				...fence.map((l) => ` * ${l}`),
				" */",
				"bar();",
			),
		);
		const jsDoc = lines(
			"/**",
			" * Example:",
			...fence.map((l) => ` * ${l}`),
			" */",
		);
		expect(run(jsDoc)).toBe(jsDoc);
	});

	it("merges a // group with an optional colon as 1.1.6 did", () => {
		const input = lines(
			"foo();",
			"// Use the key:? prefix to mark a field as",
			"// optional in the config file",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * Use the key:? prefix to mark a field as optional in the config file.",
				" */",
				"bar();",
			),
		);
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
