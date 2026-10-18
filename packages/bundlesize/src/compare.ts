import { DEFAULT_HEADER, DEFAULT_THRESHOLD } from "./defaults.js";

/**
 * One measured entry, in the shape `size-limit --json` prints. Any tool can
 * produce it: `size` and `sizeLimit` are in bytes, and `passed` falls back to
 * `size <= sizeLimit` when absent.
 */
export interface SizeResult {
	name: string;
	size: number;
	sizeLimit?: number;
	passed?: boolean;
}

export interface CompareOptions {
	/**
	 * Sizes measured by this run.
	 */
	current: SizeResult[];
	/**
	 * Sizes measured on the base branch, or null when none could be found.
	 */
	baseline?: SizeResult[] | null;
	/**
	 * Markdown heading printed above the table.
	 * @default "## Bundle Size"
	 */
	header?: string;
	/**
	 * Name of the branch the baseline was measured on.
	 * @default "main"
	 */
	baseRef?: string;
	/**
	 * Commit the baseline was measured on, shown next to baseRef.
	 */
	baseSha?: string;
	/**
	 * Markdown appended after the table.
	 */
	footer?: string;
	/**
	 * Bytes per kB: 1000 matches size-limit's units, 1024 matches rsbuild's.
	 * @default 1024
	 */
	kilo?: 1000 | 1024;
	/**
	 * Changes smaller than this many bytes are reported as no change.
	 * @default 0
	 */
	threshold?: number;
	/**
	 * Why there is no baseline, appended to the "no baseline" note.
	 */
	missingReason?: string;
}

export interface CompareResult {
	data: string;
	passed: boolean;
}

const UNITS = ["B", "kB", "MB"];

const round = (value: number): number => Number.parseFloat(value.toFixed(2));

export const formatSize = (size: number, kilo: number): string => {
	if (size < 1) {
		return `${round(size)} B`;
	}
	let exponent = Math.min(
		Math.floor(Math.log(size) / Math.log(kilo)),
		UNITS.length - 1,
	);
	// Rounding can land on a whole next unit, e.g. 1048575 B is "1024 kB".
	if (round(size / kilo ** exponent) >= kilo && exponent < UNITS.length - 1) {
		exponent += 1;
	}
	return `${round(size / kilo ** exponent)} ${UNITS[exponent]}`;
};

export const formatDelta = ({
	size,
	previous,
	kilo,
	threshold,
}: {
	size: number;
	previous: number | undefined;
	kilo: number;
	threshold: number;
}): string => {
	if (previous === undefined) {
		return "new";
	}
	const diff = size - previous;
	if (Math.abs(diff) < threshold || diff === 0) {
		return "= no change";
	}
	const arrow = diff > 0 ? "▲" : "▼";
	const sign = diff > 0 ? "+" : "−";
	const amount = formatSize(Math.abs(diff), kilo);
	if (previous === 0) {
		return `${arrow} ${sign}${amount}`;
	}
	const percent = ((Math.abs(diff) / previous) * 100).toFixed(2);
	return `${arrow} ${sign}${amount} (${sign}${percent}%)`;
};

/**
 * Keep untrusted text inside its table cell: a newline would end the table and
 * let the rest render as markdown, `<` opens HTML or a comment, and `@` pings,
 * which a zero-width space after it prevents.
 */
const escapeCell = (text: string): string =>
	text
		.replace(/\p{Cc}+/gu, " ")
		.replaceAll("\\", "\\\\")
		.replaceAll("|", "\\|")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("@", "@&#8203;");

// Keep a value on one line inside its code span.
const toCodeSpan = (text: string): string =>
	text.replace(/\p{Cc}+/gu, " ").replaceAll("`", "");

const formatRef = (baseRef: string, baseSha?: string): string => {
	const ref = `\`${toCodeSpan(baseRef)}\``;
	return baseSha ? `${ref} @ \`${toCodeSpan(baseSha.slice(0, 7))}\`` : ref;
};

/**
 * Render a markdown size report with a "vs <baseRef>" column comparing each
 * entry of `current` with the entry of the same name in `baseline`.
 */
export const compareSizes = ({
	current,
	baseline = null,
	header = DEFAULT_HEADER,
	baseRef = "main",
	baseSha,
	footer,
	kilo = 1024,
	threshold = DEFAULT_THRESHOLD,
	missingReason,
}: CompareOptions): CompareResult => {
	const previousSizes = new Map(
		(baseline ?? []).map((entry) => [entry.name, entry.size]),
	);
	let passed = true;

	const rows = current.map((entry) => {
		const entryPassed =
			entry.passed !== false &&
			(entry.sizeLimit === undefined || entry.size <= entry.sizeLimit);
		if (!entryPassed) {
			passed = false;
		}
		const delta = baseline
			? formatDelta({
					size: entry.size,
					previous: previousSizes.get(entry.name),
					kilo,
					threshold,
				})
			: "n/a";
		const limit =
			entry.sizeLimit === undefined ? "—" : formatSize(entry.sizeLimit, kilo);
		return `| ${entryPassed ? "✅" : "❌"} | ${escapeCell(entry.name)} | ${formatSize(entry.size, kilo)} | ${delta} | ${limit} |`;
	});

	const currentNames = new Set(current.map((entry) => entry.name));
	const removed = (baseline ?? [])
		.filter((entry) => !currentNames.has(entry.name))
		.map(
			(entry) =>
				`| ➖ | ${escapeCell(entry.name)} | — | removed (−${formatSize(entry.size, kilo)}) | — |`,
		);

	const reference = formatRef(baseRef, baseSha);
	const reason = missingReason ? ` (${missingReason})` : "";
	const note = baseline
		? `<sub>Compared with ${reference}.</sub>`
		: `<sub>⚠️ No baseline found for ${reference}${reason}, so no change is shown.</sub>`;

	const lines = [
		header,
		"",
		`| Status | Section | Size (gzip) | vs ${escapeCell(baseRef)} | Limit (gzip) |`,
		"| --- | --- | --- | --- | --- |",
		...rows,
		...removed,
		"",
		note,
	];
	if (footer) {
		lines.push("", footer);
	}

	return { data: `${lines.join("\n")}\n`, passed };
};
