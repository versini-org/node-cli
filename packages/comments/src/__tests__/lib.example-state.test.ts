import { describe, expect, it } from "vitest";
import { parseAndTransformComments } from "../lib.js";

/**
 * How an open @example body moves between states in both comment forms: a
 * second @example, an unknown decorator and a camelCase tag (issue 745).
 */
const opts = { width: 80, wrapLineComments: true, mergeLineComments: true };
const run = (input: string) =>
	parseAndTransformComments(input, opts).transformed;
const lines = (...l: string[]) => l.join("\n");

describe("parseAndTransformComments moves through @example states", () => {
	it("opens a second @example while one is open", () => {
		const input = lines(
			"/**",
			" * @example First",
			" * a()",
			" * @example Second",
			// A plain code line: it would get a period if the example closed here.
			" * b()",
			" * @observable c = 0",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it.each([
		// A tag name used as a call, a capitalized one, and one indented as code.
		["@property() name = ''"],
		["@Override"],
		["  @returns x"],
	])("keeps %s inside the example as code", (code) => {
		const input = lines(
			"/**",
			" * @example",
			" * foo()",
			` * ${code}`,
			" * y()",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it.each([["@property() name = ''"], ["@Override"], ["  @returns x"]])(
		"keeps %s inside a // example as code",
		(code) => {
			const input = lines(
				"foo();",
				"// @example",
				"// foo()",
				`// ${code}`,
				"// y()",
				"bar();",
			);
			expect(run(input)).toContain(` * foo()\n * ${code}\n * y()\n */`);
		},
	);

	it("opens a second // @example while one is open", () => {
		const input = lines(
			"foo();",
			"// Summary.",
			"// @example First",
			"// a()",
			"// @example Second",
			"// b()",
			"bar();",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"foo();",
				"/**",
				" * Summary.",
				" * @example First",
				" * a()",
				" * @example Second",
				" * b()",
				" */",
				"bar();",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("keeps an unknown decorator inside a // example as code", () => {
		const input = lines(
			"foo();",
			"// @example",
			"// @observable price = 0",
			"// const cart = new Cart()",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * @example",
				" * @observable price = 0",
				" * const cart = new Cart()",
				" */",
				"bar();",
			),
		);
	});

	it("ends a // example at a camelCase TSDoc tag", () => {
		const input = lines(
			"foo();",
			"// @example",
			"// foo()",
			"// @typeParam T the item type",
			"// of the list",
			"bar();",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"foo();",
				"/**",
				" * @example",
				" * foo()",
				" * @typeParam T the item type",
				" * of the list.",
				" */",
				"bar();",
			),
		);
		expect(run(once)).toBe(once);
	});
});
