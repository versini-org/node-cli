import { Logger } from "@node-cli/logger";

export const logger = new Logger({ boring: process.env.NODE_ENV === "test" });

export interface ProcessOptions {
	width: number;
	wrapLineComments: boolean;
	mergeLineComments: boolean;
}

export interface FileResult {
	original: string;
	transformed: string;
	changed: boolean;
}

interface JsDocMatch {
	indent: string;
	body: string;
	start: number;
	end: number;
}

/**
 * Safety guards / limits (defense-in-depth vs pathological or malicious input)
 * Large indentation sequences (e.g. thousands of tabs) aren't meaningful for
 * real source formatting and could be used to inflate processing time if a
 * regex exhibited super-linear behavior. Our pattern is already linear
 * (tempered), but we still cap accepted indentation length to keep work
 * bounded.
 */
const MAX_JSDOC_INDENT = 256; // characters (tabs + spaces)

/**
 * JSDoc block extraction:
 * Previous pattern used a lazy dot-all: ([\s\S]*?) which could, under
 * pathological inputs, produce excessive backtracking. We replaced it with a
 * tempered pattern that advances linearly by never letting the inner part
 * consume a closing '*\/'. This avoids catastrophic behavior while keeping
 * correctness.
 *
 * Reviewer (PR) concern: potential ReDoS on crafted inputs containing many
 * leading tabs then '/**'. Analysis: The inner quantified group
 *   (?:[^*]|\*(?!/))*
 * is unambiguous: on each iteration it consumes exactly one character and can
 * never match the closing sentinel '*\/' because of the negative lookahead. This
 * means the engine proceeds in O(n) time relative to the block body size.
 * There is no nested ambiguous quantifier (e.g. (a+)*, (.*)+, etc.). The only
 * other quantified part ^[\t ]* is a simple character class that is consumed
 * once per line start with no backtracking explosion potential.
 *
 * Defense-in-depth: we still (1) cap processed body length (see below) and
 * (2) cap accepted indentation length (MAX_JSDOC_INDENT) after match to ensure
 * we skip absurdly indented constructs.
 *
 * Pattern explanation:
 *  (^ [\t ]* )    -> capture indentation at start of line (multiline mode)
 *  /\*\*          -> opening delimiter
 *  (              -> capture group 2 body
 *    (?:[^*]      -> any non-* char
 *      |\*(?!/)   -> or a * not followed by /
 *    )*           -> repeated greedily (cannot cross closing *\/)
 *  )
 *  \n?[\t ]*\*\/   -> optional newline + trailing indent + closing *\/
 * Complexity: linear in length of the matched block.
 *
 */
const JSDOC_REGEX = /(^[\t ]*)\/\*\*((?:[^*]|\*(?!\/))*)\n?[\t ]*\*\//gm;

export function diffLines(a: string, b: string): string {
	if (a === b) {
		return "";
	}
	const A = a.split(/\n/);
	const B = b.split(/\n/);
	const out: string[] = [];
	const m = Math.max(A.length, B.length);
	for (let i = 0; i < m; i++) {
		if (A[i] === B[i]) {
			continue;
		}
		if (A[i] !== undefined) {
			out.push(`- ${A[i]}`);
		}
		if (B[i] !== undefined) {
			out.push(`+ ${B[i]}`);
		}
	}
	return out.join("\n");
}

function endsSentence(line: string): boolean {
	return /[.!?](?:['")\]]*)$/.test(line.trim());
}

function needsTerminalPunctuation(line: string): boolean {
	return /[A-Za-z0-9")\]']$/.test(line) && !endsSentence(line);
}

function maybeAddPeriod(line: string): string {
	return needsTerminalPunctuation(line) ? line + "." : line;
}

function normalizeNote(line: string): string {
	return line.replace(/^note:/i, "NOTE:");
}

/**
 * Reflowing collapses runs of whitespace, which would change `a  b` in inline
 * code. Each space of such a run is held as a private-use character (not
 * whitespace, so it neither collapses nor breaks a line) and released once the
 * lines are wrapped. Single spaces stay breakable.
 */
const HELD_SPACE = "\uE000";

function holdCodeSpaces(text: string): string {
	if (text.includes(HELD_SPACE)) {
		return text;
	}
	return text.replace(/`[^`]*`/g, (code) =>
		code.replace(/ {2,}/g, (run) => HELD_SPACE.repeat(run.length)),
	);
}

function releaseCodeSpaces(lines: string[], held: boolean): string[] {
	return held ? lines.map((l) => l.replaceAll(HELD_SPACE, " ")) : lines;
}

/**
 * Splits a paragraph before each 'NOTE: ' that starts a word. A NOTE runs to
 * the next NOTE or the end of the paragraph, not to its first sentence, so the
 * rest of the note stays with it. Inside a NOTE, another 'NOTE: ' starts a new
 * one only after a sentence ends, so a NOTE can mention the marker.
 */
function splitAtNotes(text: string): string[] {
	const segments: string[] = [];
	// `i` is where the current segment starts; `search` skips past non-boundaries.
	let i = 0;
	let search = 0;
	for (;;) {
		const idx = text.indexOf("NOTE: ", search);
		if (idx === -1) {
			segments.push(text.slice(i).trim());
			break;
		}
		search = idx + 6;
		// Not a boundary inside a word ("FOOTNOTE: ") or at the segment start.
		if (idx === i || text[idx - 1] !== " ") {
			continue;
		}
		// Only the tail before `idx` matters, so a long NOTE is not rescanned.
		if (
			text.startsWith("NOTE: ", i) &&
			!/[.!?]['")\]]* $/.test(text.slice(Math.max(i, idx - 16), idx))
		) {
			continue;
		}
		segments.push(text.slice(i, idx).trim());
		i = idx;
	}
	return segments.filter(Boolean);
}

function isListLike(line: string): boolean {
	return /^(?:[-*+] |\d+\. )/.test(line.trim());
}

/**
 * CSS at-rules that can legitimately open a wrapped prose line in a comment
 * describing styles (e.g. "... are registered through the" followed by
 * "@keyframes rule and referenced by name"). None of these names doubles as a
 * JSDoc/TSDoc tag, so a line starting with one of them is sentence
 * continuation, not a tag. At-rules whose name IS also a JSDoc tag (@function,
 * @import, @mixin, @namespace, @property, @return) are deliberately absent so
 * real tags keep working.
 */
const CSS_AT_RULES = new Set([
	"apply",
	"charset",
	"color-profile",
	"container",
	"counter-style",
	"font-face",
	"font-feature-values",
	"font-palette-values",
	"keyframes",
	"layer",
	"media",
	"page",
	"position-try",
	"scope",
	"screen",
	"starting-style",
	"supports",
	"tailwind",
	"view-transition",
]);

function isTagLine(line: string): boolean {
	/**
	 * A JSDoc/TSDoc tag is `@name` (optionally hyphenated) and is never
	 * immediately followed by `/`. The negative lookahead excludes scoped npm
	 * package specifiers like `@auth0/auth0-react` or `@versini/ui-main` that can
	 * legitimately open a wrapped prose line; treating those as tags severs the
	 * sentence and injects a spurious period. CSS at-rules (see CSS_AT_RULES) are
	 * excluded for the same reason.
	 */
	const m = /^@([A-Za-z][\w-]*)(?![\w/-])/.exec(line.trim());
	if (!m) {
		return false;
	}
	return !CSS_AT_RULES.has(m[1].toLowerCase());
}

function isHeadingLike(line: string): boolean {
	const t = line.trim();
	if (!/:$/.test(t) || isTagLine(t)) {
		return false;
	}
	/**
	 * New heuristic: treat as heading only if composed of one or more words that
	 * each start with an uppercase letter (allows Internal IDs with
	 * dashes/underscores too). Examples considered headings: "Overview:",
	 * "Performance Notes:", "API Surface:". Non-headings (treated as sentence
	 * continuation): "tested a little bit differently:", "differently:".
	 */
	return /^[A-Z][A-Za-z0-9_-]*(?: [A-Z][A-Za-z0-9_-]*)*:$/.test(t);
}

function isCodeFence(line: string): boolean {
	return /^```/.test(line.trim());
}

function isVisuallyIndentedCode(line: string): boolean {
	return /^\s{2,}\S/.test(line);
}

/**
 * Detects linter/tool directive comments that should be left untouched. These
 * include ESLint, Biome, Prettier, TypeScript, StyleLint, and coverage tool
 * directives.
 */
function isLinterDirective(text: string): boolean {
	const trimmed = text.trim();
	return /^(@?(?:ts-ignore|ts-expect-error|ts-nocheck|ts-check)|eslint|biome-ignore|prettier-ignore|stylelint-(?:disable|enable)|c8 ignore|v8 ignore|istanbul ignore|tsc:|type:|@ts-)/i.test(
		trimmed,
	);
}

/**
 * A wrapped line that opens with a list marker, code fence, tag, or NOTE (or,
 * in a // comment, a linter directive) is read as that structure on the next
 * pass, which changes the comment (a stray period, a fake list item). `line` is
 * the full rest of the text, since a list marker needs words after it.
 */
function opensStructure(line: string, lineComment: boolean): boolean {
	return (
		isListLike(line) ||
		isCodeFence(line) ||
		isTagLine(line) ||
		/^note:(?: |$)/i.test(line) ||
		(lineComment && isLinterDirective(line))
	);
}

function wrapWords(text: string, width: number, lineComment = false): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let cur = "";
	for (let i = 0; i < words.length; i++) {
		const w = words[i];
		if (!cur.length) {
			cur = w;
			continue;
		}
		if (cur.length + 1 + w.length <= width) {
			cur += " " + w;
			continue;
		}
		// Carry words down until the new line no longer opens a structure.
		const rest = words.slice(i).join(" ");
		let carried = "";
		while (opensStructure(carried + rest, lineComment) && cur.includes(" ")) {
			const cut = cur.lastIndexOf(" ");
			carried = `${cur.slice(cut + 1)} ${carried}`;
			cur = cur.slice(0, cut);
		}
		const next = `${carried}${w}`;
		if (opensStructure(carried + rest, lineComment)) {
			cur += ` ${next}`;
		} else {
			lines.push(cur);
			cur = next;
		}
	}
	if (cur) {
		lines.push(cur);
	}
	/**
	 * A wrapped line that reads as a heading ("Default Options:") would end the
	 * paragraph on the next pass, so join it to a neighbor.
	 */
	for (let k = 0; k < lines.length && lines.length > 1; k++) {
		if (isHeadingLike(lines[k])) {
			const into = k + 1 < lines.length ? k : k - 1;
			lines.splice(into, 2, `${lines[into]} ${lines[into + 1]}`);
			k = into - 1;
		}
	}
	return lines.length ? lines : [""];
}

function buildJsDoc(indent: string, rawBody: string, width: number): string {
	let lines = rawBody.split(/\n/).map((l) => l.replace(/^\s*\*? ?/, ""));
	/**
	 * Remove a single leading blank line (artifact of regex capture starting after
	 * /**) if content follows.
	 */
	while (
		lines.length > 1 &&
		lines[0].trim() === "" &&
		lines.some((l) => l.trim() !== "")
	) {
		lines = lines.slice(1);
	}
	/**
	 * Trailing blank handling: keep a single trailing blank only if there are
	 * multiple paragraphs (i.e., an internal blank separator exists). If the doc
	 * is a single paragraph, drop the trailing blank to avoid an extra standalone
	 * '*' line before the closing delimiter.
	 */
	if (lines.length > 1 && lines[lines.length - 1].trim() === "") {
		const internalBlank = lines.slice(0, -1).some((l) => l.trim() === "");
		if (!internalBlank) {
			lines = lines.slice(0, -1);
		}
	}
	const out: string[] = [];
	let para: string[] = [];
	let inFence = false;
	const prefix = indent + " * ";
	const avail = Math.max(10, width - prefix.length);

	/**
	 * Detect structured explanatory / regex description blocks where we want to
	 * preserve each original line verbatim (no paragraph joining or sentence
	 * period insertion) to avoid altering carefully aligned or enumerated lines.
	 */
	const structured = lines.some(
		(l) =>
			/->/.test(l) || /(\(\?:|\*\/)/.test(l) || /Pattern explanation:/i.test(l),
	);
	if (structured) {
		for (const raw of lines) {
			const trimmed = raw.trimEnd();
			if (trimmed === "") {
				// ensure a blank line represented by a lone '*'.
				if (
					out.length === 0 ||
					/^(?:\s*\*\s*)$/.test(out[out.length - 1]) === false
				) {
					out.push(prefix.trimEnd());
				}
				continue;
			}
			out.push(prefix + normalizeNote(trimmed));
		}
		// Consistent style: space before closing */
		return `${indent}/**\n${out.join("\n")}\n${indent} */`;
	}

	function flush(): void {
		if (!para.length) {
			return;
		}
		const joined = para.join(" ");
		let text = holdCodeSpaces(joined);
		const held = text !== joined;
		text = text.replace(/\s+/g, " ").trim();
		text = normalizeNote(text);
		text = maybeAddPeriod(text);
		const pieces = splitAtNotes(text);
		for (const piece of pieces) {
			/**
			 * Each piece starts its own line, so it gets the NOTE casing and the period
			 * that the next pass would give it.
			 */
			const wrapped = wrapWords(maybeAddPeriod(normalizeNote(piece)), avail);
			for (const l of releaseCodeSpaces(wrapped, held)) {
				out.push(prefix + l);
			}
		}
		para = [];
	}

	for (const raw of lines) {
		const trimmed = raw.trimEnd();
		if (isCodeFence(trimmed)) {
			flush();
			inFence = !inFence;
			out.push(prefix + trimmed);
			continue;
		}
		if (inFence) {
			/**
			 * Inside a code fence we preserve content verbatim, but for a blank line we
			 * still prefer the canonical ' *' (no trailing space after the star) instead
			 * of ' * '.
			 */
			if (trimmed === "") {
				out.push(prefix.trimEnd());
			} else {
				out.push(prefix + trimmed);
			}
			continue;
		}
		if (
			trimmed === "" ||
			isListLike(trimmed) ||
			isTagLine(trimmed) ||
			isHeadingLike(trimmed) ||
			isVisuallyIndentedCode(raw) ||
			/^NOTE: /.test(normalizeNote(trimmed))
		) {
			flush();
			if (trimmed === "") {
				if (
					out.length === 0 ||
					/^(?:\s*\*\s*)$/.test(out[out.length - 1]) === false
				) {
					out.push(prefix.trimEnd());
				}
			} else {
				const noteLine = normalizeNote(trimmed);
				if (/^NOTE: /.test(noteLine)) {
					// A NOTE starts a paragraph and runs until the next boundary.
					para.push(noteLine);
				} else {
					out.push(prefix + noteLine);
				}
			}
			continue;
		}
		para.push(trimmed);
	}
	flush();
	/**
	 * A fence left open runs to the closing delimiter, and each pass would add one
	 * more trailing blank line inside it: keep only one.
	 */
	while (
		inFence &&
		out.length > 1 &&
		out[out.length - 1] === prefix.trimEnd() &&
		out[out.length - 2] === prefix.trimEnd()
	) {
		out.pop();
	}
	/**
	 * Style: ensure a space precedes the closing *\/ for consistency with blocks
	 * generated elsewhere in this tool (merged line comment groups). Previously we
	 * emitted `${indent}*\/` which produced an off-by-one visual alignment.
	 */
	return `${indent}/**\n${out.join("\n")}\n${indent} */`;
}

function reflowJsDocBlocks(
	content: string,
	width: number,
): { content: string; blocks: number } {
	JSDOC_REGEX.lastIndex = 0;
	const blocks: JsDocMatch[] = [];
	let m: RegExpExecArray | null = JSDOC_REGEX.exec(content);
	while (m) {
		const indent = m[1] || "";
		const body = m[2] || "";
		// Body length guard protects against extremely large comment blocks.
		if (body.length <= 500_000 && indent.length <= MAX_JSDOC_INDENT) {
			blocks.push({
				indent,
				body,
				start: m.index,
				end: m.index + m[0].length,
			});
		}
		m = JSDOC_REGEX.exec(content);
	}
	if (!blocks.length) {
		return { content, blocks: 0 };
	}
	let delta = 0;
	let out = content;
	for (const b of blocks) {
		const original = out.slice(b.start + delta, b.end + delta);
		const built = buildJsDoc(b.indent, b.body, width);
		if (original !== built) {
			out = out.slice(0, b.start + delta) + built + out.slice(b.end + delta);
			delta += built.length - original.length;
		}
	}
	return { content: out, blocks: blocks.length };
}

function wrapLineComments(
	content: string,
	width: number,
): { content: string; applied: boolean } {
	const lines = content.split(/\n/);
	let changed = false;
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		const m = /^(\s*)\/\/( ?)(.*)$/.exec(line);
		if (!m || /^\/\/\//.test(line)) {
			out.push(line);
			i++;
			continue;
		}
		/**
		 * Collect a group of consecutive simple // lines (not triple slash) that are
		 * eligible to be wrapped/merged. We stop before directive lines, URLs, or
		 * triple-slash (reference) comments to avoid altering those semantics.
		 */
		const group: { raw: string; indent: string; body: string }[] = [];
		let j = i;
		while (j < lines.length) {
			const gm = /^(\s*)\/\/ ?(.*)$/.exec(lines[j]);
			if (!gm || /^\/\/\//.test(lines[j])) {
				break;
			}
			const body = gm[2];
			if (isLinterDirective(body) || /https?:\/\//.test(body)) {
				break; // stop group before directives/URLs; process current line normally
			}
			group.push({ raw: lines[j], indent: gm[1], body });
			j++;
		}
		if (group.length <= 1) {
			// Single line: existing logic (add period if needed).
			const indent = m[1];
			const body = m[3];
			if (isLinterDirective(body) || /https?:\/\//.test(body)) {
				out.push(line);
				i++;
				continue;
			}
			const prefix = indent + "// ";
			const avail = Math.max(10, width - prefix.length);
			let text = holdCodeSpaces(body);
			const held = text !== body;
			text = normalizeNote(text.replace(/\s+/g, " ").trim());
			text = maybeAddPeriod(text);
			const wrapped = releaseCodeSpaces(wrapWords(text, avail, true), held).map(
				(w) => prefix + w,
			);
			if (wrapped.join("\n") !== line) {
				changed = true;
			}
			out.push(...wrapped);
			i++;
			continue;
		}
		/**
		 * Multi-line group: only add terminal punctuation (a single period) to the
		 * final logical sentence if needed. Earlier lines are treated as soft wraps
		 * of the same paragraph; adding periods to each would create spurious
		 * sentence boundaries.
		 */
		for (let k = 0; k < group.length; k++) {
			const { indent, body } = group[k];
			const prefix = indent + "// ";
			const avail = Math.max(10, width - prefix.length);
			let text = holdCodeSpaces(body);
			const held = text !== body;
			text = normalizeNote(text.replace(/\s+/g, " ").trim());
			if (k === group.length - 1 && !/:$/.test(text.trim())) {
				text = maybeAddPeriod(text);
			}
			const wrapped = releaseCodeSpaces(wrapWords(text, avail, true), held).map(
				(w) => prefix + w,
			);
			if (wrapped.join("\n") !== group[k].raw) {
				changed = true;
			}
			out.push(...wrapped);
		}
		i = j;
	}
	return { content: out.join("\n"), applied: changed };
}

function mergeLineCommentGroups(content: string): {
	content: string;
	merged: boolean;
} {
	const lines = content.split(/\n/);
	const out: string[] = [];
	let i = 0;
	let merged = false;

	while (i < lines.length) {
		if (/^\s*\/\//.test(lines[i]) && !/^\s*\/\/\//.test(lines[i])) {
			const prev = i > 0 ? lines[i - 1] : "";
			const prevTrim = prev.trim();
			const contextEligible = prevTrim === "" || /[{}\]),;]$/.test(prevTrim);
			if (!contextEligible) {
				// Keep the whole run of // lines, so no group starts mid-comment.
				do {
					out.push(lines[i]);
					i++;
				} while (
					i < lines.length &&
					/^\s*\/\//.test(lines[i]) &&
					!/^\s*\/\/\//.test(lines[i])
				);
				continue;
			}
			const group: { indent: string; text: string }[] = [];
			let j = i;
			while (j < lines.length) {
				const lm = /^(\s*)\/\/ ?(.*)$/.exec(lines[j]);
				if (!lm || /^\s*\/\/\//.test(lines[j])) {
					break;
				}
				const txt = lm[2];
				if (
					/license|copyright/i.test(txt) ||
					/https?:\/\//.test(txt) ||
					isLinterDirective(txt)
				) {
					break; // do not merge directive / license groups
				}
				group.push({ indent: lm[1], text: txt });
				j++;
			}
			if (group.length >= 2) {
				/**
				 * Structured explanatory blocks: now we CONVERT them into a multi-line JSDoc block
				 * while preserving each original line (instead of merging into a single paragraph).
				 * We must escape any raw '*\/' inside the body to avoid premature termination.
				 * Definition of structured:
				 * presence of arrows (->), regex tokens (?:, *\/), or the phrase 'Pattern explanation:'.
				 */
				const structured = group.some(
					(g) =>
						/->/.test(g.text) ||
						/(\(\?:|\*\/)/.test(g.text) ||
						/Pattern explanation:/i.test(g.text),
				);
				if (structured) {
					const indent = group[0].indent;
					out.push(`${indent}/**`);
					for (const ln of group) {
						// Escape closing sentinel inside content.
						const safe = ln.text.replace(/\*\//g, "*\\/");
						out.push(`${indent} * ${safe}`);
					}
					out.push(`${indent} */`);
					merged = true;
					i = j;
					continue;
				}
				const indent = group[0].indent;
				merged = true;
				/**
				 * One JSDoc line per // line: the reflow that runs next joins the
				 * paragraphs and keeps list items, NOTE lines and blank lines, which a
				 * joined group would lose.
				 */
				out.push(`${indent}/**`);
				for (const g of group) {
					const text = g.text.trim();
					out.push(text ? `${indent} * ${text}` : `${indent} *`);
				}
				out.push(`${indent} */`);
				i = j;
				continue;
			}
		}
		out.push(lines[i]);
		i++;
	}
	return { content: out.join("\n"), merged };
}

export function parseAndTransformComments(
	input: string,
	options: ProcessOptions,
): FileResult {
	let working = input;
	if (options.mergeLineComments) {
		const m = mergeLineCommentGroups(working);
		working = m.content;
	}
	const js = reflowJsDocBlocks(working, options.width);
	working = js.content;
	if (options.wrapLineComments) {
		const w = wrapLineComments(working, options.width);
		working = w.content;
		/**
		 * Wrapping can split one long // line into a group that merging takes, so
		 * merge again now instead of on the next run.
		 */
		if (options.mergeLineComments && w.applied) {
			working = mergeLineCommentGroups(working).content;
			working = reflowJsDocBlocks(working, options.width).content;
		}
	}
	return { original: input, transformed: working, changed: working !== input };
}
