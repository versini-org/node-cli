import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BundleResult } from "../bundler.js";
import {
	clearCache,
	closeCache,
	getCacheCount,
	getCachedResult,
	normalizeCacheKey,
	setCachedResult,
} from "../cache.js";

// Mock the cache directory to use a temp directory for tests
let testDir: string;
let testCounter = 0;

beforeEach(() => {
	// Close any existing database connection first (before restoring mocks)
	closeCache();

	// Restore mocks after closing db
	vi.restoreAllMocks();

	// Create a unique temp directory for each test (use counter for uniqueness)
	testCounter++;
	testDir = path.join(
		os.tmpdir(),
		`bundlecheck-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`,
	);
	fs.mkdirSync(testDir, { recursive: true });

	// Mock os.homedir to return our test directory
	vi.spyOn(os, "homedir").mockReturnValue(testDir);
});

afterEach(() => {
	// Close the database connection first (before restoring mocks)
	closeCache();

	// Restore os.homedir
	vi.restoreAllMocks();

	// Clean up test directory
	try {
		fs.rmSync(testDir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
});

describe("normalizeCacheKey", () => {
	it("should normalize exports by sorting them", () => {
		const key = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: ["Button", "ScrollArea", "Alert"],
			platform: "browser",
			gzipLevel: 5,
			externals: ["react", "react-dom"],
			noExternal: false,
		});

		expect(key.exports).toBe("Alert,Button,ScrollArea");
	});

	it("should normalize externals by sorting them", () => {
		const key = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: ["react-dom", "react", "vue"],
			noExternal: false,
		});

		expect(key.externals).toBe("react,react-dom,vue");
	});

	it("should handle empty exports", () => {
		const key = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: undefined,
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		expect(key.exports).toBe("");
	});

	it("should handle empty externals", () => {
		const key = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		expect(key.externals).toBe("");
	});

	it("should convert noExternal boolean to number", () => {
		const keyWithTrue = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: true,
		});

		const keyWithFalse = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		expect(keyWithTrue.noExternal).toBe(1);
		expect(keyWithFalse.noExternal).toBe(0);
	});

	it("should preserve all other fields", () => {
		const key = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: ["Button"],
			platform: "node",
			gzipLevel: 9,
			externals: ["react"],
			noExternal: false,
		});

		expect(key.packageName).toBe("@mantine/core");
		expect(key.version).toBe("8.0.0");
		expect(key.platform).toBe("node");
		expect(key.gzipLevel).toBe(9);
	});

	it("should not mutate original arrays", () => {
		const exports = ["Button", "Alert"];
		const externals = ["react-dom", "react"];

		normalizeCacheKey({
			packageName: "test",
			version: "1.0.0",
			exports,
			platform: "browser",
			gzipLevel: 5,
			externals,
			noExternal: false,
		});

		// Original arrays should not be mutated
		expect(exports).toEqual(["Button", "Alert"]);
		expect(externals).toEqual(["react-dom", "react"]);
	});
});

describe("getCachedResult", () => {
	it("should return null for missing cache entry", () => {
		const key = normalizeCacheKey({
			packageName: "nonexistent",
			version: "1.0.0",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const result = getCachedResult(key);
		expect(result).toBeNull();
	});
});

describe("setCachedResult and getCachedResult", () => {
	const mockResult: BundleResult = {
		packageName: "@mantine/core",
		packageVersion: "8.0.0",
		exports: ["Button", "ScrollArea"],
		rawSize: 12345,
		gzipSize: 4567,
		gzipLevel: 5,
		externals: ["react", "react-dom"],
		dependencies: ["@mantine/hooks", "clsx"],
		platform: "browser",
	};

	it("should store and retrieve a cache entry", () => {
		const key = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: ["Button", "ScrollArea"],
			platform: "browser",
			gzipLevel: 5,
			externals: ["react", "react-dom"],
			noExternal: false,
		});

		setCachedResult(key, mockResult);
		const cached = getCachedResult(key);

		expect(cached).not.toBeNull();
		expect(cached?.packageName).toBe("@mantine/core");
		expect(cached?.packageVersion).toBe("8.0.0");
		expect(cached?.rawSize).toBe(12345);
		expect(cached?.gzipSize).toBe(4567);
		expect(cached?.platform).toBe("browser");
	});

	it("should handle null gzipSize for node platform", () => {
		const nodeResult: BundleResult = {
			...mockResult,
			gzipSize: null,
			platform: "node",
		};

		const key = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: [],
			platform: "node",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		setCachedResult(key, nodeResult);
		const cached = getCachedResult(key);

		expect(cached?.gzipSize).toBeNull();
		expect(cached?.platform).toBe("node");
	});

	it("should return correct exports array from cached result", () => {
		const key = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: ["Button", "ScrollArea"],
			platform: "browser",
			gzipLevel: 5,
			externals: ["react", "react-dom"],
			noExternal: false,
		});

		setCachedResult(key, mockResult);
		const cached = getCachedResult(key);

		expect(cached?.exports).toEqual(["Button", "ScrollArea"]);
	});

	it("should return correct dependencies array from cached result", () => {
		const key = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		setCachedResult(key, mockResult);
		const cached = getCachedResult(key);

		expect(cached?.dependencies).toEqual(["@mantine/hooks", "clsx"]);
	});

	it("should replace existing entry with same key", () => {
		const key = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const result1: BundleResult = {
			...mockResult,
			packageName: "lodash",
			rawSize: 1000,
		};

		const result2: BundleResult = {
			...mockResult,
			packageName: "lodash",
			rawSize: 2000,
		};

		setCachedResult(key, result1);
		setCachedResult(key, result2);

		const cached = getCachedResult(key);
		expect(cached?.rawSize).toBe(2000);
		expect(getCacheCount()).toBe(1);
	});

	it("should differentiate by version", () => {
		const key1 = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.20",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const key2 = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const result1: BundleResult = { ...mockResult, rawSize: 1000 };
		const result2: BundleResult = { ...mockResult, rawSize: 2000 };

		setCachedResult(key1, result1);
		setCachedResult(key2, result2);

		expect(getCachedResult(key1)?.rawSize).toBe(1000);
		expect(getCachedResult(key2)?.rawSize).toBe(2000);
		expect(getCacheCount()).toBe(2);
	});

	it("should differentiate by exports", () => {
		const key1 = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: ["Button"],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const key2 = normalizeCacheKey({
			packageName: "@mantine/core",
			version: "8.0.0",
			exports: ["Button", "ScrollArea"],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const result1: BundleResult = { ...mockResult, rawSize: 1000 };
		const result2: BundleResult = { ...mockResult, rawSize: 2000 };

		setCachedResult(key1, result1);
		setCachedResult(key2, result2);

		expect(getCachedResult(key1)?.rawSize).toBe(1000);
		expect(getCachedResult(key2)?.rawSize).toBe(2000);
	});

	it("should differentiate by platform", () => {
		const keyBrowser = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "browser",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const keyNode = normalizeCacheKey({
			packageName: "lodash",
			version: "4.17.21",
			exports: [],
			platform: "node",
			gzipLevel: 5,
			externals: [],
			noExternal: false,
		});

		const browserResult: BundleResult = {
			...mockResult,
			platform: "browser",
			rawSize: 1000,
		};
		const nodeResult: BundleResult = {
			...mockResult,
			platform: "node",
			rawSize: 2000,
		};

		setCachedResult(keyBrowser, browserResult);
		setCachedResult(keyNode, nodeResult);

		expect(getCachedResult(keyBrowser)?.rawSize).toBe(1000);
		expect(getCachedResult(keyNode)?.rawSize).toBe(2000);
	});
});

describe("clearCache", () => {
	it("should remove all cache entries", () => {
		const mockResult: BundleResult = {
			packageName: "test",
			packageVersion: "1.0.0",
			exports: [],
			rawSize: 100,
			gzipSize: 50,
			gzipLevel: 5,
			externals: [],
			dependencies: [],
			platform: "browser",
		};

		// Add some entries
		for (let i = 0; i < 5; i++) {
			const key = normalizeCacheKey({
				packageName: `package-${i}`,
				version: "1.0.0",
				exports: [],
				platform: "browser",
				gzipLevel: 5,
				externals: [],
				noExternal: false,
			});
			setCachedResult(key, { ...mockResult, packageName: `package-${i}` });
		}

		expect(getCacheCount()).toBe(5);

		clearCache();

		expect(getCacheCount()).toBe(0);
	});
});

describe("cache eviction", () => {
	it("should enforce maximum of 100 entries", () => {
		const mockResult: BundleResult = {
			packageName: "test",
			packageVersion: "1.0.0",
			exports: [],
			rawSize: 100,
			gzipSize: 50,
			gzipLevel: 5,
			externals: [],
			dependencies: [],
			platform: "browser",
		};

		// Add 105 entries
		for (let i = 0; i < 105; i++) {
			const key = normalizeCacheKey({
				packageName: `package-${i}`,
				version: "1.0.0",
				exports: [],
				platform: "browser",
				gzipLevel: 5,
				externals: [],
				noExternal: false,
			});
			setCachedResult(key, { ...mockResult, packageName: `package-${i}` });
		}

		// Should have at most 100 entries
		expect(getCacheCount()).toBe(100);
	});

	it("should evict oldest entries first (FIFO)", () => {
		const mockResult: BundleResult = {
			packageName: "test",
			packageVersion: "1.0.0",
			exports: [],
			rawSize: 100,
			gzipSize: 50,
			gzipLevel: 5,
			externals: [],
			dependencies: [],
			platform: "browser",
		};

		// Add 105 entries
		for (let i = 0; i < 105; i++) {
			const key = normalizeCacheKey({
				packageName: `package-${i}`,
				version: "1.0.0",
				exports: [],
				platform: "browser",
				gzipLevel: 5,
				externals: [],
				noExternal: false,
			});
			setCachedResult(key, { ...mockResult, packageName: `package-${i}` });
		}

		// First 5 entries should be evicted
		for (let i = 0; i < 5; i++) {
			const key = normalizeCacheKey({
				packageName: `package-${i}`,
				version: "1.0.0",
				exports: [],
				platform: "browser",
				gzipLevel: 5,
				externals: [],
				noExternal: false,
			});
			expect(getCachedResult(key)).toBeNull();
		}

		// Entries 5-104 should still exist
		for (let i = 5; i < 105; i++) {
			const key = normalizeCacheKey({
				packageName: `package-${i}`,
				version: "1.0.0",
				exports: [],
				platform: "browser",
				gzipLevel: 5,
				externals: [],
				noExternal: false,
			});
			expect(getCachedResult(key)).not.toBeNull();
		}
	});
});

describe("getCacheCount", () => {
	it("should return 0 for empty cache", () => {
		expect(getCacheCount()).toBe(0);
	});

	it("should return correct count after adding entries", () => {
		const mockResult: BundleResult = {
			packageName: "test",
			packageVersion: "1.0.0",
			exports: [],
			rawSize: 100,
			gzipSize: 50,
			gzipLevel: 5,
			externals: [],
			dependencies: [],
			platform: "browser",
		};

		for (let i = 0; i < 3; i++) {
			const key = normalizeCacheKey({
				packageName: `package-${i}`,
				version: "1.0.0",
				exports: [],
				platform: "browser",
				gzipLevel: 5,
				externals: [],
				noExternal: false,
			});
			setCachedResult(key, mockResult);
		}

		expect(getCacheCount()).toBe(3);
	});
});
