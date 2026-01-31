import { Logger } from "@node-cli/logger";
import kleur from "kleur";
import { prerelease } from "semver";
import { checkBundleSize, formatBytes } from "./bundler.js";
import { TREND_VERSION_COUNT } from "./defaults.js";

export type TrendResult = {
	version: string;
	rawSize: number;
	/** Gzip size in bytes, or null for node platform */
	gzipSize: number | null;
};

export type TrendOptions = {
	packageName: string;
	versions: string[];
	exports?: string[];
	additionalExternals?: string[];
	noExternal?: boolean;
	gzipLevel?: number;
	boring?: boolean;
	registry?: string;
	/** Target platform. If undefined, auto-detects from package.json engines */
	platform?: "browser" | "node";
};

/**
 * Select versions for trend analysis
 * Returns the most recent stable versions (newest first)
 * Filters out prerelease versions (canary, alpha, beta, rc, etc.)
 */
export function selectTrendVersions(
	allVersions: string[],
	count: number = TREND_VERSION_COUNT,
): string[] {
	// Filter out prerelease versions (canary, alpha, beta, rc, etc.)
	const stableVersions = allVersions.filter((v) => !prerelease(v));
	return stableVersions.slice(0, count);
}

/**
 * Analyze bundle size trend across multiple versions
 */
export async function analyzeTrend(
	options: TrendOptions,
): Promise<TrendResult[]> {
	const {
		packageName,
		versions,
		exports,
		additionalExternals,
		noExternal,
		gzipLevel,
		boring,
		registry,
		platform,
	} = options;

	const log = new Logger({ boring });
	const results: TrendResult[] = [];

	for (const version of versions) {
		const versionedPackage = `${packageName}@${version}`;
		log.info(`  Checking ${version}...`);

		try {
			const result = await checkBundleSize({
				packageName: versionedPackage,
				exports,
				additionalExternals,
				noExternal,
				gzipLevel,
				registry,
				platform,
			});

			results.push({
				version,
				rawSize: result.rawSize,
				gzipSize: result.gzipSize,
			});
		} catch {
			// Skip versions that fail to analyze
			log.info(`  Skipping ${version} (failed to analyze)`);
		}
	}

	return results;
}

/**
 * Render a bar graph showing bundle size trend
 */
export function renderTrendGraph(
	packageName: string,
	results: TrendResult[],
	boring: boolean = false,
): string[] {
	if (results.length === 0) {
		return ["No data to display"];
	}

	const lines: string[] = [];

	// Color helper (respects boring flag)
	const blue = (text: string) => (boring ? text : kleur.blue(text));

	// Check if gzip data is available (null for node platform)
	const hasGzipData = results.some((r) => r.gzipSize !== null);

	// Create maps from formatted string to representative value
	// This ensures values that display the same get the same bar length
	const gzipFormattedToValue = new Map<string, number>();
	const rawFormattedToValue = new Map<string, number>();

	for (const result of results) {
		if (hasGzipData && result.gzipSize !== null) {
			const gzipFormatted = formatBytes(result.gzipSize);
			// Use first occurrence as representative value for each formatted string
			if (!gzipFormattedToValue.has(gzipFormatted)) {
				gzipFormattedToValue.set(gzipFormatted, result.gzipSize);
			}
		}
		const rawFormatted = formatBytes(result.rawSize);
		if (!rawFormattedToValue.has(rawFormatted)) {
			rawFormattedToValue.set(rawFormatted, result.rawSize);
		}
	}

	// Get unique representative values for min/max calculation
	const uniqueGzipValues = [...gzipFormattedToValue.values()];
	const uniqueRawValues = [...rawFormattedToValue.values()];

	const minGzipSize = hasGzipData ? Math.min(...uniqueGzipValues) : 0;
	const maxGzipSize = hasGzipData ? Math.max(...uniqueGzipValues) : 0;
	const minRawSize = Math.min(...uniqueRawValues);
	const maxRawSize = Math.max(...uniqueRawValues);

	// Find max version length for alignment
	const maxVersionLen = Math.max(...results.map((r) => r.version.length));

	// Bar width (characters)
	const barWidth = 30;
	const minBarWidth = 10; // Minimum bar length for smallest value

	// Helper to calculate bar length with min-max scaling
	const calcBarLength = (value: number, min: number, max: number): number => {
		if (max === min) {
			return barWidth; // All values are the same
		}
		// Scale from minBarWidth to barWidth based on position between min and max
		const ratio = (value - min) / (max - min);
		return Math.round(minBarWidth + ratio * (barWidth - minBarWidth));
	};

	// Header
	lines.push("");
	lines.push(`${blue("Bundle Size:")} ${packageName}`);
	lines.push("─".repeat(60));
	lines.push("");

	// Gzip size bars (only for browser platform)
	if (hasGzipData) {
		lines.push(blue("Gzip Size:"));
		for (const result of results) {
			if (result.gzipSize === null) {
				continue;
			}
			const sizeStr = formatBytes(result.gzipSize);
			// Use representative value for this formatted string to ensure consistent bar length
			const representativeValue = gzipFormattedToValue.get(sizeStr) as number;
			const barLength = calcBarLength(
				representativeValue,
				minGzipSize,
				maxGzipSize,
			);
			const bar = "▇".repeat(barLength);
			const padding = " ".repeat(maxVersionLen - result.version.length);
			lines.push(`  ${result.version}${padding}  ${bar} ${sizeStr}`);
		}

		lines.push("");
	}

	// Raw size bars
	lines.push(blue("Raw Size:"));
	for (const result of results) {
		const sizeStr = formatBytes(result.rawSize);
		// Use representative value for this formatted string to ensure consistent bar length
		const representativeValue = rawFormattedToValue.get(sizeStr) as number;
		const barLength = calcBarLength(
			representativeValue,
			minRawSize,
			maxRawSize,
		);
		const bar = "▇".repeat(barLength);
		const padding = " ".repeat(maxVersionLen - result.version.length);
		lines.push(`  ${result.version}${padding}  ${bar} ${sizeStr}`);
	}

	lines.push("");

	// Summary
	const oldestResult = results[results.length - 1];
	const newestResult = results[0];

	if (results.length > 1) {
		const rawDiff = newestResult.rawSize - oldestResult.rawSize;
		const rawPercent = ((rawDiff / oldestResult.rawSize) * 100).toFixed(1);
		const rawTrend =
			rawDiff >= 0
				? `+${formatBytes(rawDiff)}`
				: `-${formatBytes(Math.abs(rawDiff))}`;

		lines.push("─".repeat(60));
		lines.push(
			`Change from ${oldestResult.version} to ${newestResult.version}:`,
		);

		// Gzip summary (only for browser platform)
		if (
			hasGzipData &&
			newestResult.gzipSize !== null &&
			oldestResult.gzipSize !== null
		) {
			const gzipDiff = newestResult.gzipSize - oldestResult.gzipSize;
			const gzipPercent = ((gzipDiff / oldestResult.gzipSize) * 100).toFixed(1);
			const gzipTrend =
				gzipDiff >= 0
					? `+${formatBytes(gzipDiff)}`
					: `-${formatBytes(Math.abs(gzipDiff))}`;
			lines.push(
				`  ${blue("Gzip:")} ${gzipTrend} (${gzipDiff >= 0 ? "+" : ""}${gzipPercent}%)`,
			);
		}

		lines.push(
			`  ${blue("Raw:")}  ${rawTrend} (${rawDiff >= 0 ? "+" : ""}${rawPercent}%)`,
		);
	}

	lines.push("");

	return lines;
}
