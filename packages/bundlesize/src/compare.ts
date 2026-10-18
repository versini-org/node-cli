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
}

export interface CompareResult {
	data: string;
	passed: boolean;
}

const UNITS = ["B", "kB", "MB"];

export const formatSize = (size: number, kilo: number): string => {
	if (size === 0) {
		return "0 B";
	}
	const exponent = Math.min(
		Math.floor(Math.log(size) / Math.log(kilo)),
		UNITS.length - 1,
	);
	return `${Number.parseFloat((size / kilo ** exponent).toFixed(2))} ${UNITS[exponent]}`;
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

const escapeCell = (text: string): string => text.replaceAll("|", "\\|");

const formatRef = (baseRef: string, baseSha?: string): string =>
	baseSha ? `\`${baseRef}\` @ \`${baseSha.slice(0, 7)}\`` : `\`${baseRef}\``;

/**
 * Render a markdown size report with a "vs <baseRef>" column comparing each
 * entry of `current` with the entry of the same name in `baseline`.
 */
export const compareSizes = ({
	current,
	baseline = null,
	header = "## Bundle Size",
	baseRef = "main",
	baseSha,
	footer,
	kilo = 1024,
	threshold = 0,
}: CompareOptions): CompareResult => {
	const previousSizes = new Map(
		(baseline ?? []).map((entry) => [entry.name, entry.size]),
	);
	let passed = true;

	const rows = current.map((entry) => {
		const entryPassed =
			entry.passed ??
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

	const reference = formatRef(baseRef, baseSha);
	const note = baseline
		? `<sub>Compared with ${reference}.</sub>`
		: `<sub>⚠️ No baseline found for ${reference}, so no change is shown.</sub>`;

	const lines = [
		header,
		"",
		`| Status | Section | Size (gzip) | vs ${escapeCell(baseRef)} | Limit (gzip) |`,
		"| --- | --- | --- | --- | --- |",
		...rows,
		"",
		note,
	];
	if (footer) {
		lines.push("", footer);
	}

	return { data: `${lines.join("\n")}\n`, passed };
};
