import { basename, dirname, join } from "node:path";
import bytes from "bytes";
import { DEFAULT_THRESHOLD } from "./defaults.js";
import type { FooterProperties } from "./utilities.js";
import {
	addMDrow,
	formatFooter,
	getMostRecentVersion,
	getOutputFile,
	percentFormatter,
	readJSONFile,
	validateConfigurationFile,
} from "./utilities.js";

type ReportConfiguration = {
	current: string;
	previous: string;
	header?: string;
	footer?: (arguments_: FooterProperties) => string;
	columns?: { [key: string]: string }[];
	threshold?: number;
};

interface HeaderSizeEntry {
	header: string;
}
interface FileSizeEntry {
	path: string;
	limit: string;
	alias?: string;
}
type SizesConfiguration = Array<HeaderSizeEntry | FileSizeEntry>;

const isHeaderEntry = (
	entry: HeaderSizeEntry | FileSizeEntry,
): entry is HeaderSizeEntry => "header" in entry;

type ReportCompare = {
	data: string;
	exitCode: number;
	exitMessage: string;
	outputFile: string;
};

export const reportStats = async ({ flags }): Promise<ReportCompare> => {
	const result: ReportCompare = {
		exitCode: 0,
		exitMessage: "",
		outputFile: "",
		data: "",
	};

	let previousStats, previousVersion: string;
	const isValidConfigResult = validateConfigurationFile(flags.configuration);
	if (isValidConfigResult.exitMessage !== "") {
		return { ...result, ...isValidConfigResult };
	}

	const configurationFile = isValidConfigResult.data;
	const outputFile = getOutputFile(flags.output);
	result.outputFile = outputFile;

	const configuration: {
		report: ReportConfiguration;
		sizes?: SizesConfiguration;
	} = await import(configurationFile).then((m) => m.default);

	const currentStats = readJSONFile(
		join(dirname(configurationFile), configuration.report.current),
	);
	if (currentStats.exitMessage !== "") {
		return { ...result, ...currentStats };
	}

	try {
		previousStats = readJSONFile(
			join(dirname(configurationFile), configuration.report.previous),
		);
		if (previousStats.exitMessage !== "") {
			return { ...result, ...previousStats };
		}
		previousVersion = getMostRecentVersion(previousStats.data);
	} catch {
		// no previous stats available.
	}

	const currentVersion = getMostRecentVersion(currentStats.data);

	let limitReached = false;
	let overallDiff = 0;
	let totalGzipSize = 0;

	const threshold = configuration.report.threshold ?? DEFAULT_THRESHOLD;
	const headerString = configuration.report.header || "## Bundle Size";
	const footerFormatter = configuration.report.footer || formatFooter;
	const columns = configuration.report.columns || [
		{ status: "Status" },
		{ file: "File" },
		{ size: "Size (Gzip)" },
		{ limits: "Limits" },
	];

	const rowsMD: string[] = [];
	const hasGroupHeaders = Boolean(configuration.sizes?.some(isHeaderEntry));
	if (!hasGroupHeaders) {
		rowsMD.push(addMDrow({ type: "header", columns }));
	}

	// Build ordered keys based on configuration.sizes if present.
	const orderedKeys: Array<{
		type: "header" | "item";
		value: string;
		header?: string;
	}> = [];
	if (configuration.sizes && Array.isArray(configuration.sizes)) {
		for (const entry of configuration.sizes) {
			if (isHeaderEntry(entry)) {
				orderedKeys.push({ type: "header", value: "", header: entry.header });
				continue;
			}
			// entry is FileSizeEntry here.
			if (entry.alias && currentStats.data[currentVersion][entry.alias]) {
				orderedKeys.push({ type: "item", value: entry.alias });
			} else if (currentStats.data[currentVersion][entry.path]) {
				orderedKeys.push({ type: "item", value: entry.path });
			}
		}
	}

	if (orderedKeys.length === 0) {
		for (const key of Object.keys(currentStats.data[currentVersion])) {
			orderedKeys.push({ type: "item", value: key });
		}
	}

	let subGroupAccumulatedSize = 0;
	let subGroupAccumulatedPrevSize = 0;
	let hasSubGroup = false;
	const flushSubGroup = () => {
		if (!hasSubGroup) {
			return;
		}
		let diff = subGroupAccumulatedSize - subGroupAccumulatedPrevSize;
		// Apply threshold: if the absolute diff is below threshold, treat as no change
		if (Math.abs(diff) < threshold) {
			diff = 0;
		}
		let diffString = "";
		if (diff !== 0 && subGroupAccumulatedPrevSize !== 0) {
			const sign = diff > 0 ? "+" : "-";
			diffString = ` (${sign}${bytes(Math.abs(diff), { unitSeparator: " " })} ${percentFormatter(
				diff / subGroupAccumulatedPrevSize,
			)})`;
		}
		if (hasGroupHeaders) {
			rowsMD.push(
				`\nSub-bundle size: ${bytes(subGroupAccumulatedSize, {
					unitSeparator: " ",
				})}${diffString}`,
				"",
			);
		}
		subGroupAccumulatedSize = 0;
		subGroupAccumulatedPrevSize = 0;
		hasSubGroup = false;
	};

	for (const entry of orderedKeys) {
		if (entry.type === "header") {
			flushSubGroup();
			rowsMD.push("", entry.header as string, "");
			rowsMD.push(addMDrow({ type: "header", columns }));
			continue;
		}
		const key = entry.value;
		const item = currentStats.data[currentVersion][key];
		if (!item) {
			continue;
		}
		const name = basename(key);
		if (!item.passed) {
			limitReached = true;
		}

		let diffString = "";
		let previousFileSizeGzip = 0;
		if (previousStats && previousVersion) {
			const previousFileStats =
				previousStats.data[previousVersion] &&
				previousStats.data[previousVersion][key];
			previousFileSizeGzip = previousFileStats?.fileSizeGzip || 0;
			let diff = item.fileSizeGzip - previousFileSizeGzip;
			// Apply threshold: if the absolute diff is below threshold, treat as no change
			if (Math.abs(diff) < threshold) {
				diff = 0;
			}
			overallDiff += diff;
			diffString =
				diff === 0 || diff === item.fileSizeGzip
					? ""
					: ` (${diff > 0 ? "+" : "-"}${bytes(Math.abs(diff), { unitSeparator: " " })} ${percentFormatter(
							previousFileSizeGzip === 0 ? 0 : diff / previousFileSizeGzip,
						)})`;
		}

		totalGzipSize += item.fileSizeGzip;
		subGroupAccumulatedSize += item.fileSizeGzip;
		subGroupAccumulatedPrevSize += previousFileSizeGzip;
		hasSubGroup = true;

		rowsMD.push(
			addMDrow({
				type: "row",
				passed: item.passed,
				name: name,
				size: item.fileSizeGzip,
				diff: diffString,
				limit: item.limit,
				columns,
			}),
		);
	}

	flushSubGroup();

	const template = `
${headerString}
${rowsMD.join("\n")}

${footerFormatter({ limitReached, overallDiff, totalGzipSize })}
`;

	if (limitReached) {
		result.exitCode = 1;
	}
	result.data = template;
	return result;
};
