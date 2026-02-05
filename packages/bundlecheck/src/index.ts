/**
 * @node-cli/bundlecheck - Library API
 *
 * Programmatic interface for analyzing npm package bundle sizes.
 *
 */

import {
	type BundleResult,
	checkBundleSize,
	formatBytes,
	parsePackageSpecifier,
} from "./bundler.js";
import {
	getCachedResult,
	normalizeCacheKey,
	setCachedResult,
} from "./cache.js";
import {
	normalizePlatform,
	normalizeTarget,
	TREND_VERSION_COUNT,
} from "./defaults.js";
import type { NamedExport } from "./exports.js";
import { analyzeTrend, selectTrendVersions } from "./trend.js";
import { fetchPackageVersions as fetchVersions } from "./versions.js";

/**
 * =============================================================================
 * Types
 * =============================================================================
 */

/**
 * Options for getting bundle stats of a single package.
 */
export type GetBundleStatsOptions = {
	/**
	 * Package name with optional version (e.g., "@mantine/core" or
	 * "@mantine/core@7.0.0").
	 */
	package: string;
	/**
	 * Specific exports to measure (e.g., ["Button", "Input"]).
	 */
	exports?: string[];
	/**
	 * Additional packages to mark as external (not bundled).
	 */
	external?: string[];
	/**
	 * Bundle everything including dependencies that would normally be external.
	 */
	noExternal?: boolean;
	/**
	 * Gzip compression level (1-9, default 5).
	 */
	gzipLevel?: number;
	/**
	 * Custom npm registry URL.
	 */
	registry?: string;
	/**
	 * Target platform: "browser", "node", or "auto" (default: "auto" - auto-detect
	 * from package.json).
	 */
	platform?: "browser" | "node" | "auto";
	/**
	 * Bypass cache and force re-analysis.
	 */
	force?: boolean;
	/**
	 * esbuild target (e.g., "es2022", "es2020"). Defaults to "es2022".
	 */
	target?: string;
};

/**
 * Result from getBundleStats.
 */
export type BundleStats = {
	/**
	 * Display name of the package (may include subpath).
	 */
	packageName: string;
	/**
	 * Resolved package version.
	 */
	packageVersion: string;
	/**
	 * Exports that were analyzed.
	 */
	exports: string[];
	/**
	 * Raw (minified) bundle size in bytes.
	 */
	rawSize: number;
	/**
	 * Gzipped bundle size in bytes (null for node platform).
	 */
	gzipSize: number | null;
	/**
	 * Gzip compression level used.
	 */
	gzipLevel: number;
	/**
	 * Packages marked as external (not included in bundle).
	 */
	externals: string[];
	/**
	 * Package dependencies.
	 */
	dependencies: string[];
	/**
	 * Target platform used for bundling.
	 */
	platform: "browser" | "node";
	/**
	 * Human-readable raw size (e.g., "45.2 kB").
	 */
	rawSizeFormatted: string;
	/**
	 * Human-readable gzip size (e.g., "12.3 kB") or null.
	 */
	gzipSizeFormatted: string | null;
	/**
	 * Whether the result was retrieved from cache.
	 */
	fromCache: boolean;
	/**
	 * Total number of named exports in the package (when analyzing entire
	 * package).
	 */
	namedExportCount: number;
};

/**
 * Options for getting bundle size trend across versions.
 */
export type GetBundleTrendOptions = {
	/**
	 * Package name (e.g., "@mantine/core") - version is ignored if provided.
	 */
	package: string;
	/**
	 * Number of versions to analyze (default 5).
	 */
	versionCount?: number;
	/**
	 * Specific exports to measure (e.g., ["Button", "Input"]).
	 */
	exports?: string[];
	/**
	 * Additional packages to mark as external (not bundled).
	 */
	external?: string[];
	/**
	 * Bundle everything including dependencies that would normally be external.
	 */
	noExternal?: boolean;
	/**
	 * Gzip compression level (1-9, default 5).
	 */
	gzipLevel?: number;
	/**
	 * Custom npm registry URL.
	 */
	registry?: string;
	/**
	 * Target platform: "browser", "node", or "auto" (default: "auto" - auto-detect
	 * from package.json).
	 */
	platform?: "browser" | "node" | "auto";
	/**
	 * Bypass cache and force re-analysis.
	 */
	force?: boolean;
	/**
	 * esbuild target (e.g., "es2022", "es2020"). Defaults to "es2022".
	 */
	target?: string;
};

/**
 * Single version result in trend analysis.
 */
export type TrendVersionResult = {
	/**
	 * Package version.
	 */
	version: string;
	/**
	 * Raw (minified) bundle size in bytes.
	 */
	rawSize: number;
	/**
	 * Gzipped bundle size in bytes (null for node platform).
	 */
	gzipSize: number | null;
	/**
	 * Human-readable raw size (e.g., "45.2 kB").
	 */
	rawSizeFormatted: string;
	/**
	 * Human-readable gzip size (e.g., "12.3 kB") or null.
	 */
	gzipSizeFormatted: string | null;
};

/**
 * Size change information between oldest and newest versions.
 */
export type TrendChange = {
	/**
	 * Oldest version analyzed.
	 */
	fromVersion: string;
	/**
	 * Newest version analyzed.
	 */
	toVersion: string;
	/**
	 * Raw size difference in bytes (positive = increase, negative = decrease).
	 */
	rawDiff: number;
	/**
	 * Raw size percentage change (null if oldest size was 0).
	 */
	rawPercent: number | null;
	/**
	 * Human-readable raw size change (e.g., "+5.2 kB" or "-1.3 kB").
	 */
	rawDiffFormatted: string;
	/**
	 * Gzip size difference in bytes (null if not applicable).
	 */
	gzipDiff: number | null;
	/**
	 * Gzip size percentage change (null if not applicable or oldest size was 0).
	 */
	gzipPercent: number | null;
	/**
	 * Human-readable gzip size change (e.g., "+1.5 kB" or "-0.8 kB") or null.
	 */
	gzipDiffFormatted: string | null;
};

/**
 * Result from getBundleTrend.
 */
export type BundleTrend = {
	/**
	 * Package name.
	 */
	packageName: string;
	/**
	 * Results for each version analyzed (newest first).
	 */
	versions: TrendVersionResult[];
	/**
	 * Size change between oldest and newest versions (null if only one version).
	 */
	change: TrendChange | null;
};

/**
 * Options for fetching package versions.
 */
export type GetPackageVersionsOptions = {
	/**
	 * Package name (e.g., "@mantine/core").
	 */
	package: string;
	/**
	 * Custom npm registry URL.
	 */
	registry?: string;
};

/**
 * Result from getPackageVersions.
 */
export type PackageVersions = {
	/**
	 * All available versions (sorted newest first).
	 */
	versions: string[];
	/**
	 * Distribution tags (e.g., { latest: "7.0.0", next: "8.0.0-beta.1" }).
	 */
	tags: Record<string, string>;
};

/**
 * =============================================================================
 * Library Functions
 * =============================================================================
 */

/**
 * Get bundle size statistics for an npm package.
 *
 * @example
 * ```js
 * import { getBundleStats } from "@node-cli/bundlecheck";
 *
 * const stats = await getBundleStats({
 *   package: "@mantine/core@7.0.0",
 *   exports: ["Button", "Input"],
 * });
 *
 * console.log(stats.gzipSizeFormatted); // "12.3 kB"
 * ```
 *
 */
export async function getBundleStats(
	options: GetBundleStatsOptions,
): Promise<BundleStats> {
	const {
		package: packageName,
		exports: exportsList,
		external: additionalExternals,
		noExternal,
		gzipLevel = 5,
		registry,
		platform: platformOption = "auto",
		force = false,
		target: targetOption,
	} = options;

	// Normalize platform.
	const platform = normalizePlatform(
		platformOption === "auto" ? undefined : platformOption,
	);

	// Normalize target.
	const target = normalizeTarget(targetOption);

	// Parse package specifier.
	const { name: baseName, version: requestedVersion } =
		parsePackageSpecifier(packageName);

	// Resolve "latest" to actual version for cache key.
	let resolvedVersion = requestedVersion;
	if (requestedVersion === "latest") {
		const { tags } = await fetchVersions({
			packageName: baseName,
			registry,
		});
		resolvedVersion = tags.latest || requestedVersion;
	}

	/**
	 * Build cache key.
	 * NOTE: We use additionalExternals here, not computed externals, because the default externals (react, react-dom) are determined at bundle time based on the package's dependencies.
	 * The cache key captures the user's intent (additionalExternals + noExternal
	 * flag), and the actual externals are stored in the cached result.
	 */
	const cacheKey = normalizeCacheKey({
		packageName: baseName,
		version: resolvedVersion,
		exports: exportsList,
		platform,
		gzipLevel,
		externals: additionalExternals || [],
		noExternal: noExternal ?? false,
	});

	// Check cache (unless force is set).
	if (!force) {
		const cached = getCachedResult(cacheKey);
		if (cached) {
			return formatBundleStats(cached, true);
		}
	}

	// Perform the analysis.
	const result = await checkBundleSize({
		packageName,
		exports: exportsList,
		additionalExternals,
		noExternal,
		gzipLevel,
		registry,
		platform,
		target,
	});

	// Store in cache.
	setCachedResult(cacheKey, result);

	return formatBundleStats(result, false);
}

/**
 * Get bundle size trend across multiple versions of a package.
 *
 * @example
 * ```js
 * import { getBundleTrend } from "@node-cli/bundlecheck";
 *
 * const trend = await getBundleTrend({
 *   package: "@mantine/core",
 *   versionCount: 5,
 * });
 *
 * console.log(trend.change?.rawDiffFormatted); // "+5.2 kB"
 * ```
 *
 */
export async function getBundleTrend(
	options: GetBundleTrendOptions,
): Promise<BundleTrend> {
	const {
		package: packageName,
		versionCount = TREND_VERSION_COUNT,
		exports: exportsList,
		external: additionalExternals,
		noExternal,
		gzipLevel,
		registry,
		platform: platformOption = "auto",
		force = false,
		target: targetOption,
	} = options;

	// Normalize platform.
	const platform = normalizePlatform(
		platformOption === "auto" ? undefined : platformOption,
	);

	// Normalize target.
	const target = normalizeTarget(targetOption);

	// Parse package name (ignore version if provided).
	const { name: baseName, subpath } = parsePackageSpecifier(packageName);
	const fullPackagePath = subpath ? `${baseName}/${subpath}` : baseName;

	// Fetch available versions.
	const { versions } = await fetchVersions({
		packageName: baseName,
		registry,
	});

	if (versions.length === 0) {
		throw new Error(`No versions found for package: ${baseName}`);
	}

	// Select versions for trend.
	const trendVersions = selectTrendVersions(versions, versionCount);

	// Analyze all versions (silently - no console output).
	const results = await analyzeTrend({
		packageName: fullPackagePath,
		versions: trendVersions,
		exports: exportsList,
		additionalExternals,
		noExternal,
		gzipLevel,
		boring: true, // Suppress logging
		registry,
		platform,
		force,
		target,
	});

	if (results.length === 0) {
		throw new Error(`Failed to analyze any versions for package: ${baseName}`);
	}

	// Format results.
	const formattedVersions: TrendVersionResult[] = results.map((r) => ({
		version: r.version,
		rawSize: r.rawSize,
		gzipSize: r.gzipSize,
		rawSizeFormatted: formatBytes(r.rawSize),
		gzipSizeFormatted: r.gzipSize !== null ? formatBytes(r.gzipSize) : null,
	}));

	// Calculate change between oldest and newest.
	let change: TrendChange | null = null;
	if (results.length > 1) {
		const newest = results[0];
		const oldest = results[results.length - 1];

		const rawDiff = newest.rawSize - oldest.rawSize;
		// Handle division by zero: if oldest size is 0, percent is null.
		const rawPercent =
			oldest.rawSize === 0 ? null : (rawDiff / oldest.rawSize) * 100;

		let gzipDiff: number | null = null;
		let gzipPercent: number | null = null;
		let gzipDiffFormatted: string | null = null;

		if (newest.gzipSize !== null && oldest.gzipSize !== null) {
			gzipDiff = newest.gzipSize - oldest.gzipSize;
			// Handle division by zero: if oldest size is 0, percent is null.
			gzipPercent =
				oldest.gzipSize === 0 ? null : (gzipDiff / oldest.gzipSize) * 100;
			gzipDiffFormatted =
				gzipDiff >= 0
					? `+${formatBytes(gzipDiff)}`
					: `-${formatBytes(Math.abs(gzipDiff))}`;
		}

		change = {
			fromVersion: oldest.version,
			toVersion: newest.version,
			rawDiff,
			rawPercent:
				rawPercent !== null ? Number.parseFloat(rawPercent.toFixed(1)) : null,
			rawDiffFormatted:
				rawDiff >= 0
					? `+${formatBytes(rawDiff)}`
					: `-${formatBytes(Math.abs(rawDiff))}`,
			gzipDiff,
			gzipPercent:
				gzipPercent !== null ? Number.parseFloat(gzipPercent.toFixed(1)) : null,
			gzipDiffFormatted,
		};
	}

	return {
		packageName: fullPackagePath,
		versions: formattedVersions,
		change,
	};
}

/**
 * Get available versions for an npm package.
 *
 * @example
 * ```js
 * import { getPackageVersions } from "@node-cli/bundlecheck";
 *
 * const { versions, tags } = await getPackageVersions({
 *   package: "@mantine/core",
 * });
 *
 * console.log(tags.latest); // "7.0.0"
 * ```
 *
 */
export async function getPackageVersions(
	options: GetPackageVersionsOptions,
): Promise<PackageVersions> {
	const { package: packageName, registry } = options;

	const result = await fetchVersions({
		packageName,
		registry,
	});

	return {
		versions: result.versions,
		tags: result.tags,
	};
}

/**
 * Options for getting package exports.
 */
export type GetPackageExportsOptions = {
	/**
	 * Package name with optional version (e.g., "@mantine/core" or
	 * "@mantine/core@7.0.0").
	 */
	package: string;
	/**
	 * Custom npm registry URL.
	 */
	registry?: string;
};

/**
 * A named export from a package.
 */
export type PackageExport = {
	/**
	 * The export name (e.g., "Button", "useState").
	 */
	name: string;
	/**
	 * The type of export.
	 */
	kind:
		| "function"
		| "class"
		| "const"
		| "type"
		| "interface"
		| "enum"
		| "unknown";
};

/**
 * Result from getPackageExports.
 */
export type PackageExports = {
	/**
	 * Package name.
	 */
	packageName: string;
	/**
	 * Resolved package version.
	 */
	packageVersion: string;
	/**
	 * Array of all named exports found in the package (including types).
	 */
	exports: PackageExport[];
	/**
	 * Total count of all named exports (including types).
	 */
	count: number;
	/**
	 * Array of runtime exports only (excluding types and interfaces). These are
	 * the exports that can actually be imported at runtime.
	 */
	runtimeExports: PackageExport[];
	/**
	 * Count of runtime exports only (functions, classes, const, enums).
	 */
	runtimeCount: number;
};

/**
 * Get the named exports of an npm package by analyzing its type definitions.
 *
 * @example
 * ```js
 * import { getPackageExports } from "@node-cli/bundlecheck";
 *
 * const { exports, count } = await getPackageExports({
 *   package: "@mantine/core@7.0.0",
 * });
 *
 * console.log(`Found ${count} exports`);
 * console.log(exports.map(e => e.name)); // ["Accordion", "ActionIcon", "Alert", ...]
 * ```
 *
 */
export async function getPackageExports(
	options: GetPackageExportsOptions,
): Promise<PackageExports> {
	const { package: packageName, registry } = options;

	/**
	 * Import the install utilities from bundler (we'll use a minimal bundle
	 * check).
	 */
	const { name: baseName, version: requestedVersion } =
		parsePackageSpecifier(packageName);

	// Resolve "latest" to actual version.
	let resolvedVersion = requestedVersion;
	if (requestedVersion === "latest") {
		const { tags } = await fetchVersions({
			packageName: baseName,
			registry,
		});
		resolvedVersion = tags.latest || requestedVersion;
	}

	/**
	 * Use a minimal bundle check to install the package and get exports We'll
	 * leverage the existing infrastructure.
	 */
	const { installPackage } = await import("./exports-installer.js");

	const { version, exports, runtimeExports } = await installPackage({
		packageName: baseName,
		version: resolvedVersion,
		registry,
	});

	return {
		packageName: baseName,
		packageVersion: version,
		exports: exports.map((e: NamedExport) => ({
			name: e.name,
			kind: e.kind,
		})),
		count: exports.length,
		runtimeExports: runtimeExports.map((e: NamedExport) => ({
			name: e.name,
			kind: e.kind,
		})),
		runtimeCount: runtimeExports.length,
	};
}

/**
 * =============================================================================
 * Re-exports for advanced usage
 * =============================================================================
 */

/**
 * - Format bytes to human-readable string (e.g., 1024 → "1 kB").
 * - Parse a package specifier (e.g., "@scope/name@1.0.0" → { name, version,
 * subpath }).
 */
export { formatBytes, parsePackageSpecifier } from "./bundler.js";
/**
 * - Clear the bundle cache.
 * - Get the number of cached entries.
 */
export { clearCache, getCacheCount } from "./cache.js";

/**
 * =============================================================================
 * Internal Helpers
 * =============================================================================
 */

/**
 * Format a BundleResult into a BundleStats object.
 */
function formatBundleStats(
	result: BundleResult,
	fromCache: boolean,
): BundleStats {
	return {
		packageName: result.packageName,
		packageVersion: result.packageVersion,
		exports: result.exports,
		rawSize: result.rawSize,
		gzipSize: result.gzipSize,
		gzipLevel: result.gzipLevel,
		externals: result.externals,
		dependencies: result.dependencies,
		platform: result.platform,
		rawSizeFormatted: formatBytes(result.rawSize),
		gzipSizeFormatted:
			result.gzipSize !== null ? formatBytes(result.gzipSize) : null,
		fromCache,
		namedExportCount: result.namedExportCount,
	};
}
