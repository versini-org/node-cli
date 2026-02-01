import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the underlying modules before importing
vi.mock("../bundler.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../bundler.js")>();
	return {
		...actual,
		checkBundleSize: vi.fn(),
	};
});

vi.mock("../cache.js", () => ({
	getCachedResult: vi.fn(),
	setCachedResult: vi.fn(),
	normalizeCacheKey: vi.fn((opts) => ({
		packageName: opts.packageName,
		version: opts.version,
		exports: (opts.exports || []).join(","),
		platform: opts.platform ?? "auto",
		gzipLevel: opts.gzipLevel,
		externals: opts.externals.join(","),
		noExternal: opts.noExternal ? 1 : 0,
	})),
	clearCache: vi.fn(),
	getCacheCount: vi.fn(),
}));

vi.mock("../versions.js", () => ({
	fetchPackageVersions: vi.fn(),
}));

vi.mock("../trend.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../trend.js")>();
	return {
		...actual,
		analyzeTrend: vi.fn(),
	};
});

vi.mock("../exports-installer.js", () => ({
	installPackage: vi.fn(),
}));

import { checkBundleSize } from "../bundler.js";
import {
	clearCache as clearCacheMock,
	getCacheCount as getCacheCountMock,
	getCachedResult,
	setCachedResult,
} from "../cache.js";
import { installPackage } from "../exports-installer.js";
import {
	clearCache,
	formatBytes,
	getBundleStats,
	getBundleTrend,
	getCacheCount,
	getPackageExports,
	getPackageVersions,
	parsePackageSpecifier,
} from "../index.js";
import { analyzeTrend } from "../trend.js";
import { fetchPackageVersions } from "../versions.js";

describe("Library API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getBundleStats", () => {
		const mockBundleResult = {
			packageName: "@mantine/core",
			packageVersion: "7.0.0",
			exports: [],
			rawSize: 234567,
			gzipSize: 45678,
			gzipLevel: 5,
			externals: ["react", "react-dom"],
			dependencies: ["@floating-ui/react", "clsx"],
			platform: "browser" as const,
		};

		const mockVersionsResponse = {
			versions: ["7.0.0", "6.0.0"],
			tags: { latest: "7.0.0" },
		};

		it("should return bundle stats for a package", async () => {
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue(mockBundleResult);

			const result = await getBundleStats({
				package: "@mantine/core@7.0.0",
			});

			expect(result).toMatchObject({
				packageName: "@mantine/core",
				packageVersion: "7.0.0",
				rawSize: 234567,
				gzipSize: 45678,
				platform: "browser",
				fromCache: false,
			});
			expect(result.rawSizeFormatted).toBe("229.07 kB");
			expect(result.gzipSizeFormatted).toBe("44.61 kB");
		});

		it("should use cached result when available", async () => {
			vi.mocked(getCachedResult).mockReturnValue(mockBundleResult);

			const result = await getBundleStats({
				package: "@mantine/core@7.0.0",
			});

			expect(result.fromCache).toBe(true);
			expect(checkBundleSize).not.toHaveBeenCalled();
		});

		it("should bypass cache when force is true", async () => {
			vi.mocked(getCachedResult).mockReturnValue(mockBundleResult);
			vi.mocked(checkBundleSize).mockResolvedValue(mockBundleResult);

			const result = await getBundleStats({
				package: "@mantine/core@7.0.0",
				force: true,
			});

			expect(result.fromCache).toBe(false);
			expect(checkBundleSize).toHaveBeenCalled();
		});

		it("should pass exports to checkBundleSize", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue(mockVersionsResponse);
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue({
				...mockBundleResult,
				exports: ["Button", "Input"],
			});

			await getBundleStats({
				package: "@mantine/core",
				exports: ["Button", "Input"],
			});

			expect(checkBundleSize).toHaveBeenCalledWith(
				expect.objectContaining({
					exports: ["Button", "Input"],
				}),
			);
		});

		it("should pass external packages", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue(mockVersionsResponse);
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue(mockBundleResult);

			await getBundleStats({
				package: "@mantine/core",
				external: ["lodash", "dayjs"],
			});

			expect(checkBundleSize).toHaveBeenCalledWith(
				expect.objectContaining({
					additionalExternals: ["lodash", "dayjs"],
				}),
			);
		});

		it("should pass noExternal option", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue(mockVersionsResponse);
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue({
				...mockBundleResult,
				externals: [],
			});

			await getBundleStats({
				package: "@mantine/core",
				noExternal: true,
			});

			expect(checkBundleSize).toHaveBeenCalledWith(
				expect.objectContaining({
					noExternal: true,
				}),
			);
		});

		it("should pass custom gzipLevel", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue(mockVersionsResponse);
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue({
				...mockBundleResult,
				gzipLevel: 9,
			});

			await getBundleStats({
				package: "@mantine/core",
				gzipLevel: 9,
			});

			expect(checkBundleSize).toHaveBeenCalledWith(
				expect.objectContaining({
					gzipLevel: 9,
				}),
			);
		});

		it("should pass custom registry", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue(mockVersionsResponse);
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue(mockBundleResult);

			await getBundleStats({
				package: "@mantine/core",
				registry: "https://npm.mycompany.com",
			});

			expect(checkBundleSize).toHaveBeenCalledWith(
				expect.objectContaining({
					registry: "https://npm.mycompany.com",
				}),
			);
		});

		it("should handle platform option 'node'", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: ["4.18.0"],
				tags: { latest: "4.18.0" },
			});
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue({
				...mockBundleResult,
				packageName: "express",
				platform: "node",
				gzipSize: null,
			});

			const result = await getBundleStats({
				package: "express",
				platform: "node",
			});

			expect(result.platform).toBe("node");
			expect(result.gzipSize).toBeNull();
			expect(result.gzipSizeFormatted).toBeNull();
		});

		it("should handle platform option 'auto'", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue(mockVersionsResponse);
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue(mockBundleResult);

			await getBundleStats({
				package: "@mantine/core",
				platform: "auto",
			});

			expect(checkBundleSize).toHaveBeenCalledWith(
				expect.objectContaining({
					platform: undefined,
				}),
			);
		});

		it("should resolve 'latest' version before caching", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: ["7.0.0", "6.0.0"],
				tags: { latest: "7.0.0" },
			});
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue(mockBundleResult);

			await getBundleStats({
				package: "@mantine/core",
			});

			expect(fetchPackageVersions).toHaveBeenCalled();
		});

		it("should store result in cache after fetching", async () => {
			vi.mocked(getCachedResult).mockReturnValue(null);
			vi.mocked(checkBundleSize).mockResolvedValue(mockBundleResult);

			await getBundleStats({
				package: "@mantine/core@7.0.0",
			});

			expect(setCachedResult).toHaveBeenCalled();
		});
	});

	describe("getBundleTrend", () => {
		const mockTrendResults = [
			{ version: "7.0.0", rawSize: 234567, gzipSize: 45678 },
			{ version: "6.0.0", rawSize: 220000, gzipSize: 42000 },
			{ version: "5.0.0", rawSize: 200000, gzipSize: 38000 },
		];

		beforeEach(() => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: ["7.0.0", "6.0.0", "5.0.0", "4.0.0", "3.0.0"],
				tags: { latest: "7.0.0" },
			});
			vi.mocked(analyzeTrend).mockResolvedValue(mockTrendResults);
		});

		it("should return trend data for a package", async () => {
			const result = await getBundleTrend({
				package: "@mantine/core",
			});

			expect(result.packageName).toBe("@mantine/core");
			expect(result.versions).toHaveLength(3);
			expect(result.versions[0].version).toBe("7.0.0");
		});

		it("should include formatted sizes in version results", async () => {
			const result = await getBundleTrend({
				package: "@mantine/core",
			});

			expect(result.versions[0].rawSizeFormatted).toBe("229.07 kB");
			expect(result.versions[0].gzipSizeFormatted).toBe("44.61 kB");
		});

		it("should calculate change between oldest and newest", async () => {
			const result = await getBundleTrend({
				package: "@mantine/core",
			});

			expect(result.change).not.toBeNull();
			expect(result.change?.fromVersion).toBe("5.0.0");
			expect(result.change?.toVersion).toBe("7.0.0");
			expect(result.change?.rawDiff).toBe(34567);
			expect(result.change?.rawPercent).toBeCloseTo(17.3, 0);
			expect(result.change?.rawDiffFormatted).toBe("+33.76 kB");
		});

		it("should calculate gzip change", async () => {
			const result = await getBundleTrend({
				package: "@mantine/core",
			});

			expect(result.change?.gzipDiff).toBe(7678);
			expect(result.change?.gzipPercent).toBeCloseTo(20.2, 0);
			expect(result.change?.gzipDiffFormatted).toBe("+7.5 kB");
		});

		it("should handle negative change (size decrease)", async () => {
			vi.mocked(analyzeTrend).mockResolvedValue([
				{ version: "2.0.0", rawSize: 50000, gzipSize: 10000 },
				{ version: "1.0.0", rawSize: 100000, gzipSize: 20000 },
			]);

			const result = await getBundleTrend({
				package: "some-package",
			});

			expect(result.change?.rawDiff).toBe(-50000);
			expect(result.change?.rawDiffFormatted).toBe("-48.83 kB");
		});

		it("should return null change for single version", async () => {
			vi.mocked(analyzeTrend).mockResolvedValue([
				{ version: "1.0.0", rawSize: 100000, gzipSize: 20000 },
			]);

			const result = await getBundleTrend({
				package: "some-package",
			});

			expect(result.change).toBeNull();
		});

		it("should pass versionCount to selectTrendVersions", async () => {
			await getBundleTrend({
				package: "@mantine/core",
				versionCount: 10,
			});

			expect(analyzeTrend).toHaveBeenCalledWith(
				expect.objectContaining({
					versions: expect.any(Array),
				}),
			);
		});

		it("should pass exports to analyzeTrend", async () => {
			await getBundleTrend({
				package: "@mantine/core",
				exports: ["Button"],
			});

			expect(analyzeTrend).toHaveBeenCalledWith(
				expect.objectContaining({
					exports: ["Button"],
				}),
			);
		});

		it("should pass external packages to analyzeTrend", async () => {
			await getBundleTrend({
				package: "@mantine/core",
				external: ["lodash"],
			});

			expect(analyzeTrend).toHaveBeenCalledWith(
				expect.objectContaining({
					additionalExternals: ["lodash"],
				}),
			);
		});

		it("should pass force option to analyzeTrend", async () => {
			await getBundleTrend({
				package: "@mantine/core",
				force: true,
			});

			expect(analyzeTrend).toHaveBeenCalledWith(
				expect.objectContaining({
					force: true,
				}),
			);
		});

		it("should throw error when no versions found", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: [],
				tags: {},
			});

			await expect(
				getBundleTrend({
					package: "non-existent-package",
				}),
			).rejects.toThrow("No versions found for package");
		});

		it("should throw error when analyzeTrend returns empty results", async () => {
			vi.mocked(analyzeTrend).mockResolvedValue([]);

			await expect(
				getBundleTrend({
					package: "@mantine/core",
				}),
			).rejects.toThrow("Failed to analyze any versions");
		});

		it("should handle null gzipSize for node platform", async () => {
			vi.mocked(analyzeTrend).mockResolvedValue([
				{ version: "2.0.0", rawSize: 100000, gzipSize: null },
				{ version: "1.0.0", rawSize: 80000, gzipSize: null },
			]);

			const result = await getBundleTrend({
				package: "express",
				platform: "node",
			});

			expect(result.versions[0].gzipSize).toBeNull();
			expect(result.versions[0].gzipSizeFormatted).toBeNull();
			expect(result.change?.gzipDiff).toBeNull();
			expect(result.change?.gzipPercent).toBeNull();
			expect(result.change?.gzipDiffFormatted).toBeNull();
		});

		it("should handle division by zero when oldest rawSize is 0", async () => {
			vi.mocked(analyzeTrend).mockResolvedValue([
				{ version: "2.0.0", rawSize: 50000, gzipSize: 10000 },
				{ version: "1.0.0", rawSize: 0, gzipSize: 0 },
			]);

			const result = await getBundleTrend({
				package: "some-package",
			});

			expect(result.change?.rawDiff).toBe(50000);
			expect(result.change?.rawPercent).toBeNull();
			expect(result.change?.gzipDiff).toBe(10000);
			expect(result.change?.gzipPercent).toBeNull();
		});

		it("should handle subpath in package name", async () => {
			await getBundleTrend({
				package: "@mantine/core/Button",
			});

			expect(analyzeTrend).toHaveBeenCalledWith(
				expect.objectContaining({
					packageName: "@mantine/core/Button",
				}),
			);
		});

		it("should suppress logging with boring: true", async () => {
			await getBundleTrend({
				package: "@mantine/core",
			});

			expect(analyzeTrend).toHaveBeenCalledWith(
				expect.objectContaining({
					boring: true,
				}),
			);
		});
	});

	describe("getPackageVersions", () => {
		it("should return versions and tags for a package", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: ["7.0.0", "6.0.0", "5.0.0"],
				tags: { latest: "7.0.0", next: "8.0.0-beta.1" },
			});

			const result = await getPackageVersions({
				package: "@mantine/core",
			});

			expect(result.versions).toEqual(["7.0.0", "6.0.0", "5.0.0"]);
			expect(result.tags).toEqual({ latest: "7.0.0", next: "8.0.0-beta.1" });
		});

		it("should pass registry option", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: ["1.0.0"],
				tags: { latest: "1.0.0" },
			});

			await getPackageVersions({
				package: "@myorg/private-pkg",
				registry: "https://npm.mycompany.com",
			});

			expect(fetchPackageVersions).toHaveBeenCalledWith({
				packageName: "@myorg/private-pkg",
				registry: "https://npm.mycompany.com",
			});
		});
	});

	describe("getPackageExports", () => {
		const mockExportsResult = {
			version: "7.0.0",
			exports: [
				{ name: "Button", kind: "const" as const },
				{ name: "Input", kind: "const" as const },
				{ name: "ButtonProps", kind: "interface" as const },
			],
			runtimeExports: [
				{ name: "Button", kind: "const" as const },
				{ name: "Input", kind: "const" as const },
			],
		};

		beforeEach(() => {
			vi.mocked(installPackage).mockResolvedValue(mockExportsResult);
		});

		it("should return exports for a package", async () => {
			const result = await getPackageExports({
				package: "@mantine/core@7.0.0",
			});

			expect(result.packageName).toBe("@mantine/core");
			expect(result.packageVersion).toBe("7.0.0");
			expect(result.count).toBe(3);
			expect(result.runtimeCount).toBe(2);
			expect(result.exports).toHaveLength(3);
			expect(result.runtimeExports).toHaveLength(2);
		});

		it("should resolve latest version when not specified", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: ["7.0.0", "6.0.0"],
				tags: { latest: "7.0.0" },
			});

			await getPackageExports({
				package: "@mantine/core",
			});

			expect(fetchPackageVersions).toHaveBeenCalledWith({
				packageName: "@mantine/core",
				registry: undefined,
			});
			expect(installPackage).toHaveBeenCalledWith({
				packageName: "@mantine/core",
				version: "7.0.0",
				registry: undefined,
			});
		});

		it("should pass registry option", async () => {
			vi.mocked(fetchPackageVersions).mockResolvedValue({
				versions: ["1.0.0"],
				tags: { latest: "1.0.0" },
			});

			await getPackageExports({
				package: "@myorg/private-pkg",
				registry: "https://npm.mycompany.com",
			});

			expect(installPackage).toHaveBeenCalledWith({
				packageName: "@myorg/private-pkg",
				version: "1.0.0",
				registry: "https://npm.mycompany.com",
			});
		});

		it("should use specified version directly", async () => {
			await getPackageExports({
				package: "lodash@4.17.21",
			});

			expect(installPackage).toHaveBeenCalledWith({
				packageName: "lodash",
				version: "4.17.21",
				registry: undefined,
			});
		});

		it("should map exports correctly", async () => {
			const result = await getPackageExports({
				package: "@mantine/core@7.0.0",
			});

			expect(result.exports[0]).toEqual({ name: "Button", kind: "const" });
			expect(result.exports[1]).toEqual({ name: "Input", kind: "const" });
			expect(result.exports[2]).toEqual({
				name: "ButtonProps",
				kind: "interface",
			});
		});

		it("should map runtimeExports correctly", async () => {
			const result = await getPackageExports({
				package: "@mantine/core@7.0.0",
			});

			expect(result.runtimeExports[0]).toEqual({
				name: "Button",
				kind: "const",
			});
			expect(result.runtimeExports[1]).toEqual({
				name: "Input",
				kind: "const",
			});
		});
	});

	describe("Re-exported utilities", () => {
		describe("formatBytes", () => {
			it("should format bytes correctly", () => {
				expect(formatBytes(0)).toBe("0 B");
				expect(formatBytes(500)).toBe("500 B");
				expect(formatBytes(1024)).toBe("1 kB");
				expect(formatBytes(1536)).toBe("1.5 kB");
				expect(formatBytes(1048576)).toBe("1 MB");
			});
		});

		describe("parsePackageSpecifier", () => {
			it("should parse package specifiers correctly", () => {
				expect(parsePackageSpecifier("lodash")).toEqual({
					name: "lodash",
					version: "latest",
				});

				expect(parsePackageSpecifier("lodash@4.17.21")).toEqual({
					name: "lodash",
					version: "4.17.21",
				});

				expect(parsePackageSpecifier("@scope/package@1.0.0")).toEqual({
					name: "@scope/package",
					version: "1.0.0",
				});

				expect(parsePackageSpecifier("@scope/package/subpath@2.0.0")).toEqual({
					name: "@scope/package",
					version: "2.0.0",
					subpath: "subpath",
				});
			});
		});

		describe("clearCache", () => {
			it("should delegate to the underlying cache module", () => {
				// Call the re-exported function from index.ts
				clearCache();
				// Verify it delegated to the mocked cache module function
				expect(clearCacheMock).toHaveBeenCalled();
			});
		});

		describe("getCacheCount", () => {
			it("should delegate to the underlying cache module", () => {
				// Setup mock return value on the underlying cache module
				vi.mocked(getCacheCountMock).mockReturnValue(42);
				// Call the re-exported function from index.ts
				const count = getCacheCount();
				// Verify it delegated and returned the expected value
				expect(getCacheCountMock).toHaveBeenCalled();
				expect(count).toBe(42);
			});
		});
	});
});
