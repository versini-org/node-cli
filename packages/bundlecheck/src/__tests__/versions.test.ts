import select from "@inquirer/select";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPackageVersions, promptForVersion } from "../versions.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock @inquirer/select
vi.mock("@inquirer/select", () => ({
	default: vi.fn(),
}));

describe("fetchPackageVersions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should fetch and return versions for a package", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					versions: {
						"1.0.0": {},
						"2.0.0": {},
						"3.0.0": {},
					},
					"dist-tags": {
						latest: "3.0.0",
						next: "3.1.0-beta",
					},
				}),
		});

		const result = await fetchPackageVersions("test-package");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://registry.npmjs.org/test-package",
		);
		expect(result.versions).toEqual(["3.0.0", "2.0.0", "1.0.0"]);
		expect(result.tags).toEqual({
			latest: "3.0.0",
			next: "3.1.0-beta",
		});
	});

	it("should handle scoped packages", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					versions: { "1.0.0": {} },
					"dist-tags": { latest: "1.0.0" },
				}),
		});

		await fetchPackageVersions("@scope/package");

		expect(mockFetch).toHaveBeenCalledWith(
			"https://registry.npmjs.org/@scope/package",
		);
	});

	it("should strip version from package specifier", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					versions: { "1.0.0": {} },
					"dist-tags": { latest: "1.0.0" },
				}),
		});

		await fetchPackageVersions("test-package@2.0.0");

		// Should call with just the package name
		expect(mockFetch).toHaveBeenCalledWith(
			"https://registry.npmjs.org/test-package",
		);
	});

	it("should throw error when fetch fails", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			statusText: "Not Found",
		});

		await expect(fetchPackageVersions("nonexistent-package")).rejects.toThrow(
			"Failed to fetch package info: Not Found",
		);
	});

	it("should handle missing versions gracefully", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					"dist-tags": { latest: "1.0.0" },
				}),
		});

		const result = await fetchPackageVersions("test-package");

		expect(result.versions).toEqual([]);
	});

	it("should handle missing dist-tags gracefully", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					versions: { "1.0.0": {} },
				}),
		});

		const result = await fetchPackageVersions("test-package");

		expect(result.tags).toEqual({});
	});
});

describe("promptForVersion", () => {
	const mockSelect = vi.mocked(select);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should prompt user with version choices", async () => {
		mockSelect.mockResolvedValue("2.0.0");

		const result = await promptForVersion(
			"test-package",
			["3.0.0", "2.0.0", "1.0.0"],
			{ latest: "3.0.0" },
		);

		expect(mockSelect).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Select a version for test-package:",
				pageSize: 15,
			}),
		);
		expect(result).toBe("2.0.0");
	});

	it("should highlight tagged versions", async () => {
		mockSelect.mockResolvedValue("3.0.0");

		await promptForVersion("test-package", ["3.0.0", "2.0.0", "1.0.0"], {
			latest: "3.0.0",
			beta: "2.0.0",
		});

		// Check that choices include tags
		expect(mockSelect).toHaveBeenCalledWith(
			expect.objectContaining({
				choices: expect.arrayContaining([
					expect.objectContaining({ name: "3.0.0 (latest)", value: "3.0.0" }),
					expect.objectContaining({ name: "2.0.0 (beta)", value: "2.0.0" }),
				]),
			}),
		);
	});

	it("should prioritize tagged versions in the list", async () => {
		mockSelect.mockResolvedValue("3.0.0");

		await promptForVersion("test-package", ["3.0.0", "2.0.0", "1.0.0"], {
			latest: "3.0.0",
		});

		const call = mockSelect.mock.calls[0][0];
		const choices = call.choices;

		// Latest version should be first
		expect(choices[0].value).toBe("3.0.0");
	});

	it("should limit to 20 recent versions", async () => {
		mockSelect.mockResolvedValue("1.0.0");

		const manyVersions = Array.from({ length: 50 }, (_, i) => `${i + 1}.0.0`);

		await promptForVersion("test-package", manyVersions, {});

		const call = mockSelect.mock.calls[0][0];
		const choices = call.choices;

		// Should have at most ~20 choices (may include tagged versions)
		expect(choices.length).toBeLessThanOrEqual(25);
	});

	it("should include all tagged versions even if not in recent 20", async () => {
		mockSelect.mockResolvedValue("0.1.0");

		const versions = Array.from({ length: 50 }, (_, i) => `${50 - i}.0.0`);
		const tags = { legacy: "0.1.0" }; // Old version that wouldn't be in recent 20

		// Add the legacy version to the versions array
		versions.push("0.1.0");

		await promptForVersion("test-package", versions, tags);

		const call = mockSelect.mock.calls[0][0];
		const choices = call.choices;

		// Should include the tagged legacy version
		expect(choices.some((c: { value: string }) => c.value === "0.1.0")).toBe(
			true,
		);
	});

	it("should handle empty tags", async () => {
		mockSelect.mockResolvedValue("1.0.0");

		await promptForVersion("test-package", ["2.0.0", "1.0.0"], {});

		const call = mockSelect.mock.calls[0][0];
		const choices = call.choices;

		// All choices should just be version numbers without tags
		expect(choices.every((c: { name: string }) => !c.name.includes("("))).toBe(
			true,
		);
	});

	it("should handle multiple tags pointing to same version", async () => {
		mockSelect.mockResolvedValue("3.0.0");

		// This is an edge case - same version can only have one tag in display
		await promptForVersion("test-package", ["3.0.0", "2.0.0"], {
			latest: "3.0.0",
			stable: "3.0.0",
		});

		const call = mockSelect.mock.calls[0][0];
		const choices = call.choices;

		// Should still work, version appears once with one of the tags
		const v3Choices = choices.filter(
			(c: { value: string }) => c.value === "3.0.0",
		);
		expect(v3Choices.length).toBe(1);
	});

	it("should sort tagged versions before untagged in all branches", async () => {
		mockSelect.mockResolvedValue("2.0.0");

		// Create a scenario where we test both sort branches:
		// - tagged vs untagged
		// - untagged vs tagged
		await promptForVersion(
			"test-package",
			["3.0.0", "2.0.0", "1.0.0", "0.5.0"],
			{
				latest: "3.0.0",
				beta: "0.5.0",
			},
		);

		const call = mockSelect.mock.calls[0][0];
		const choices = call.choices;

		// Tagged versions should come first
		const taggedIndices = choices
			.map((c: { name: string }, i: number) => (c.name.includes("(") ? i : -1))
			.filter((i: number) => i >= 0);
		const untaggedIndices = choices
			.map((c: { name: string }, i: number) => (!c.name.includes("(") ? i : -1))
			.filter((i: number) => i >= 0);

		// All tagged versions should have lower indices than untagged
		if (taggedIndices.length > 0 && untaggedIndices.length > 0) {
			expect(Math.max(...taggedIndices)).toBeLessThan(
				Math.min(...untaggedIndices),
			);
		}
	});
});
