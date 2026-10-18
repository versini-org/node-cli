import fs from "fs-extra";
import { compareSizes, type SizeResult } from "./compare.js";
import { getOutputFile } from "./utilities.js";

type CompareFlags = {
	current?: string;
	baseline?: string;
	header?: string;
	baseRef?: string;
	baseSha?: string;
	footer?: string;
	kilo?: number;
	threshold?: number;
	output?: string;
	silent?: boolean;
};

type CompareStatsResult = {
	data: string;
	exitCode: number;
	exitMessage: string;
	outputFile: string;
};

const isSizeResult = (value: unknown): value is SizeResult => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.name === "string" &&
		typeof entry.size === "number" &&
		(entry.sizeLimit === undefined || typeof entry.sizeLimit === "number") &&
		(entry.passed === undefined || typeof entry.passed === "boolean")
	);
};

/**
 * Read a sizes file. Returns an error message instead of throwing so the CLI
 * can report which file was bad.
 */
export const readSizes = (
	file: string,
): { sizes: SizeResult[]; error: string } => {
	let data: unknown;
	try {
		data = fs.readJsonSync(file);
	} catch (error) {
		return { sizes: [], error: `Failed to read JSON file: ${error.message}` };
	}
	if (!Array.isArray(data) || !data.every(isSizeResult)) {
		return {
			sizes: [],
			error: `Invalid sizes file ${file}: expected an array of { name, size, sizeLimit?, passed? }`,
		};
	}
	return { sizes: data, error: "" };
};

/**
 * CLI entry for `--type compare`: a missing baseline file is not an error, it
 * renders the "no baseline" note instead.
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
	};

	if (!flags.current) {
		return {
			...result,
			exitCode: 1,
			exitMessage: "Please provide the current sizes file with --current",
		};
	}
	if (flags.kilo !== undefined && flags.kilo !== 1000 && flags.kilo !== 1024) {
		return {
			...result,
			exitCode: 1,
			exitMessage: "--kilo must be 1000 or 1024",
		};
	}

	const current = readSizes(flags.current);
	if (current.error) {
		return { ...result, exitCode: 1, exitMessage: current.error };
	}

	let baseline: SizeResult[] | null = null;
	if (flags.baseline && fs.existsSync(flags.baseline)) {
		const previous = readSizes(flags.baseline);
		if (previous.error) {
			return { ...result, exitCode: 1, exitMessage: previous.error };
		}
		baseline = previous.sizes;
	}

	const { data, passed } = compareSizes({
		current: current.sizes,
		baseline,
		header: flags.header || undefined,
		baseRef: flags.baseRef || undefined,
		baseSha: flags.baseSha || undefined,
		footer: flags.footer || undefined,
		kilo: flags.kilo as 1000 | 1024 | undefined,
		threshold: flags.threshold,
	});

	return {
		...result,
		data,
		exitCode: passed || flags.silent ? 0 : 1,
	};
};
