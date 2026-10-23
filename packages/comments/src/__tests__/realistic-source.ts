import fc from "fast-check";

/**
 * Source files with comments shaped like real prose: sentences that start with
 * a capital and usually end with punctuation, NOTE only at the start of a
 * sentence and never empty, tags, lists, and headings on their own lines, code
 * fences closed, and directives on their own // line. Mid-sentence tokens that
 * the heuristics branch on (dashes, scoped packages, CSS at-rules, URLs) still
 * appear, because real prose has them.
 */

const word = fc.oneof(
	{ weight: 10, arbitrary: fc.stringMatching(/^[a-z]{1,10}$/) },
	// A dash is the mid-sentence token most likely to land at a wrap.
	{ weight: 2, arbitrary: fc.constant("-") },
	{
		weight: 1,
		arbitrary: fc.constantFrom(
			"@auth0/auth0-react",
			"@media",
			"https://example.com/docs/retry.html",
			"`run()`",
			"(for example)",
			"API",
			"v2",
			"#123",
			"10",
		),
	},
);
const words = (min: number, max: number) =>
	fc.array(word, { minLength: min, maxLength: max }).map((w) => w.join(" "));
const capital = fc
	.stringMatching(/^[a-z]{1,10}$/)
	.map((w) => w[0].toUpperCase() + w.slice(1));

const sentence = fc
	.tuple(capital, words(1, 12), fc.constantFrom(".", ".", ".", "!", "?", ""))
	.map(([first, rest, end]) => `${first} ${rest}${end}`);
const noteSentence = sentence.map((s) => `NOTE: ${s}`);
const paragraph = fc
	.array(fc.oneof({ weight: 4, arbitrary: sentence }, noteSentence), {
		minLength: 1,
		maxLength: 4,
	})
	.map((s) => s.join(" "));

// Splits prose into lines of `size` words, as an author wrapping by hand would.
const handWrapped = fc
	.tuple(paragraph, fc.integer({ min: 4, max: 30 }))
	.map(([p, size]) => {
		const all = p.split(" ");
		const lines: string[] = [];
		for (let i = 0; i < all.length; i += size) {
			lines.push(all.slice(i, i + size).join(" "));
		}
		return lines;
	});

const jsDocBlock = fc.oneof(
	{ weight: 4, arbitrary: handWrapped },
	fc.array(
		words(1, 8).map((w) => `- ${w}`),
		{ minLength: 1, maxLength: 4 },
	),
	fc.array(
		words(1, 8).map((w) => `1. ${w}`),
		{ minLength: 1, maxLength: 3 },
	),
	fc
		.tuple(fc.constantFrom("Overview:", "Performance Notes:"), handWrapped)
		.map(([h, p]) => [h, ...p]),
	fc.constant(["```ts", "const value = run();", "```"]),
);
const tags = fc.array(
	fc.oneof(
		words(1, 8).map((w) => `@param name ${w}`),
		words(1, 8).map((w) => `@returns ${w}`),
	),
	{ maxLength: 2 },
);

const indent = fc.constantFrom("", "\t", "\t\t");
const jsDoc = fc
	.tuple(indent, fc.array(jsDocBlock, { minLength: 1, maxLength: 3 }), tags)
	.map(([i, blocks, t]) => {
		const body = blocks.flatMap((b, k) => (k ? ["", ...b] : b)).concat(t);
		return [`${i}/**`, ...body.map((l) => `${i} * ${l}`.trimEnd()), `${i} */`];
	});
const lineComment = fc
	.tuple(indent, handWrapped)
	.map(([i, ls]) => ls.map((l) => `${i}// ${l}`));
const directive = indent.map((i) => [
	`${i}// biome-ignore lint/suspicious/noExplicitAny: legacy API`,
]);
const code = fc
	.tuple(indent, fc.constantFrom("const x = 1;", "if (a) {", "}", "return x;"))
	.map(([i, c]) => [`${i}${c}`]);

export const realisticSource = fc
	.array(
		fc.oneof(
			{ weight: 2, arbitrary: jsDoc },
			{ weight: 2, arbitrary: lineComment },
			directive,
			{ weight: 3, arbitrary: code },
			fc.constant([""]),
		),
		{ maxLength: 8 },
	)
	.map((chunks) => chunks.flat().join("\n"));

export const realisticWidth = fc.integer({ min: 60, max: 120 });
