#!/usr/bin/env node

/* istanbul ignore file */

import { Logger } from "@node-cli/logger";
import kleur from "kleur";
import {
	checkBundleSize,
	formatBytes,
	getExternals,
	parsePackageSpecifier,
} from "./bundler.js";
import {
	getCachedResult,
	normalizeCacheKey,
	setCachedResult,
} from "./cache.js";
import { normalizePlatform, TREND_VERSION_COUNT } from "./defaults.js";
import { config } from "./parse.js";
import {
	analyzeTrend,
	renderTrendGraph,
	selectTrendVersions,
} from "./trend.js";
import { fetchPackageVersions, promptForVersion } from "./versions.js";

const flags = config.flags;
const parameters = config.parameters;

// Disable kleur colors when --boring flag is set.
kleur.enabled = !flags?.boring;

const log = new Logger({
	boring: flags?.boring,
});

/**
 * Display bundle result in a formatted box.
 */
function displayResult(
	result: {
		packageName: string;
		packageVersion: string;
		exports: string[];
		rawSize: number;
		gzipSize: number | null;
		gzipLevel: number;
		externals: string[];
		dependencies: string[];
		platform: "browser" | "node";
		namedExportCount: number;
	},
	isAutoDetected: boolean,
): void {
	const blue = kleur.blue;
	const green = kleur.green;

	const platformLabel = result.platform === "node" ? "node" : "browser";
	const platformNote = isAutoDetected ? " (auto-detected)" : "";

	// Format exports display.
	let exportsDisplay: string;
	if (result.exports.length > 0) {
		exportsDisplay = `{ ${result.exports.join(", ")} }`;
	} else if (result.namedExportCount > 0) {
		exportsDisplay = `${result.namedExportCount} named exports (entire package)`;
	} else {
		exportsDisplay = "* (entire package)";
	}

	log.printBox(
		[
			`${blue("Package:")} ${result.packageName} (${blue("version:")} ${result.packageVersion})`,
			`${blue("Exports:")} ${exportsDisplay}`,
			"",
			`${blue("Raw size:")}  ${formatBytes(result.rawSize)}`,
			result.gzipSize !== null
				? `${blue("Gzip size:")} ${formatBytes(result.gzipSize)} (level ${result.gzipLevel})`
				: `${blue("Gzip size:")} N/A (not applicable for node platform)`,
			"",
			result.externals.length > 0
				? `${blue("Externals:")} ${result.externals.join(", ")}`
				: `${blue("Externals:")} ${green("none")}`,
			result.dependencies.length > 0
				? `${blue("Dependencies:")} ${result.dependencies.join(", ")}`
				: `${blue("Dependencies:")} ${green("none")}`,
			`${blue("Platform:")} ${platformLabel}${platformNote}`,
		],
		{
			borderStyle: "round",
			align: "left",
		},
	);
}

async function main() {
	let packageName = parameters?.["0"];

	if (!packageName) {
		log.error("Package name is required");
		config.showHelp?.();
		process.exit(1);
	}

	// Parse additional externals if provided (comma-separated).
	let additionalExternals: string[] | undefined;
	if (flags?.external) {
		additionalExternals = flags.external
			.split(",")
			.map((e) => e.trim())
			.filter(Boolean);
	}

	// Parse exports if provided (comma-separated).
	let exports: string[] | undefined;
	const exportsArg = parameters?.["1"];
	if (exportsArg) {
		exports = exportsArg
			.split(",")
			.map((e) => e.trim())
			.filter(Boolean);
	}

	// Normalize platform from flag (handles aliases like "web" → "browser").
	const platform = normalizePlatform(flags?.platform);

	/**
	 * If --trend flag is set, show bundle size trend across versions --trend alone
	 * uses default (5), --trend N uses N versions.
	 */
	const trendValue = flags?.trend;
	if (trendValue !== undefined) {
		const parsedCount = Number.parseInt(trendValue, 10);
		const versionCount =
			!Number.isNaN(parsedCount) && parsedCount > 0
				? parsedCount
				: TREND_VERSION_COUNT;

		try {
			const { name, subpath } = parsePackageSpecifier(packageName);
			// Construct the full package path including subpath if present.
			const fullPackagePath = subpath ? `${name}/${subpath}` : name;

			log.info(`\nFetching available versions for ${name}...`);

			const { versions } = await fetchPackageVersions({
				packageName,
				registry: flags?.registry,
			});

			if (versions.length === 0) {
				log.error("No versions found for this package");
				process.exit(1);
			}

			// Select versions for trend.
			const trendVersions = selectTrendVersions(versions, versionCount);

			log.info(
				`Analyzing ${trendVersions.length} versions: ${trendVersions.join(", ")}`,
			);
			log.info("");

			const results = await analyzeTrend({
				packageName: fullPackagePath,
				versions: trendVersions,
				exports,
				additionalExternals,
				noExternal: flags?.noExternal,
				gzipLevel: flags?.gzipLevel,
				boring: flags?.boring,
				registry: flags?.registry,
				platform,
				force: flags?.force,
			});

			if (results.length === 0) {
				log.error("Failed to analyze any versions");
				process.exit(1);
			}

			// Render and display the trend graph.
			const graphLines = renderTrendGraph(
				fullPackagePath,
				results,
				flags?.boring,
			);
			for (const line of graphLines) {
				log.log(line);
			}

			process.exit(0);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			log.error(`Failed to analyze trend: ${errorMessage}`);
			process.exit(1);
		}
	}

	// If --versions flag is set, fetch and prompt for version selection.
	if (flags?.versions) {
		try {
			const { name, subpath } = parsePackageSpecifier(packageName);
			log.info(`\nFetching available versions for ${name}...`);

			const { versions, tags } = await fetchPackageVersions({
				packageName,
				registry: flags?.registry,
			});

			if (versions.length === 0) {
				log.error("No versions found for this package");
				process.exit(1);
			}

			const selectedVersion = await promptForVersion(name, versions, tags);
			// Rebuild specifier preserving any subpath.
			packageName = subpath
				? `${name}/${subpath}@${selectedVersion}`
				: `${name}@${selectedVersion}`;
			log.info(`\nSelected: ${packageName}`);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			log.error(`Failed to fetch versions: ${errorMessage}`);
			process.exit(1);
		}
	}

	log.info(`\nAnalyzing bundle size for: ${packageName}`);
	if (exports && exports.length > 0) {
		log.info(`Exports: { ${exports.join(", ")} }`);
	}

	try {
		// Parse package specifier to get name and version.
		const { name: baseName, version: requestedVersion } =
			parsePackageSpecifier(packageName);

		// Resolve "latest" to actual version for cache key.
		let resolvedVersion = requestedVersion;
		if (requestedVersion === "latest") {
			const { tags } = await fetchPackageVersions({
				packageName: baseName,
				registry: flags?.registry,
			});
			resolvedVersion = tags.latest || requestedVersion;
		}

		// Compute externals for cache key (same logic as bundler).
		const externals = getExternals(
			baseName,
			additionalExternals,
			flags?.noExternal,
		);

		/**
		 * Build cache key.
		 * NOTE: platform can be undefined (auto-detect), which is stored as "auto" in cache.
		 */
		const cacheKey = normalizeCacheKey({
			packageName: baseName,
			version: resolvedVersion,
			exports,
			platform,
			gzipLevel: flags?.gzipLevel ?? 5,
			externals,
			noExternal: flags?.noExternal ?? false,
		});

		// Check cache (unless --force flag is set).
		if (!flags?.force) {
			const cached = getCachedResult(cacheKey);
			if (cached) {
				log.info("NOTE: Using cached results\n");
				displayResult(cached, platform === undefined);
				process.exit(0);
			}
		}

		log.info("Please wait, installing and bundling...\n");

		const result = await checkBundleSize({
			packageName,
			exports,
			additionalExternals,
			noExternal: flags?.noExternal,
			gzipLevel: flags?.gzipLevel,
			registry: flags?.registry,
			platform,
		});

		// Store result in cache.
		setCachedResult(cacheKey, result);

		displayResult(result, platform === undefined);

		process.exit(0);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		log.error(`Failed to analyze bundle size: ${errorMessage}`);
		process.exit(1);
	}
}

main();
