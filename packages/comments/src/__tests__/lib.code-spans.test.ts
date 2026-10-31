import { describe, expect, it } from "vitest";
import { parseAndTransformComments } from "../lib.js";

/**
 * Runs of whitespace inside inline code survive a reflow, and a second pass
 * changes nothing (issue 730). Each "case" below is a failure from that issue.
 */
const opts = { width: 80, wrapLineComments: true, mergeLineComments: true };
type Options = typeof opts;
const run = (input: string, o: Options = opts) =>
	parseAndTransformComments(input, o).transformed;
const lines = (...l: string[]) => l.join("\n");
// The first pass, after checking that a second pass leaves it alone.
const stable = (input: string, o: Options = opts) => {
	const once = run(input, o);
	expect(run(once, o)).toBe(once);
	return once;
};

describe("parseAndTransformComments keeps inline-code spaces", () => {
	it("keeps a run of spaces in a JSDoc paragraph, a NOTE and a // comment", () => {
		for (const input of [
			lines("/**", " * Collapses `a  b` in prose.", " */"),
			lines("/**", " * NOTE: Match `/  /g`, not `/ /g`.", " */"),
			lines("function f() {", "\t// Match `/  /g` only.", "}"),
		]) {
			expect(run(input)).toBe(input);
		}
	});

	it("does not split a NOTE at a NOTE: inside held code", () => {
		const input = lines("/**", " * Use `a  NOTE: b` here.", " */");
		expect(run(input)).toBe(input);
	});

	it("never starts a line inside held code (case 1)", () => {
		const input = lines(
			"/**",
			` * Some ${"w".repeat(24)} \`x -  y\` and more words after it.`,
			" */",
		);
		expect(stable(input, { ...opts, width: 40 })).toContain("`x -  y`");
	});

	it("keeps a wrapped // line's code spaces on the next pass (case 2)", () => {
		const input = lines(
			"x",
			"// Run `git log --format  %H --since yesterday` before you go and do this",
		);
		const o = { width: 50, wrapLineComments: true, mergeLineComments: false };
		expect(stable(input, o)).toContain(
			"`git log --format  %H --since yesterday`",
		);
		// Wider than the line: not held, so it collapses once.
		expect(stable(input, { ...o, width: 40 })).toContain("--format %H");
	});

	it("keeps code spaces when another span on the line wraps (case 3)", () => {
		const input = lines(
			"x",
			"// The first parameter is `foo bar` and the second is `/  /`.",
		);
		const o = { width: 33, wrapLineComments: true, mergeLineComments: false };
		expect(stable(input, o)).toContain("`/  /`");
	});

	it("does not overflow with punctuation attached to held code (case 4)", () => {
		const input = lines(
			"/**",
			` * x \`a  ${"b".repeat(72)}\`, more words`,
			" */",
		);
		expect(
			stable(input)
				.split("\n")
				.every((l) => l.length <= 80),
		).toBe(true);
	});

	it("does not hold for spaces between two spans (case 5)", () => {
		const input = lines(
			"/**",
			" * alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lim `foo bar` x.  Then `baz` ok.",
			" */",
		);
		expect(stable(input)).toContain("x. Then");
	});

	it("leaves room for the period a held word may get (case 7)", () => {
		const code = `\`${"x".repeat(36)}  ${"x".repeat(35)}\``;
		const input = lines("/**", ` * see (${code})`, " */");
		expect(
			stable(input)
				.split("\n")
				.every((l) => l.length <= 80),
		).toBe(true);
	});

	it("keeps a tab inside held code (case 8)", () => {
		const input = lines(
			"/**",
			" * alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lim `a\t  b` ok.",
			" */",
		);
		expect(stable(input)).toContain("`a\t  b`");
	});

	it("does not invent a double space when code wraps across lines", () => {
		const input = lines("/**", " * Call `foo", " *  bar` to start.", " */");
		expect(run(input)).toBe(lines("/**", " * Call `foo bar` to start.", " */"));
	});

	it("collapses as before when backticks do not pair up", () => {
		const input = lines(
			"/**",
			" * Type a ` to quote.  Then run  it, then `a  b` works.",
			" */",
		);
		expect(stable(input)).toBe(
			lines(
				"/**",
				" * Type a ` to quote. Then run it, then `a b` works.",
				" */",
			),
		);
	});
});
