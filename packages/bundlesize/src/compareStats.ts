import fs from "fs-extra";
import { compareSizes, type SizeResult } from "./compare.js";
import type { Flags } from "./parse.js";
import { getOutputFile, readJSONFile } from "./utilities.js";

type CompareFlags = Pick<
	Flags,
	| "current"
	| "baseline"
	| "header"
	| "baseRef"
	| "baseSha"
	| "footer"
	| "kilo"
	| "threshold"
	| "output"
	| "silent"
>;

type CompareStatsResult = {
	data: string;
	exitCode: number;
	exitMessage: string;
	outputFile: string;
	/**
	 * Something worth printing that did not stop the report.
	 */
	warning: string;
};

const isByteCount = (value: unknown): boolean =>
	typeof value === "number" && Number.isFinite(value) && value >= 0;

const isSizeResult = (value: unknown): value is SizeResult => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.name === "string" &&
		isByteCount(entry.size) &&
		(entry.sizeLimit === undefined || isByteCount(entry.sizeLimit)) &&
		(entry.passed === undefined || typeof entry.passed === "boolean")
	);
};

/**
 * False only when the file is certainly absent: a stat that fails for another
 * reason, such as a denied parent directory, must still surface as a warning.
 */
const baselineMayExist = (file: string): boolean => {
	try {
		return fs.statSync(file, { throwIfNoEntry: false }) !== undefined;
	} catch {
		return true;
	}
};

/**
 * Read a sizes file. Returns an error message instead of throwing so the CLI
 * can report which file was bad.
 */
export const readSizes = (
	file: string,
): { sizes: SizeResult[]; error: string } => {
	const json = readJSONFile(file);
	if (json.exitMessage !== "") {
		return { sizes: [], error: json.exitMessage };
	}
	const data: unknown = json.data;
	if (
		typeof data === "object" &&
		data !== null &&
		typeof (data as { error?: unknown }).error === "string"
	) {
		// What `size-limit --json` prints when its own run fails.
		return {
			sizes: [],
			error: `Sizes file ${file} reports an error: ${(data as { error: string }).error}`,
		};
	}
	if (!Array.isArray(data) || !data.every(isSizeResult)) {
		return {
			sizes: [],
			error: `Invalid sizes file ${file}: expected an array of { name, size, sizeLimit?, passed? } with non-negative sizes`,
		};
	}
	const names = new Set<string>();
	for (const entry of data) {
		if (names.has(entry.name)) {
			return {
				sizes: [],
				error: `Duplicate entry name "${entry.name}" in sizes file ${file}: give each size-limit check its own \`name\``,
			};
		}
		names.add(entry.name);
	}
	return { sizes: data, error: "" };
};

/**
 * CLI entry for `--type compare`. Only a bad --current fails the run: a missing
 * baseline renders the "no baseline" note, and an unreadable one does too, plus
 * a warning, so a broken artifact on main cannot block every PR.
 */
export const compareStats = ({
	flags,
}: {
	flags: CompareFlags;
}): CompareStatsResult => {
	const result: CompareStatsResult = {
		data: "",
		exitCode: 0,
		exitMessage: "",
		outputFile: getOutputFile(flags.output),
		warning: "",
	};
	const fail = (exitMessage: string): CompareStatsResult => ({
		...result,
		exitCode: 1,
		exitMessage,
	});

	if (!flags.current) {
		return fail("Please provide the current sizes file with --current");
	}
	if (flags.kilo === undefined) {
		return fail(
			"--kilo is required: 1000 for size-limit sizes, 1024 for rsbuild sizes",
		);
	}
	if (flags.kilo !== 1000 && flags.kilo !== 1024) {
		return fail("--kilo must be 1000 or 1024");
	}
	if (
		flags.threshold !== undefined &&
		!(Number.isFinite(flags.threshold) && flags.threshold >= 0)
	) {
		return fail("--threshold must be a number of bytes, 0 or more");
	}

	const current = readSizes(flags.current);
	if (current.error) {
		return fail(current.error);
	}

	let baseline: SizeResult[] | null = null;
	let missingReason: string | undefined;
	if (flags.baseline && baselineMayExist(flags.baseline)) {
		const previous = readSizes(flags.baseline);
		if (previous.error) {
			result.warning = `Ignoring the baseline: ${previous.error}`;
			missingReason = "the baseline file could not be read";
		} else {
			baseline = previous.sizes;
		}
	}

	const { data, passed } = compareSizes({
		current: current.sizes,
		baseline,
		header: flags.header || undefined,
		baseRef: flags.baseRef || undefined,
		baseSha: flags.baseSha || undefined,
		footer: flags.footer || undefined,
		kilo: flags.kilo as 1000 | 1024,
		threshold: flags.threshold,
		missingReason,
	});

	return {
		...result,
		data,
		exitCode: passed || flags.silent ? 0 : 1,
	};
};
