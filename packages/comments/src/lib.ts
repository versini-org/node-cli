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

function isListLike(line: string): boolean {
	return /^(?:[-*+] |\d+\. )/.test(line.trim());
}

function isTagLine(line: string): boolean {
	return /^@/.test(line.trim());
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

function wrapWords(text: string, width: number): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let cur = "";
	for (const w of words) {
		if (!cur.length) {
			cur = w;
			continue;
		}
		if (cur.length + 1 + w.length <= width) {
			cur += " " + w;
		} else {
			lines.push(cur);
			cur = w;
		}
	}
	if (cur) {
		lines.push(cur);
	}
	return lines.length ? lines : [""];
}

function buildJsDoc(indent: string, rawBody: string, width: number): string {
	let lines = rawBody.split(/\n/).map((l) => l.replace(/^\s*\*? ?/, ""));
	// Remove a single leading blank line (artifact of regex capture starting after
	// /**) if content follows.
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
		let text = para.join(" ").replace(/\s+/g, " ").trim();
		text = normalizeNote(text);
		text = maybeAddPeriod(text);
		for (const l of wrapWords(text, avail)) {
			out.push(prefix + l);
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
			out.push(prefix + trimmed);
			continue;
		}
		if (
			trimmed === "" ||
			isListLike(trimmed) ||
			isTagLine(trimmed) ||
			isHeadingLike(trimmed) ||
			isVisuallyIndentedCode(raw)
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
				out.push(prefix + normalizeNote(trimmed));
			}
			continue;
		}
		para.push(trimmed);
	}
	flush();
	// Style: ensure a space precedes the closing */ for consistency with blocks
	// generated elsewhere in this tool (merged line comment groups). Previously
	// we emitted `${indent}*/` which produced an off-by-one visual alignment.
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
		 * eligible.
		 */
		const group: { raw: string; indent: string; body: string }[] = [];
		let j = i;
		while (j < lines.length) {
			const gm = /^(\s*)\/\/ ?(.*)$/.exec(lines[j]);
			if (!gm || /^\/\/\//.test(lines[j])) {
				break;
			}
			const body = gm[2];
			if (/^(@|eslint|ts-ignore)/.test(body) || /https?:\/\//.test(body)) {
				break; // stop group before directives/URLs; process current line normally
			}
			group.push({ raw: lines[j], indent: gm[1], body });
			j++;
		}
		if (group.length <= 1) {
			// Single line: existing logic (add period if needed).
			const indent = m[1];
			const body = m[3];
			if (/^(@|eslint|ts-ignore)/.test(body) || /https?:\/\//.test(body)) {
				out.push(line);
				i++;
				continue;
			}
			const prefix = indent + "// ";
			const avail = Math.max(10, width - prefix.length);
			let text = body.replace(/\s+/g, " ").trim();
			text = normalizeNote(text);
			text = maybeAddPeriod(text);
			const wrapped = wrapWords(text, avail).map((w) => prefix + w);
			if (wrapped.join("\n") !== line) {
				changed = true;
			}
			out.push(...wrapped);
			i++;
			continue;
		}
		/**
		 * Multi-line group: only add terminal punctuation (period) to final line if
		 * needed. Other lines are normalized for NOTE but left without forced
		 * punctuation.
		 */
		for (let k = 0; k < group.length; k++) {
			const { indent, body } = group[k];
			const prefix = indent + "// ";
			const avail = Math.max(10, width - prefix.length);
			let text = body.replace(/\s+/g, " ").trim();
			text = normalizeNote(text);
			if (k === group.length - 1 && !/:$/.test(text.trim())) {
				text = maybeAddPeriod(text);
			}
			const wrapped = wrapWords(text, avail).map((w) => prefix + w);
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

	function qualifiesExplanatoryAfterStatement(start: number): boolean {
		// Peek ahead to collect consecutive // lines (excluding triple slash).
		const collected: string[] = [];
		for (let k = start; k < lines.length; k++) {
			const lm = /^(\s*)\/\/( ?)(.*)$/.exec(lines[k]);
			if (!lm || /^\/\/\//.test(lines[k])) {
				break;
			}
			const body = lm[3];
			if (/^(@|eslint|ts-ignore)/.test(body) || /https?:\/\//.test(body)) {
				break;
			}
			collected.push(body.trim());
		}
		if (collected.length < 4) {
			return false; // require minimum size
		}
		if (!/^[A-Z]/.test(collected[0])) {
			return false; // start with capitalized sentence
		}
		/**
		 * Avoid matching directive-like or list-lists: require at least one line with
		 * a space (a sentence).
		 */
		return collected.some((c) => /\s/.test(c));
	}
	while (i < lines.length) {
		if (/^\s*\/\//.test(lines[i]) && !/^\s*\/\/\//.test(lines[i])) {
			const prev = i > 0 ? lines[i - 1] : "";
			const prevTrim = prev.trim();
			let contextEligible = prevTrim === "" || /[{}]$/.test(prevTrim);
			/**
			 * Additional heuristic: allow large explanatory group after a statement
			 * ending with ';' (but not inline trailing comment scenario) when it
			 * qualifies as explanatory.
			 */
			if (
				!contextEligible &&
				/;\s*$/.test(prevTrim) &&
				qualifiesExplanatoryAfterStatement(i)
			) {
				contextEligible = true;
			}
			if (!contextEligible) {
				out.push(lines[i]);
				i++;
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
					/eslint|ts-ignore/.test(txt)
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
				 * We only want to add terminal punctuation once at the end of the merged
				 * paragraph, not after every original line (which can create spurious
				 * periods mid-sentence when lines were simple wraps). We also avoid
				 * appending a period if the final line ends with a colon introducing a
				 * list.
				 */
				const norm = group.map((g) => normalizeNote(g.text.trim()));
				// Determine index of last non-empty line.
				let lastIdx = norm.length - 1;
				while (lastIdx > 0 && norm[lastIdx].trim() === "") {
					lastIdx--;
				}
				for (let k = 0; k < norm.length; k++) {
					if (k === lastIdx) {
						const ln = norm[k];
						if (!/:$/.test(ln.trim())) {
							norm[k] = maybeAddPeriod(ln);
						}
					}
				}
				const para = norm.join(" ").replace(/\s+/g, " ").trim();
				out.push(`${indent}/**`);
				out.push(`${indent} * ${para}`);
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
	}
	return { original: input, transformed: working, changed: working !== input };
}
