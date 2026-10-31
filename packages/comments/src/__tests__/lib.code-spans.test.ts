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

	it("splits a NOTE inside code as before, so every line fits", () => {
		for (const [input, width, wrap] of [
			[
				lines(
					"/**",
					" * Logs `[averyveryverylongidentifier], NOTE: something` here.",
					" */",
				),
				36,
				true,
			],
			[lines("/**", " * Use `a  NOTE: b` Options:", " */"), 20, false],
		] as const) {
			const o = { ...opts, width, wrapLineComments: wrap };
			const out = stable(input, o);
			expect(out).toContain(" * NOTE: ");
			expect(out.split("\n").every((l) => l.length <= width)).toBe(true);
		}
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

describe("parseAndTransformComments holds code only where it stays stable", () => {
	const lineOnly = {
		width: 80,
		wrapLineComments: true,
		mergeLineComments: false,
	};
	const fits = (out: string, width: number) =>
		out.split("\n").every((l) => l.length <= width);

	it("collapses held code that would push a // line over the width", () => {
		for (const [input, width] of [
			[
				"// `git log --format  %H --since yesterday` - inspect the changes.",
				44,
			],
			["// `foo bar baz qux quux corge` @param x `a  b`", 34],
			["// `git status --short` NOTE: `/  /`", 24],
		] as const) {
			expect(fits(stable(input, { ...lineOnly, width }), width)).toBe(true);
		}
	});

	it("does not hold a paragraph that starts like a list item", () => {
		for (const [input, width] of [
			[lines("/**", " * 1.", " * `a b NOTE: c` d", " */"), 14],
			[
				lines(
					"/**",
					" * -",
					" * `aaaa bbbb cccc dddd eeee ffff gggg hhhh` `x NOTE: y`",
					" */",
				),
				40,
			],
		] as const) {
			stable(input, { ...opts, width });
		}
	});

	it("does not hold a list item marked by a tab", () => {
		const input = lines(
			"/**",
			" * -\t`a  b` more words `foo bar baz qux` end.",
			" */",
		);
		for (const width of [20, 21, 80]) {
			stable(input, { ...opts, width });
		}
	});

	it("normalizes note: as before", () => {
		expect(run("x\n// note:example", lineOnly)).toContain("// NOTE:example");
		const merged = run(
			lines(
				"foo();",
				"// Load the config first.",
				"// note:\tthe cache is cleared",
			),
		);
		expect(merged).toContain("\n * NOTE: the cache is cleared.");
	});

	it("does not hold code that would start a line with a glued note:", () => {
		const input = lines(
			"const y = 2",
			"// 10.\t`longcodeidentifier\t1.`\tnote:x\tFoo:\t`x\ty`\tbaz,\te.g.",
			"const x = 1;",
		);
		stable(input, { ...opts, width: 27 });
	});

	it("does not pair escaped backticks as code", () => {
		const input = lines(
			"/**",
			" * Escape an opening \\` in prose.  NOTE: Also escape a closing \\` here.",
			" */",
		);
		const out = stable(input);
		expect(out).toContain("\n * NOTE: Also escape");
		expect(out).not.toContain("prose.  ");
	});

	it("does not hold code written with runs of backticks", () => {
		expect(run(lines("/**", " * The ``a  b`` form.", " */"))).toContain(
			"``a b``",
		);
		// Paired one by one, " then " would be held as code.
		expect(
			stable("// Write ``` then  `x  y`, then ``` again", lineOnly),
		).not.toContain("then  ");
	});

	it("keeps a literal private-use character as it is", () => {
		const own = String.fromCharCode(0xe000);
		expect(
			stable(lines("/**", ` * Keep ${own} and \`a  b\`.`, " */")),
		).toContain(own);
		expect(stable(`x\n// Keep ${own} and \`a  b\`.`, lineOnly)).toContain(own);
	});

	it("collapses code that has other whitespace", () => {
		const nbsp = String.fromCharCode(0xa0);
		expect(
			stable(lines("/**", ` * Run \`a${nbsp}b  c\` now.`, " */")),
		).toContain("`a b c`");
	});

	it("keeps a lone tab in code", () => {
		const input = lines("/**", " * Split on `a\tb` here.", " */");
		expect(run(input)).toBe(input);
	});

	it("holds code that fills a line exactly, period included", () => {
		const code = `\`${"a".repeat(36)}  ${"b".repeat(36)}\``;
		const out = stable(lines("/**", ` * see ${code}.`, " */"));
		expect(out).toContain(` * ${code}.`);
		expect(fits(out, 80)).toBe(true);
	});
});
