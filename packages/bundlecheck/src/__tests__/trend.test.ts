import kleur from "kleur";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bundler from "../bundler.js";
import {
	analyzeTrend,
	renderTrendGraph,
	selectTrendVersions,
	type TrendResult,
} from "../trend.js";

// Mock the bundler module
vi.mock("../bundler.js", async () => {
	const actual = await vi.importActual("../bundler.js");
	return {
		...actual,
		checkBundleSize: vi.fn(),
	};
});

describe("selectTrendVersions", () => {
	it("should return first N versions (most recent)", () => {
		const versions = ["3.0.0", "2.0.0", "1.0.0", "0.9.0", "0.8.0", "0.7.0"];
		const result = selectTrendVersions(versions, 3);
		expect(result).toEqual(["3.0.0", "2.0.0", "1.0.0"]);
	});

	it("should return all versions if count is greater than available", () => {
		const versions = ["2.0.0", "1.0.0"];
		const result = selectTrendVersions(versions, 5);
		expect(result).toEqual(["2.0.0", "1.0.0"]);
	});

	it("should use default count of 5", () => {
		const versions = [
			"6.0.0",
			"5.0.0",
			"4.0.0",
			"3.0.0",
			"2.0.0",
			"1.0.0",
			"0.9.0",
		];
		const result = selectTrendVersions(versions);
		expect(result).toEqual(["6.0.0", "5.0.0", "4.0.0", "3.0.0", "2.0.0"]);
	});

	it("should handle empty array", () => {
		const result = selectTrendVersions([]);
		expect(result).toEqual([]);
	});
});

describe("renderTrendGraph", () => {
	beforeEach(() => {
		kleur.enabled = false;
	});

	it("should return 'No data to display' for empty results", () => {
		const result = renderTrendGraph("test-package", []);
		expect(result).toEqual(["No data to display"]);
	});

	it("should render graph with single result", () => {
		const results: TrendResult[] = [
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);

		expect(lines.some((l) => l.includes("test-package"))).toBe(true);
		expect(lines.some((l) => l.includes("1.0.0"))).toBe(true);
		expect(lines.some((l) => l.includes("Gzip Size:"))).toBe(true);
		expect(lines.some((l) => l.includes("Raw Size:"))).toBe(true);
	});

	it("should render graph with multiple results", () => {
		const results: TrendResult[] = [
			{ version: "2.0.0", rawSize: 2048, gzipSize: 1024 },
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);

		expect(lines.some((l) => l.includes("2.0.0"))).toBe(true);
		expect(lines.some((l) => l.includes("1.0.0"))).toBe(true);
		// Should show change summary
		expect(lines.some((l) => l.includes("Change from"))).toBe(true);
	});

	it("should show correct size change percentages", () => {
		const results: TrendResult[] = [
			{ version: "2.0.0", rawSize: 2048, gzipSize: 1024 },
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);
		const changeLines = lines.filter((l) => l.includes("%"));

		// 100% increase (doubled)
		expect(changeLines.some((l) => l.includes("+100"))).toBe(true);
	});

	it("should handle negative size changes", () => {
		const results: TrendResult[] = [
			{ version: "2.0.0", rawSize: 512, gzipSize: 256 },
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);
		const changeLines = lines.filter((l) => l.includes("%"));

		// 50% decrease
		expect(changeLines.some((l) => l.includes("-50"))).toBe(true);
	});

	it("should handle identical sizes (no change)", () => {
		const results: TrendResult[] = [
			{ version: "2.0.0", rawSize: 1024, gzipSize: 512 },
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);

		// Should show 0% change
		expect(lines.some((l) => l.includes("+0.0%") || l.includes("0.0%"))).toBe(
			true,
		);
	});

	it("should include bar characters", () => {
		const results: TrendResult[] = [
			{ version: "2.0.0", rawSize: 2048, gzipSize: 1024 },
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);

		// Should contain bar character
		expect(lines.some((l) => l.includes("▇"))).toBe(true);
	});

	it("should render bars with correct relative lengths (min-max scaling)", () => {
		const results: TrendResult[] = [
			{ version: "3.0.0", rawSize: 3000, gzipSize: 1500 },
			{ version: "2.0.0", rawSize: 2000, gzipSize: 1000 },
			{ version: "1.0.0", rawSize: 1000, gzipSize: 500 },
		];

		const lines = renderTrendGraph("test-package", results, true);

		// Find the lines with version numbers (they contain the bars)
		const barLines = lines.filter(
			(l) => l.includes("3.0.0") || l.includes("2.0.0") || l.includes("1.0.0"),
		);

		// Largest version should have more bars than smallest
		const v3Line = barLines.find((l) => l.includes("3.0.0"));
		const v1Line = barLines.find((l) => l.includes("1.0.0"));

		if (v3Line && v1Line) {
			const v3Bars = (v3Line.match(/▇/g) || []).length;
			const v1Bars = (v1Line.match(/▇/g) || []).length;
			expect(v3Bars).toBeGreaterThan(v1Bars);
		}
	});

	it("should align version labels correctly", () => {
		const results: TrendResult[] = [
			{ version: "10.0.0", rawSize: 2048, gzipSize: 1024 },
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);

		// Both version lines should exist and have proper formatting
		expect(lines.some((l) => l.includes("10.0.0"))).toBe(true);
		expect(lines.some((l) => l.includes("1.0.0"))).toBe(true);
	});

	it("should not show change summary for single result", () => {
		const results: TrendResult[] = [
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		const lines = renderTrendGraph("test-package", results, true);

		expect(lines.some((l) => l.includes("Change from"))).toBe(false);
	});

	it("should respect boring flag for colors", () => {
		const results: TrendResult[] = [
			{ version: "1.0.0", rawSize: 1024, gzipSize: 512 },
		];

		// With boring=true (no colors)
		const boringLines = renderTrendGraph("test-package", results, true);

		// With boring=false (with colors) - would include ANSI codes
		kleur.enabled = true;
		const colorLines = renderTrendGraph("test-package", results, false);
		kleur.enabled = false;

		// Color lines should contain escape codes
		expect(colorLines.some((l) => l.includes("\x1b["))).toBe(true);
		// Boring lines should not contain escape codes
		expect(boringLines.some((l) => l.includes("\x1b["))).toBe(false);
	});
});

describe("analyzeTrend", () => {
	const mockCheckBundleSize = vi.mocked(bundler.checkBundleSize);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should analyze multiple versions", async () => {
		mockCheckBundleSize
			.mockResolvedValueOnce({
				packageName: "test@2.0.0",
				packageVersion: "2.0.0",
				exports: [],
				rawSize: 2048,
				gzipSize: 1024,
				gzipLevel: 9,
				externals: [],
				dependencies: [],
			})
			.mockResolvedValueOnce({
				packageName: "test@1.0.0",
				packageVersion: "1.0.0",
				exports: [],
				rawSize: 1024,
				gzipSize: 512,
				gzipLevel: 9,
				externals: [],
				dependencies: [],
			});

		const results = await analyzeTrend({
			packageName: "test",
			versions: ["2.0.0", "1.0.0"],
			boring: true,
		});

		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({
			version: "2.0.0",
			rawSize: 2048,
			gzipSize: 1024,
		});
		expect(results[1]).toEqual({
			version: "1.0.0",
			rawSize: 1024,
			gzipSize: 512,
		});
	});

	it("should skip versions that fail to analyze", async () => {
		mockCheckBundleSize
			.mockResolvedValueOnce({
				packageName: "test@2.0.0",
				packageVersion: "2.0.0",
				exports: [],
				rawSize: 2048,
				gzipSize: 1024,
				gzipLevel: 9,
				externals: [],
				dependencies: [],
			})
			.mockRejectedValueOnce(new Error("Version not found"))
			.mockResolvedValueOnce({
				packageName: "test@1.0.0",
				packageVersion: "1.0.0",
				exports: [],
				rawSize: 1024,
				gzipSize: 512,
				gzipLevel: 9,
				externals: [],
				dependencies: [],
			});

		const results = await analyzeTrend({
			packageName: "test",
			versions: ["2.0.0", "1.5.0", "1.0.0"],
			boring: true,
		});

		// Should only have 2 results (skipped 1.5.0)
		expect(results).toHaveLength(2);
		expect(results.map((r) => r.version)).toEqual(["2.0.0", "1.0.0"]);
	});

	it("should pass through all options to checkBundleSize", async () => {
		mockCheckBundleSize.mockResolvedValue({
			packageName: "test@1.0.0",
			packageVersion: "1.0.0",
			exports: ["Button"],
			rawSize: 1024,
			gzipSize: 512,
			gzipLevel: 5,
			externals: ["lodash"],
			dependencies: [],
		});

		await analyzeTrend({
			packageName: "test",
			versions: ["1.0.0"],
			exports: ["Button"],
			additionalExternals: ["lodash"],
			noExternal: false,
			gzipLevel: 5,
			boring: true,
		});

		expect(mockCheckBundleSize).toHaveBeenCalledWith({
			packageName: "test@1.0.0",
			exports: ["Button"],
			additionalExternals: ["lodash"],
			noExternal: false,
			gzipLevel: 5,
		});
	});

	it("should return empty array when all versions fail", async () => {
		mockCheckBundleSize.mockRejectedValue(new Error("All failed"));

		const results = await analyzeTrend({
			packageName: "test",
			versions: ["2.0.0", "1.0.0"],
			boring: true,
		});

		expect(results).toEqual([]);
	});

	it("should handle empty versions array", async () => {
		const results = await analyzeTrend({
			packageName: "test",
			versions: [],
			boring: true,
		});

		expect(results).toEqual([]);
		expect(mockCheckBundleSize).not.toHaveBeenCalled();
	});
});
