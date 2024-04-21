import { basename, dirname, join } from "node:path";
import {
	addMDrow,
	formatFooter,
	getMostRecentVersion,
	getOutputFile,
	percentFormatter,
	readJSONFile,
	validateConfigurationFile,
} from "./utilities.js";

import bytes from "bytes";
import type { FooterProperties } from "./utilities.js";

type ReportConfiguration = {
	current: string;
	previous: string;

	header?: string;
	footer?: (arguments_: FooterProperties) => string;
	columns?: { [key: string]: string }[];
};

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
		return {
			...result,
			...isValidConfigResult,
		};
	}
	const configurationFile = isValidConfigResult.data;
	const outputFile = getOutputFile(flags.output);
	result.outputFile = outputFile;

	const configuration: { report: ReportConfiguration } = await import(
		configurationFile
	).then((m) => m.default);

	const currentStats = readJSONFile(
		join(dirname(configurationFile), configuration.report.current),
	);
	if (currentStats.exitMessage !== "") {
		return {
			...result,
			...currentStats,
		};
	}

	try {
		previousStats = readJSONFile(
			join(dirname(configurationFile), configuration.report.previous),
		);
		if (previousStats.exitMessage !== "") {
			return {
				...result,
				...previousStats,
			};
		}
		previousVersion = getMostRecentVersion(previousStats.data);
	} catch {
		// nothing to declare officer
	}
	const currentVersion = getMostRecentVersion(currentStats.data);

	let limitReached = false;
	let overallDiff = 0;
	let totalGzipSize = 0;

	const headerString = configuration.report.header || "## Bundle Size";
	const footerFormatter = configuration.report.footer || formatFooter;
	const columns = configuration.report.columns || [
		{ status: "Status" },
		{ file: "File" },
		{ size: "Size (Gzip)" },
		{ limits: "Limits" },
	];

	const rowsMD = [];
	rowsMD.push(addMDrow({ type: "header", columns }));

	for (const key of Object.keys(currentStats.data[currentVersion])) {
		const item = currentStats.data[currentVersion][key];
		const name = basename(key);
		if (!item.passed) {
			limitReached = true;
		}

		let diffString = "";
		if (previousStats && previousVersion) {
			const previousFileStats =
				previousStats.data[previousVersion] &&
				previousStats.data[previousVersion][key];
			const previousFileSizeGzip = previousFileStats?.fileSizeGzip || 0;
			const diff = item.fileSizeGzip - previousFileSizeGzip;

			overallDiff += diff;
			diffString =
				diff === 0 || diff === item.fileSizeGzip
					? ""
					: ` (${diff > 0 ? "+" : "-"}${bytes(Math.abs(diff), {
							unitSeparator: " ",
						})} ${percentFormatter(diff / previousFileSizeGzip)})`;
		}

		totalGzipSize += item.fileSizeGzip;

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

	const template = `
${headerString}
${rowsMD.join("\n")}

${footerFormatter({
	limitReached,
	overallDiff,
	totalGzipSize,
})}
`;

	if (limitReached) {
		result.exitCode = 1;
	}

	result.data = template;

	return result;
};
