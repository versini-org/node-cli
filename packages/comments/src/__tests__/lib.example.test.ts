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
});
