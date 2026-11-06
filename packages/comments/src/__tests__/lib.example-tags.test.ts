import { describe, expect, it } from "vitest";
import { JSDOC_BLOCK_TAGS } from "../jsdoc-tags.js";
import { parseAndTransformComments } from "../lib.js";

/**
 * Only a known block tag ends an @example body (issue 745).
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
		// Left out of JSDOC_BLOCK_TAGS on purpose, so Sass stays code.
		["@function rem($px) {"],
		["@mixin center {"],
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

	it("keeps a // sentence that wraps at a capitalized word after @example in one piece", () => {
		const input = lines(
			"foo();",
			"// The reflow keeps the body of an",
			"// @example JSDoc tag line for line, and joins the prose after it",
			"bar();",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"foo();",
				"/**",
				" * The reflow keeps the body of an @example JSDoc tag line for line, and joins",
				" * the prose after it.",
				" */",
				"bar();",
			),
		);
		expect(run(once)).toBe(once);
	});

	// TypeDoc, Closure, custom-elements manifest, Doxygen and other block tags.
	it.each([
		"categoryDescription",
		"groupDescription",
		"document",
		"sortStrategy",
		"inline",
		"expandType",
		"inlineType",
		"mergeModuleWith",
		"preventExpand",
		"preventInline",
		"primaryExport",
		"useDeclaredType",
		"showCategories",
		"hideCategories",
		"showGroups",
		"hideGroups",
		"disableGroups",
		"final",
		"export",
		"define",
		"suppress",
		"nocollapse",
		"nosideeffects",
		"record",
		"struct",
		"dict",
		"unrestricted",
		"externs",
		"modifies",
		"slot",
		"csspart",
		"cssprop",
		"cssproperty",
		"cssstate",
		"attr",
		"attribute",
		"element",
		"tag",
		"tagname",
		"brief",
		"details",
		"tparam",
		"retval",
		"pre",
		"post",
		"bug",
		"examples",
		"preserve",
		"usageNotes",
		"publicApi",
	])("ends an example at @%s", (tag) => {
		const input = lines(
			"/**",
			" * @example",
			" * foo()",
			` * @${tag} the value`,
			" * and the rest",
			" */",
		);
		expect(run(input)).toBe(
			lines(
				"/**",
				" * @example",
				" * foo()",
				` * @${tag} the value`,
				" * and the rest.",
				" */",
			),
		);
	});

	it("stores every tag name lowercased, as endsExample compares them", () => {
		for (const tag of JSDOC_BLOCK_TAGS) {
			expect(tag).toBe(tag.toLowerCase());
		}
	});
});
