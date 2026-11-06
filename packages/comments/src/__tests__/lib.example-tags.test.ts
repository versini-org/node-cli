import { describe, expect, it } from "vitest";
import { JSDOC_BLOCK_TAGS } from "../jsdoc-tags.js";
import { parseAndTransformComments } from "../lib.js";

/**
 * Only a known block tag ends an @example body, and a titled // @example starts
 * its own line (issue 745).
 */
const opts = { width: 80, wrapLineComments: true, mergeLineComments: true };
const run = (input: string) =>
	parseAndTransformComments(input, opts).transformed;
const lines = (...l: string[]) => l.join("\n");

describe("parseAndTransformComments ends @example bodies at known tags", () => {
	it.each([
		["@observable price = 0"],
		["@computed get total() {"],
		['@import "theme.css";'],
	])("keeps %s inside the example as code", (code) => {
		const input = lines(
			"/**",
			" * @example",
			` * ${code}`,
			" * const cart = new Cart()",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("ends an example at a camelCase TSDoc tag", () => {
		const input = lines(
			"/**",
			" * @example",
			" * foo()",
			" * @typeParam T the item type",
			" * of the list",
			" */",
		);
		expect(run(input)).toBe(
			lines(
				"/**",
				" * @example",
				" * foo()",
				" * @typeParam T the item type",
				" * of the list.",
				" */",
			),
		);
	});

	it("starts a titled // @example on its own line after a summary without a period", () => {
		const input = lines(
			"foo();",
			"// Usage",
			"// @example Basic usage",
			"// const a = 1",
			"// const b = 2",
			"bar();",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"foo();",
				"/**",
				" * Usage.",
				" * @example Basic usage",
				" * const a = 1",
				" * const b = 2",
				" */",
				"bar();",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("stores every tag name lowercased, as endsExample compares them", () => {
		for (const tag of JSDOC_BLOCK_TAGS) {
			expect(tag).toBe(tag.toLowerCase());
		}
	});
});
