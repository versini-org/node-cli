import { describe, expect, it } from "vitest";
import { parseAndTransformComments } from "../lib.js";

/**
 * The body of an @example tag is code: it is kept line for line, like a fenced
 * block, up to the next tag (issue 735).
 */
const opts = { width: 80, wrapLineComments: true, mergeLineComments: true };
const run = (input: string) =>
	parseAndTransformComments(input, opts).transformed;
const lines = (...l: string[]) => l.join("\n");

describe("parseAndTransformComments keeps @example bodies", () => {
	it("does not reflow the code lines of an unfenced @example", () => {
		const input = lines(
			"/**",
			" * @example",
			" *",
			" * const [rightElementRef, rect] = useResizeObserver<HTMLDivElement>();",
			" * <div ref={rightElementRef}>",
			" *   Observed: <code>{JSON.stringify(rect)}</code>",
			" * </div>",
			" */",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"/**",
				" * @example",
				" *",
				" * const [rightElementRef, rect] = useResizeObserver<HTMLDivElement>();",
				" * <div ref={rightElementRef}>",
				" *   Observed: <code>{JSON.stringify(rect)}</code>",
				" * </div>",
				// A block with several paragraphs keeps a trailing blank line.
				" *",
				" */",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("treats lines after the next tag as prose again", () => {
		const input = lines(
			"/**",
			" * @example",
			" * foo();",
			" * bar()",
			" * @returns the cached value",
			" * or undefined",
			" */",
		);
		expect(run(input)).toBe(
			lines(
				"/**",
				" * @example",
				" * foo();",
				// Code gets no period.
				" * bar()",
				" * @returns the cached value",
				// Prose does.
				" * or undefined.",
				" */",
			),
		);
	});

	it("keeps a decorator inside the example as code", () => {
		const input = lines(
			"/**",
			" * @example",
			" * @Component({ selector: 'app' })",
			" * class App {}",
			" * new App();",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("keeps a lowercase decorator call inside the example as code", () => {
		const input = lines(
			"/**",
			" * @example",
			" * @injectable()",
			" * class Foo {}",
			" * const x = new Foo()",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("opens an example whose tag is indented", () => {
		const input = lines(
			"/**",
			" *  @example",
			" * const a = 1",
			" * const b = 2",
			" */",
		);
		const once = run(input);
		expect(once).toContain(" * const a = 1\n * const b = 2\n");
		expect(run(once)).toBe(once);
	});

	it("does not treat @example-foo as an example", () => {
		const input = lines("/**", " * @example-foo", " * a()", " * b()", " */");
		expect(run(input)).toContain(" * a() b().");
	});

	it("reflows the prose after a fenced example", () => {
		const input = lines(
			"/**",
			" * @example",
			" * ```ts",
			" * run();",
			" * ```",
			" *",
			" * Any value that is not a number or is less than zero is ignored by the function here",
			" */",
		);
		const once = run(input);
		expect(once).toContain(
			lines(
				" * Any value that is not a number or is less than zero is ignored by the",
				" * function here.",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("keeps the code lines of a merged // @example group", () => {
		const input = lines(
			"foo();",
			"// @example",
			"// const a = useTheme();",
			"// <Icon />",
			"bar();",
		);
		expect(run(input)).toBe(
			lines(
				"foo();",
				"/**",
				" * @example",
				" * const a = useTheme();",
				" * <Icon />",
				" */",
				"bar();",
			),
		);
	});

	it("keeps the code lines of a merged // group whose @example is indented", () => {
		const input = lines(
			"foo();",
			"//  @example",
			"// const a = 1",
			"// const b = 2",
			"bar();",
		);
		expect(run(input)).toContain(" * const a = 1\n * const b = 2\n");
	});

	it("keeps a sentence in order when a line starts with an @example/ package", () => {
		const input = lines(
			"/**",
			" * Import the component from",
			" * @example/ui and configure",
			" * its props before rendering",
			" */",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"/**",
				" * Import the component from @example/ui and configure its props before",
				" * rendering.",
				" */",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("does not open an example for an @example in an indented code sample", () => {
		const input = lines(
			"/**",
			" * Tag a usage sample like this:",
			" *",
			" *     @example",
			" *     run();",
			" *",
			" * Then the prose that follows the sample is long enough that it should wrap at eighty columns",
			" */",
		);
		expect(run(input)).toContain(
			lines(
				" * Then the prose that follows the sample is long enough that it should wrap at",
				" * eighty columns.",
			),
		);
	});

	it("keeps a member decorator call inside the example as code", () => {
		const input = lines(
			"/**",
			" * @example",
			" * @di.injectable()",
			" * class Foo {}",
			" * const x = new Foo()",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("starts a bare // @example on its own line after a summary without a period", () => {
		const input = lines(
			"foo();",
			"// Formats the date for display",
			"// @example",
			"// formatDate(new Date())",
			"// formatDate(other)",
			"bar();",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"foo();",
				"/**",
				" * Formats the date for display.",
				" * @example",
				" * formatDate(new Date())",
				" * formatDate(other)",
				" */",
				"bar();",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("ends a merged // example at the next tag", () => {
		const input = lines(
			"foo();",
			"// @example",
			"// foo()",
			"// @returns the count",
			"// of a sentence that reaches",
			"// 10. items",
			"bar();",
		);
		const once = run(input);
		expect(once).toBe(
			lines(
				"foo();",
				"/**",
				" * @example",
				" * foo()",
				" * @returns the count",
				" * of a sentence that reaches 10. items.",
				" */",
				"bar();",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("reflows the prose after a fenced example in a merged // group", () => {
		const input = lines(
			"foo();",
			"// @example",
			"// ```ts",
			"// x",
			"// ```",
			"// A sentence that reaches",
			"// 10. items",
			"bar();",
		);
		const once = run(input);
		expect(once).toContain(
			" * ```\n * A sentence that reaches 10. items.\n */",
		);
		expect(run(once)).toBe(once);
	});

	it("ends an example at a tag indented like its opener", () => {
		const input = lines(
			"/**",
			" *  @example",
			" *  foo()",
			" *  @returns the cached value",
			" *  or undefined",
			" */",
		);
		const once = run(input);
		expect(once).toContain(" * or undefined.\n");
		expect(run(once)).toBe(once);
	});

	it.each([
		["a generic decorator", "@injectable<Foo>()"],
		["a template attribute", '@click="save"'],
	])("keeps %s inside the example as code", (_, decorator) => {
		const input = lines(
			"/**",
			" * @example",
			` * ${decorator}`,
			" * class Foo {}",
			" * const x = new Foo()",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("keeps CSS at-rules inside the example as code", () => {
		const input = lines(
			"/**",
			" * @example",
			" * @media (min-width: 40rem)",
			" * .a { color: red }",
			" * @apply px-2",
			" * .b {}",
			" */",
		);
		expect(run(input)).toBe(input);
	});

	it("starts a captioned // @example on its own line after a summary without a period", () => {
		const input = lines(
			"foo();",
			"// Usage",
			"// @example <caption>Basic</caption>",
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
				" * @example <caption>Basic</caption>",
				" * const a = 1",
				" * const b = 2",
				" */",
				"bar();",
			),
		);
		expect(run(once)).toBe(once);
	});

	it("does not open an example for an @example joined to a // sentence", () => {
		const input = lines(
			"foo();",
			"// Documents the",
			"// @example tag using `foo",
			"//   bar` as a literal value",
			"bar();",
		);
		const once = run(input);
		expect(once).toContain("`foo bar`");
		expect(run(once)).toBe(once);
	});
});
