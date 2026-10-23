import { describe, expect, it } from "vitest";
import { parseAndTransformComments } from "../lib.js";

/**
 * Minimal inputs for the bugs that lib.property.test.ts found, kept as plain
 * cases so a regression names itself.
 */
const run = (
	input: string,
	opts: Parameters<typeof parseAndTransformComments>[1],
) => parseAndTransformComments(input, opts).transformed;

describe("parseAndTransformComments regressions found by the properties", () => {
	const opts = { width: 80, wrapLineComments: true, mergeLineComments: true };

	it("does not split a URL inside a NOTE sentence", () => {
		const input =
			"/**\n * Retries a few times. NOTE: see https://example.com/docs/retry.html for the table.\n */";
		expect(run(input, opts)).toContain("https://example.com/docs/retry.html");
	});

	it("settles in one pass when a wrap lands before a dash", () => {
		const input =
			"/**\n * The cache is keyed by user id and locale and it is flushed whenever the sessi - and only then - ends.\n */";
		const once = run(input, opts);
		expect(run(once, opts)).toBe(once);
	});

	it("settles in one pass when a long // line wraps in merge mode", () => {
		const input =
			"function f() {\n\t// Flush the cache whenever the session ends so that a stale locale never leaks into the next request\n\treturn 1;\n}";
		const once = run(input, opts);
		expect(run(once, opts)).toBe(once);
	});

	it("keeps the sentence before a word that ends in NOTE:", () => {
		const input =
			"/**\n * The table below lists each case. FOOTNOTE: values are rounded.\n */";
		expect(run(input, opts)).toContain("The table below lists each case.");
	});

	it("settles in one pass when a NOTE sentence wraps before another sentence", () => {
		const input =
			"/**\n * Retries the request. NOTE: the backoff doubles on every attempt and is capped at thirty seconds so a dead upstream never stalls the queue. Callers can override it.\n */";
		const once = run(input, opts);
		expect(run(once, opts)).toBe(once);
	});

	it("settles in one pass when text follows a wrapped NOTE sentence on its line", () => {
		const input =
			"/**\n * Retries the request.\n *\n * NOTE: the backoff doubles\n * on every attempt. Callers\n * can override it in the\n * config.\n * See retry.ts.\n */";
		const once = run(input, opts);
		expect(run(once, opts)).toBe(once);
	});

	it("does not merge the tail of a // comment that follows unfinished code", () => {
		const input =
			"const timeout = base\n\t// Doubles on each retry (see retry.ts)\n\t// and caps at thirty seconds so a dead\n\t// upstream never stalls the queue\n\t* 2;";
		expect(run(input, opts)).not.toContain("/**");
	});

	it("does not grow an unclosed code fence on each pass", () => {
		const input = "/**\n * ```\n * \n */";
		const once = run(input, opts);
		expect(run(once, opts)).toBe(once);
	});
});
