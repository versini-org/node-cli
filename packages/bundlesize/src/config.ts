import type { FooterProperties } from "./utilities.js";

/**
 * Configuration for a single file size entry.
 */
export interface SizeEntry {
	/**
	 * Path to the file to check. Supports glob patterns. Special placeholders:
	 * - `<hash>`: matches content hashes (e.g., `bundle-<hash>.js`)
	 * - `<semver>`: matches semantic versions (e.g., `lib-<semver>.js`)
	 */
	path: string;
	/**
	 * Maximum allowed size for the file (gzipped). Format: number followed by unit
	 * (B, kB, KB, MB, GB, TB, PB).
	 * @example "10 kB", "1.5 MB", "500 B"
	 */
	limit: string;
	/**
	 * Optional alias for the file in reports. Useful for giving meaningful names
	 * to files with hash patterns.
	 */
	alias?: string;
}

/**
 * Configuration for a header entry (group separator in reports).
 */
export interface HeaderEntry {
	/**
	 * Header text to display as a group separator in reports.
	 */
	header: string;
}

/**
 * Column definition for the report table.
 */
export interface ColumnDefinition {
	[key: string]: string;
}

/**
 * Configuration for generating comparison reports.
 */
export interface ReportConfiguration {
	/**
	 * Path to the current stats JSON file (relative to config file).
	 */
	current: string;
	/**
	 * Path to the previous stats JSON file for comparison (relative to config
	 * file).
	 */
	previous: string;
	/**
	 * Custom header text for the report.
	 * @default "## Bundle Size"
	 */
	header?: string;
	/**
	 * Custom footer function for the report. Receives an object with limitReached,
	 * overallDiff, and totalGzipSize.
	 */
	footer?: (args: FooterProperties) => string;
	/**
	 * Column definitions for the report table.
	 * @default [{ status: "Status" }, { file: "File" }, { size: "Size (Gzip)" }, { limits: "Limits" }]
	 */
	columns?: ColumnDefinition[];
	/**
	 * Minimum gzip size change in bytes to consider as a change. Changes below
	 * this threshold are treated as no change.
	 * @default 0
	 */
	threshold?: number;
}

/**
 * Bundlesize configuration object.
 */
export interface BundlesizeConfig {
	/**
	 * Array of file size entries to check. Each entry can be either a SizeEntry
	 * (file to check) or HeaderEntry (group separator).
	 */
	sizes?: (SizeEntry | HeaderEntry)[];
	/**
	 * Configuration for generating comparison reports.
	 */
	report?: ReportConfiguration;
}

/**
 * Helper function to define bundlesize configuration with full type support.
 * Provides IntelliSense and type checking for configuration files.
 *
 * @example
 * ```js
 * import { defineConfig } from "@node-cli/bundlesize";
 *
 * export default defineConfig({
 *   sizes: [
 *     { path: "dist/bundle.js", limit: "10 kB" }
 *   ]
 * });
 * ```
 *
 */
/* v8 ignore start */
export function defineConfig(config: BundlesizeConfig): BundlesizeConfig {
	return config;
}
/* v8 ignore stop */
