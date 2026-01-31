#!/usr/bin/env node

/* istanbul ignore file */

import { Logger } from "@node-cli/logger";
import kleur from "kleur";
import {
	checkBundleSize,
	formatBytes,
	parsePackageSpecifier,
} from "./bundler.js";
import { TREND_VERSION_COUNT } from "./defaults.js";
import { config } from "./parse.js";
import {
	analyzeTrend,
	renderTrendGraph,
	selectTrendVersions,
} from "./trend.js";
import { fetchPackageVersions, promptForVersion } from "./versions.js";

const flags = config.flags;
const parameters = config.parameters;

// Disable kleur colors when --boring flag is set
kleur.enabled = !flags?.boring;

const log = new Logger({
	boring: flags?.boring,
});

async function main() {
	let packageName = parameters?.["0"];

	if (!packageName) {
		log.error("Package name is required");
		config.showHelp?.();
		process.exit(1);
	}

	// Parse additional externals if provided (comma-separated)
	let additionalExternals: string[] | undefined;
	if (flags?.external) {
		additionalExternals = flags.external
			.split(",")
			.map((e) => e.trim())
			.filter(Boolean);
	}

	// Parse exports if provided (comma-separated)
	let exports: string[] | undefined;
	const exportsArg = parameters?.["1"];
	if (exportsArg) {
		exports = exportsArg
			.split(",")
			.map((e) => e.trim())
			.filter(Boolean);
	}

	// If --trend flag is set, show bundle size trend across versions
	// --trend alone uses default (5), --trend N uses N versions
	const trendValue = flags?.trend;
	if (trendValue !== undefined) {
		const parsedCount = Number.parseInt(trendValue, 10);
		const versionCount =
			!Number.isNaN(parsedCount) && parsedCount > 0
				? parsedCount
				: TREND_VERSION_COUNT;

		try {
			const { name, subpath } = parsePackageSpecifier(packageName);
			// Construct the full package path including subpath if present
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

			// Select versions for trend
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
			});

			if (results.length === 0) {
				log.error("Failed to analyze any versions");
				process.exit(1);
			}

			// Render and display the trend graph
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

	// If --versions flag is set, fetch and prompt for version selection
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
			// Rebuild specifier preserving any subpath
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
	log.info("Please wait, installing and bundling...\n");

	try {
		const result = await checkBundleSize({
			packageName,
			exports,
			additionalExternals,
			noExternal: flags?.noExternal,
			gzipLevel: flags?.gzipLevel,
			registry: flags?.registry,
		});

		const blue = kleur.blue;
		const green = kleur.green;

		// Display results
		log.printBox(
			[
				`${blue("Package:")} ${result.packageName} (${blue("version:")} ${result.packageVersion})`,
				result.exports.length > 0
					? `${blue("Exports:")} { ${result.exports.join(", ")} }`
					: `${blue("Exports:")} * (entire package)`,
				"",
				`${blue("Raw size:")}  ${formatBytes(result.rawSize)}`,
				`${blue("Gzip size:")} ${formatBytes(result.gzipSize)} (level ${result.gzipLevel})`,
				"",
				result.externals.length > 0
					? `${blue("Externals:")} ${result.externals.join(", ")}`
					: `${blue("Externals:")} ${green("none")}`,
				result.dependencies.length > 0
					? `${blue("Dependencies:")} ${result.dependencies.join(", ")}`
					: `${blue("Dependencies:")} ${green("none")}`,
			],
			{
				borderStyle: "round",
				align: "left",
			},
		);

		process.exit(0);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		log.error(`Failed to analyze bundle size: ${errorMessage}`);
		process.exit(1);
	}
}

main();
