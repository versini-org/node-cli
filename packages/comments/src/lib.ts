import { Logger } from "@node-cli/logger";

export const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

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

// JSDoc block extraction:
// Previous pattern used a lazy dot-all: ([\s\S]*?) which could, under
// pathological inputs, produce excessive backtracking. We replace it with a
// tempered pattern that advances linearly by never letting the inner part
// consume a closing '*/'. This avoids catastrophic behavior while keeping
// correctness.
// Pattern explanation:
//  (^ [\t ]* )    -> capture indentation at start of line (multiline mode)
//  /\*\*          -> opening delimiter
//  (              -> capture group 2 body
//    (?:[^*]      -> any non-* char
//      |\*(?!/)   -> or a * not followed by /
//    )*           -> repeated greedily (cannot cross closing */)
//  )
//  \n?[\t ]*\*/   -> optional newline + trailing indent + closing */
// The greedy repetition is safe because the inner alternatives are mutually
// exclusive and each consumes at least one char without overlapping on the
// closing sentinel.
const JSDOC_REGEX = /(^[\t ]*)\/\*\*((?:[^*]|\*(?!\/))*)\n?[\t ]*\*\//gm;

// Simple line based diff (naive) used only for dry-run messaging.
export function diffLines(a: string, b: string): string {
	if (a === b) {
		return "";
	}
	const aLines = a.split(/\n/);
	const bLines = b.split(/\n/);
	const out: string[] = [];
	const max = Math.max(aLines.length, bLines.length);
	for (let i = 0; i < max; i++) {
		const A = aLines[i];
		const B = bLines[i];
		if (A === B) {
			continue;
		}
		if (A !== undefined) {
			out.push(`- ${A}`);
		}
		if (B !== undefined) {
			out.push(`+ ${B}`);
		}
	}
	return out.join("\n");
}

function endsSentence(line: string): boolean {
	return /[.!?](?:['")\]]*)$/.test(line.trim());
}

function needsTerminalPunctuation(line: string): boolean {
	return /[A-Za-z0-9"')\]]$/.test(line) && !endsSentence(line);
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
	return /:$/.test(t) && !isTagLine(t);
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
	let current = "";
	for (const w of words) {
		if (!current.length) {
			current = w;
			continue;
		}
		if (current.length + 1 + w.length <= width) {
			current += " " + w;
		} else {
			lines.push(current);
			current = w;
		}
	}
	if (current) {
		lines.push(current);
	}
	return lines.length ? lines : [""];
}

function reflowJsDocBlocks(
	content: string,
	width: number,
): { content: string; blocks: number } {
	JSDOC_REGEX.lastIndex = 0; // ensure fresh scan
	let match: RegExpExecArray | null;
	const blocks: JsDocMatch[] = [];
	for (
		match = JSDOC_REGEX.exec(content);
		match;
		match = JSDOC_REGEX.exec(content)
	) {
		// Safety guard: skip extremely large bodies (> 500k chars) to avoid excessive memory work.
		if (match[2].length > 500_000) {
			continue;
		}
		blocks.push({
			indent: match[1] || "",
			body: match[2] || "",
			start: match.index,
			end: match.index + match[0].length,
		});
	}
	if (!blocks.length) {
		return { content, blocks: 0 };
	}
	let offset = 0;
	let result = content;
	for (const b of blocks) {
		const original = result.slice(b.start + offset, b.end + offset);
		const transformed = buildJsDoc(b.indent, b.body, width);
		if (original !== transformed) {
			result =
				result.slice(0, b.start + offset) +
				transformed +
				result.slice(b.end + offset);
			offset += transformed.length - original.length;
		}
	}
	return { content: result, blocks: blocks.length };
}

function buildJsDoc(indent: string, rawBody: string, width: number): string {
	const lines = rawBody.split(/\n/).map((l) => l.replace(/^\s*\*? ?/, ""));
	const out: string[] = [];
	let para: string[] = [];
	let inFence = false;
	const linePrefix = indent + " * ";
	const avail = Math.max(10, width - linePrefix.length);
	function flushParagraph() {
		if (!para.length) {
			return;
		}
		let text = para.join(" ").replace(/\s+/g, " ").trim();
		text = normalizeNote(text);
		text = maybeAddPeriod(text);
		for (const w of wrapWords(text, avail)) {
			out.push(linePrefix + w);
		}
		para = [];
	}
	for (const raw of lines) {
		const trimmed = raw.trimEnd();
		if (isCodeFence(trimmed)) {
			flushParagraph();
			inFence = !inFence;
			out.push(linePrefix + trimmed);
			continue;
		}
		if (inFence) {
			out.push(linePrefix + trimmed);
			continue;
		}
		if (
			trimmed === "" ||
			isListLike(trimmed) ||
			isTagLine(trimmed) ||
			isHeadingLike(trimmed) ||
			isVisuallyIndentedCode(raw)
		) {
			flushParagraph();
			if (trimmed === "") {
				// Avoid consecutive blank lines inside JSDoc.
				if (
					out.length === 0 ||
					/^(?:\s*\*\s*)$/.test(out[out.length - 1]) === false
				) {
					out.push(linePrefix.trimEnd());
				}
			} else {
				out.push(linePrefix + normalizeNote(trimmed));
			}
			continue;
		}
		para.push(trimmed);
	}
	flushParagraph();
	return `${indent}/**\n${out.join("\n")}\n${indent}*/`;
}

function wrapLineComments(
	content: string,
	width: number,
): { content: string; applied: boolean } {
	const lines = content.split(/\n/);
	let changed = false;
	const out: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const m = /^([\t ]*)\/\/( ?)(.*)$/.exec(line);
		if (!m || /^\/\/\//.test(line)) {
			out.push(line);
			continue;
		}
		const indent = m[1];
		const body = m[3];
		if (/^(@|eslint|ts-ignore)/.test(body) || /https?:\/\//.test(body)) {
			out.push(line);
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
			// Enforce FR-13: previous line must be blank or end with { or }
			const prev = i > 0 ? lines[i - 1] : "";
			const prevTrim = prev.trim();
			const contextEligible = prevTrim === "" || /[{}]$/.test(prevTrim);
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
					break; // abort group merge
				}
				group.push({ indent: lm[1], text: txt });
				j++;
			}
			if (group.length >= 2) {
				merged = true;
				const indent = group[0].indent;
				const para = group
					.map((g) => normalizeNote(g.text.trim()))
					.map((g, idx, arr) =>
						idx === arr.length - 1 ? maybeAddPeriod(g) : maybeAddPeriod(g),
					)
					.join(" ");
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
		const merged = mergeLineCommentGroups(working);
		working = merged.content;
	}
	const jsdoc = reflowJsDocBlocks(working, options.width);
	working = jsdoc.content;
	if (options.wrapLineComments) {
		const wrapped = wrapLineComments(working, options.width);
		working = wrapped.content;
	}
	return {
		original: input,
		transformed: working,
		changed: working !== input,
	};
}
