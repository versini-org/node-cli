import fc from "fast-check";
import { describe, it } from "vitest";
import { type ProcessOptions, parseAndTransformComments } from "../lib.js";
import { realisticSource, realisticWidth } from "./realistic-source.js";

/**
 * Tokens that the heuristics in lib.ts branch on, mixed with random words so
 * the generator reaches tags, headings, lists, fences, NOTE splitting,
 * directives, URLs, structured blocks, and merge eligibility.
 */
const token = fc.oneof(
	fc.constantFrom(
		"the",
		"Overview:",
		"NOTE:",
		"note:",
		"aNOTE:",
		"@param",
		"@auth0/auth0-react",
		"@media",
		"-",
		"1.",
		"```",
		"->",
		"(?:",
		"done.",
		"end!",
		"why?",
		"foo)",
		"https://example.com/a.html",
		"biome-ignore",
		"license",
		"Pattern explanation:",
		"`a  b`",
		"`",
	),
	fc.stringMatching(/^[a-zA-Z]{1,12}$/),
);
const text = fc.array(token, { maxLength: 12 }).map((w) => w.join(" "));
const indent = fc.constantFrom("", "\t", "  ");
// Code lines never contain comment markers, so stripComments() below is exact.
const code = fc.constantFrom(
	"}",
	"const x = 1;",
	"foo(),",
	"return [",
	"]",
	"if (a) {",
);
const line = fc.oneof(
	fc.tuple(indent, text).map(([i, s]) => `${i}// ${s}`),
	fc.tuple(indent, code, text).map(([i, c, s]) => `${i}${c} // ${s}`),
	fc
		.tuple(indent, fc.array(text, { maxLength: 4 }))
		.map(
			([i, ls]) =>
				`${i}/**\n${ls.map((l) => `${i} * ${l}`).join("\n")}\n${i} */`,
		),
	fc.tuple(indent, text).map(([i, s]) => `${i}/** ${s} */`),
	fc.constant(""),
	code,
);
const source = fc.array(line, { maxLength: 10 }).map((ls) => ls.join("\n"));
const options: fc.Arbitrary<ProcessOptions> = fc.record({
	width: fc.integer({ min: 20, max: 120 }),
	wrapLineComments: fc.boolean(),
	mergeLineComments: fc.boolean(),
});

const run = (input: string, opts: ProcessOptions) =>
	parseAndTransformComments(input, opts).transformed;

function stripComments(input: string): string {
	return input
		.replace(/\/\*\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "")
		.split("\n")
		.map((l) => l.trimEnd())
		.filter(Boolean)
		.join("\n");
}

/**
 * The words of every comment, ignoring delimiters, a trailing period (the tool
 * adds those), and case (the tool upper-cases "note:").
 */
function commentWords(input: string): string {
	return input
		.replace(/\/\*\*|\*\/|\/\//g, " ")
		.replace(/^\s*\*/gm, " ")
		.split(/\s+/)
		.map((w) => w.replace(/\.+$/, "").toLowerCase())
		.filter((w) => w && w !== "*")
		.sort()
		.join(" ");
}

const RUNS = { numRuns: 1000 };

describe("parseAndTransformComments properties", () => {
	/**
	 * The `changed` flag drives `--dry-run` exit codes in CI, so it must be true
	 * exactly when the output differs from the input. Mutant: `changed: true` in
	 * parseAndTransformComments; fails after 1 run.
	 */
	it("reports changed exactly when the output differs", () => {
		fc.assert(
			fc.property(source, options, (input, opts) => {
				const res = parseAndTransformComments(input, opts);
				return (
					res.original === input && res.changed === (res.transformed !== input)
				);
			}),
			RUNS,
		);
	});

	/**
	 * It is a comment tool (README: "reflow, normalize, wrap, and merge
	 * comments"), so code outside comments must come out byte for byte. Mutant:
	 * `out.push(line)` → `out.push(line.trim())` for non-comment lines in
	 * wrapLineComments; fails after 8 runs.
	 */
	it("never changes code outside comments", () => {
		fc.assert(
			fc.property(source, options, (input, opts) => {
				return stripComments(run(input, opts)) === stripComments(input);
			}),
			RUNS,
		);
	});

	/**
	 * A second pass changes nothing. Stated intent: the unit test "is idempotent
	 * (second pass unchanged)", and `comments --dry-run` in CI fails if a file
	 * still has changes after a fix. Scope (decided 2026-10-23): realistic prose
	 * only (see realistic-source.ts); degenerate input such as an empty or stacked
	 * "note:" can still need two passes. Mutants: skip the merge after wrapping
	 * (fails after 137 runs), disable the wrap guard (red in 9 of 10 runs).
	 */
	it("is idempotent on realistic prose", () => {
		const realisticOptions = fc.record({
			width: realisticWidth,
			wrapLineComments: fc.boolean(),
			mergeLineComments: fc.boolean(),
		});
		fc.assert(
			fc.property(realisticSource, realisticOptions, (input, opts) => {
				const once = run(input, opts);
				return run(once, opts) === once;
			}),
			RUNS,
		);
	});

	/**
	 * Reflowing rearranges words; it never splits, drops, or invents one (a URL or
	 * a regex token must survive whole). Mutant: drop the word-boundary check in
	 * splitAtNotes, so "aNOTE:" splits; fails after 16 runs.
	 */
	it("keeps every comment word intact", () => {
		fc.assert(
			fc.property(source, options, (input, opts) => {
				return commentWords(run(input, opts)) === commentWords(input);
			}),
			RUNS,
		);
	});
});
