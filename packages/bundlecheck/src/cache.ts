import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import type { BundleResult } from "./bundler.js";

const MAX_CACHE_ENTRIES = 100;

/**
 * Get the cache directory path (computed lazily to support testing).
 */
function getCacheDir(): string {
	return path.join(os.homedir(), ".bundlecheck");
}

/**
 * Get the cache database path (computed lazily to support testing).
 */
function getCacheDbPath(): string {
	return path.join(getCacheDir(), "cache.db");
}

export type CacheKey = {
	packageName: string;
	version: string;
	exports: string;
	/**
	 * Platform: "browser", "node", or "auto" (for auto-detection).
	 */
	platform: "browser" | "node" | "auto";
	gzipLevel: number;
	externals: string;
	noExternal: number;
};

export type CachedBundleResult = BundleResult;

type CacheRow = {
	id: number;
	package_name: string;
	version: string;
	exports: string;
	platform: string;
	gzip_level: number;
	externals: string;
	no_external: number;
	raw_size: number;
	gzip_size: number | null;
	dependencies: string;
	display_name: string;
	created_at: number;
};

let db: Database.Database | null = null;

/**
 * Initialize the cache database with proper pragmas and schema.
 */
export function initCache(): Database.Database {
	if (db) {
		return db;
	}

	// Ensure cache directory exists.
	const cacheDir = getCacheDir();
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true });
	}

	db = new Database(getCacheDbPath());

	// Apply pragmas for better CLI performance.
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	// Create table if not exists.
	db.exec(`
		CREATE TABLE IF NOT EXISTS bundle_cache (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			package_name TEXT NOT NULL,
			version TEXT NOT NULL,
			exports TEXT NOT NULL DEFAULT '',
			platform TEXT NOT NULL,
			gzip_level INTEGER NOT NULL,
			externals TEXT NOT NULL DEFAULT '',
			no_external INTEGER NOT NULL DEFAULT 0,
			raw_size INTEGER NOT NULL,
			gzip_size INTEGER,
			dependencies TEXT NOT NULL DEFAULT '[]',
			display_name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			UNIQUE(package_name, version, exports, platform, gzip_level, externals, no_external)
		);

		CREATE INDEX IF NOT EXISTS idx_created_at ON bundle_cache(created_at);
	`);

	return db;
}

/**
 * Normalize cache key options to a consistent format Sorts exports and
 * externals to ensure consistent cache hits.
 *
 * NOTE: platform can be "browser", "node", or "auto" (when user doesn't specify).
 * Using "auto" in the cache key ensures that auto-detected results are cached
 * separately from explicitly specified platform results.
 *
 */
export function normalizeCacheKey(options: {
	packageName: string;
	version: string;
	exports?: string[];
	/**
	 * Platform: "browser", "node", or undefined (treated as "auto").
	 */
	platform: "browser" | "node" | undefined;
	gzipLevel: number;
	externals: string[];
	noExternal: boolean;
}): CacheKey {
	return {
		packageName: options.packageName,
		version: options.version,
		exports: (options.exports || []).slice().sort().join(","),
		/**
		 * Use "auto" when platform is undefined to distinguish from explicit
		 * platform.
		 */
		platform: options.platform ?? "auto",
		gzipLevel: options.gzipLevel,
		externals: options.externals.slice().sort().join(","),
		noExternal: options.noExternal ? 1 : 0,
	};
}

/**
 * Get a cached result if it exists Returns null if not found or if an error
 * occurs (graceful degradation).
 */
export function getCachedResult(key: CacheKey): CachedBundleResult | null {
	try {
		const database = initCache();

		const stmt = database.prepare<
			[string, string, string, string, number, string, number]
		>(`
			SELECT * FROM bundle_cache
			WHERE package_name = ?
			AND version = ?
			AND exports = ?
			AND platform = ?
			AND gzip_level = ?
			AND externals = ?
			AND no_external = ?
		`);

		const row = stmt.get(
			key.packageName,
			key.version,
			key.exports,
			key.platform,
			key.gzipLevel,
			key.externals,
			key.noExternal,
		) as CacheRow | undefined;

		if (!row) {
			return null;
		}

		// Parse dependencies with error handling for corrupted data.
		let dependencies: string[] = [];
		try {
			dependencies = JSON.parse(row.dependencies) as string[];
		} catch {
			// If JSON is corrupted, use empty array.
			dependencies = [];
		}

		// Convert row to BundleResult.
		return {
			packageName: row.display_name,
			packageVersion: row.version,
			exports: row.exports ? row.exports.split(",").filter(Boolean) : [],
			rawSize: row.raw_size,
			gzipSize: row.gzip_size,
			gzipLevel: row.gzip_level,
			externals: row.externals ? row.externals.split(",").filter(Boolean) : [],
			dependencies,
			platform: row.platform as "browser" | "node",
		};
	} catch {
		/**
		 * On any database error, return null (graceful degradation - continue without
		 * cache).
		 */
		return null;
	}
}

/**
 * Store a result in the cache Silently fails on errors (graceful degradation -
 * CLI continues without caching).
 */
export function setCachedResult(key: CacheKey, result: BundleResult): void {
	try {
		const database = initCache();

		/**
		 * Use INSERT OR REPLACE to handle duplicates.
		 * NOTE: This updates created_at on replace, making this LRU-style eviction.
		 */
		const stmt = database.prepare(`
			INSERT OR REPLACE INTO bundle_cache (
				package_name, version, exports, platform, gzip_level, externals, no_external,
				raw_size, gzip_size, dependencies, display_name, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			key.packageName,
			key.version,
			key.exports,
			key.platform,
			key.gzipLevel,
			key.externals,
			key.noExternal,
			result.rawSize,
			result.gzipSize,
			JSON.stringify(result.dependencies),
			result.packageName,
			Date.now(),
		);

		// Enforce max entries (LRU-style eviction based on created_at).
		enforceMaxEntries(database);
	} catch {
		// On any database error, silently continue (graceful degradation).
	}
}

/**
 * Enforce maximum cache entries by removing entries with oldest timestamps Uses
 * LRU-style eviction: entries that are re-checked get updated timestamps and
 * move to the end of the eviction queue.
 */
function enforceMaxEntries(database: Database.Database): void {
	const countResult = database
		.prepare("SELECT COUNT(*) as count FROM bundle_cache")
		.get() as { count: number };

	if (countResult.count > MAX_CACHE_ENTRIES) {
		const toDelete = countResult.count - MAX_CACHE_ENTRIES;
		database
			.prepare(
				`
			DELETE FROM bundle_cache
			WHERE id IN (
				SELECT id FROM bundle_cache
				ORDER BY created_at ASC
				LIMIT ?
			)
		`,
			)
			.run(toDelete);
	}
}

/**
 * Clear all cache entries Silently fails on errors.
 */
export function clearCache(): void {
	try {
		const database = initCache();
		database.prepare("DELETE FROM bundle_cache").run();
	} catch {
		// Silently ignore errors.
	}
}

/**
 * Get the number of cached entries Returns 0 on error.
 */
export function getCacheCount(): number {
	try {
		const database = initCache();
		const result = database
			.prepare("SELECT COUNT(*) as count FROM bundle_cache")
			.get() as { count: number };
		return result.count;
	} catch {
		return 0;
	}
}

/**
 * Close the database connection (useful for testing).
 */
export function closeCache(): void {
	if (db) {
		db.close();
		db = null;
	}
}
