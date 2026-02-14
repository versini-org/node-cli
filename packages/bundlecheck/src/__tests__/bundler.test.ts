import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import * as esbuild from "esbuild";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkBundleSize,
	expandExternalsForEsbuild,
	formatBytes,
	parsePackageSpecifier,
} from "../bundler.js";

// Mock modules
vi.mock("node:child_process");
vi.mock("node:fs");
vi.mock("node:os");
vi.mock("esbuild");

describe("parsePackageSpecifier", () => {
	describe("scoped packages", () => {
		it("should parse scoped package without version", () => {
			const result = parsePackageSpecifier("@scope/package");
			expect(result).toEqual({
				name: "@scope/package",
				version: "latest",
			});
		});

		it("should parse scoped package with version", () => {
			const result = parsePackageSpecifier("@scope/package@1.0.0");
			expect(result).toEqual({
				name: "@scope/package",
				version: "1.0.0",
			});
		});

		it("should parse scoped package with subpath", () => {
			const result = parsePackageSpecifier("@scope/package/subpath");
			expect(result).toEqual({
				name: "@scope/package",
				version: "latest",
				subpath: "subpath",
			});
		});

		it("should parse scoped package with subpath and version", () => {
			const result = parsePackageSpecifier("@scope/package/subpath@2.0.0");
			expect(result).toEqual({
				name: "@scope/package",
				version: "2.0.0",
				subpath: "subpath",
			});
		});

		it("should parse scoped package with nested subpath", () => {
			const result = parsePackageSpecifier("@scope/package/sub/path/deep");
			expect(result).toEqual({
				name: "@scope/package",
				version: "latest",
				subpath: "sub/path/deep",
			});
		});

		it("should parse scoped package with nested subpath and version", () => {
			const result = parsePackageSpecifier("@scope/package/sub/path@3.0.0");
			expect(result).toEqual({
				name: "@scope/package",
				version: "3.0.0",
				subpath: "sub/path",
			});
		});
	});

	describe("non-scoped packages", () => {
		it("should parse simple package without version", () => {
			const result = parsePackageSpecifier("lodash");
			expect(result).toEqual({
				name: "lodash",
				version: "latest",
			});
		});

		it("should parse simple package with version", () => {
			const result = parsePackageSpecifier("lodash@4.17.21");
			expect(result).toEqual({
				name: "lodash",
				version: "4.17.21",
			});
		});

		it("should parse package with subpath", () => {
			const result = parsePackageSpecifier("lodash/fp");
			expect(result).toEqual({
				name: "lodash",
				version: "latest",
				subpath: "fp",
			});
		});

		it("should parse package with subpath and version", () => {
			const result = parsePackageSpecifier("lodash/fp@4.17.21");
			expect(result).toEqual({
				name: "lodash",
				version: "4.17.21",
				subpath: "fp",
			});
		});
	});
});

describe("formatBytes", () => {
	it("should return '0 B' for 0 bytes", () => {
		expect(formatBytes(0)).toBe("0 B");
	});

	it("should format bytes correctly", () => {
		expect(formatBytes(500)).toBe("500 B");
		expect(formatBytes(1023)).toBe("1023 B");
	});

	it("should format kilobytes correctly", () => {
		expect(formatBytes(1024)).toBe("1 kB");
		expect(formatBytes(1536)).toBe("1.5 kB");
		expect(formatBytes(10240)).toBe("10 kB");
	});

	it("should format megabytes correctly", () => {
		expect(formatBytes(1048576)).toBe("1 MB");
		expect(formatBytes(1572864)).toBe("1.5 MB");
	});

	it("should format gigabytes correctly", () => {
		expect(formatBytes(1073741824)).toBe("1 GB");
	});
});

describe("expandExternalsForEsbuild", () => {
	it("should return empty array for empty input", () => {
		expect(expandExternalsForEsbuild([])).toEqual([]);
	});

	it("should expand react to include jsx-runtime subpaths", () => {
		const result = expandExternalsForEsbuild(["react"]);
		expect(result).toContain("react");
		expect(result).toContain("react/jsx-runtime");
		expect(result).toContain("react/jsx-dev-runtime");
	});

	it("should expand react-dom to include client and server subpaths", () => {
		const result = expandExternalsForEsbuild(["react-dom"]);
		expect(result).toContain("react-dom");
		expect(result).toContain("react-dom/client");
		expect(result).toContain("react-dom/server");
	});

	it("should expand both react and react-dom", () => {
		const result = expandExternalsForEsbuild(["react", "react-dom"]);
		expect(result).toContain("react");
		expect(result).toContain("react/jsx-runtime");
		expect(result).toContain("react/jsx-dev-runtime");
		expect(result).toContain("react-dom");
		expect(result).toContain("react-dom/client");
		expect(result).toContain("react-dom/server");
	});

	it("should pass through packages without known subpaths", () => {
		const result = expandExternalsForEsbuild(["lodash", "dayjs"]);
		expect(result).toEqual(["lodash", "dayjs"]);
	});

	it("should handle mixed packages with and without subpaths", () => {
		const result = expandExternalsForEsbuild(["react", "lodash"]);
		expect(result).toContain("react");
		expect(result).toContain("react/jsx-runtime");
		expect(result).toContain("react/jsx-dev-runtime");
		expect(result).toContain("lodash");
		expect(result).not.toContain("lodash/fp"); // lodash has no subpath mapping
	});

	it("should deduplicate results", () => {
		const result = expandExternalsForEsbuild(["react", "react"]);
		const reactCount = result.filter((r) => r === "react").length;
		expect(reactCount).toBe(1);
	});
});

describe("checkBundleSize", () => {
	const mockPackageJson = {
		name: "test-package",
		version: "1.0.0",
		main: "./dist/index.js",
		dependencies: { clsx: "^2.0.0" },
		peerDependencies: {},
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock os.tmpdir
		vi.mocked(os.tmpdir).mockReturnValue("/tmp");

		// Mock fs functions
		vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
		vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
		vi.mocked(fs.rmSync).mockReturnValue(undefined);
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

		// Mock execSync - first call checks pnpm, subsequent calls install packages
		vi.mocked(execSync).mockImplementation((cmd: string) => {
			if (cmd === "pnpm --version") {
				return Buffer.from("8.0.0");
			}
			return Buffer.from("");
		});

		// Mock esbuild
		vi.mocked(esbuild.build).mockResolvedValue({
			outputFiles: [
				{
					contents: new Uint8Array(Buffer.from("minified code")),
					path: "entry.js",
					text: "minified code",
					hash: "abc123",
				},
			],
			errors: [],
			warnings: [],
			metafile: { inputs: {}, outputs: {} },
			mangleCache: {},
		});

		// Ensure Date.now returns consistent value for temp dir
		vi.spyOn(Date, "now").mockReturnValue(12345);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should analyze bundle size for a simple package", async () => {
		const result = await checkBundleSize({
			packageName: "test-package",
		});

		expect(result).toMatchObject({
			packageName: "test-package",
			packageVersion: "1.0.0",
			exports: [],
		});
		expect(result.rawSize).toBeGreaterThan(0);
		expect(result.gzipSize).toBeGreaterThan(0);
		// react and react-dom are NOT external since the package doesn't have them as dependencies
		expect(result.externals).not.toContain("react");
		expect(result.externals).not.toContain("react-dom");
	});

	it("should respect noExternal option", async () => {
		const result = await checkBundleSize({
			packageName: "test-package",
			noExternal: true,
		});

		expect(result.externals).toEqual([]);
	});

	it("should add additional externals", async () => {
		const result = await checkBundleSize({
			packageName: "test-package",
			additionalExternals: ["lodash", "dayjs"],
		});

		// react and react-dom are NOT external since the package doesn't have them as dependencies
		expect(result.externals).not.toContain("react");
		expect(result.externals).not.toContain("react-dom");
		// Additional externals are added
		expect(result.externals).toContain("lodash");
		expect(result.externals).toContain("dayjs");
	});

	it("should not mark react as external when checking react itself", async () => {
		const result = await checkBundleSize({
			packageName: "react",
		});

		// When checking react, it should never be external (even if it were somehow in deps)
		expect(result.externals).not.toContain("react");
	});

	it("should include react/react-dom as external when package has them as peer dependencies", async () => {
		vi.mocked(fs.readFileSync).mockReturnValue(
			JSON.stringify({
				name: "test-package",
				version: "1.0.0",
				main: "./dist/index.js",
				dependencies: {},
				peerDependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
			}),
		);

		const result = await checkBundleSize({
			packageName: "test-package",
		});

		// react and react-dom ARE external since they're in peerDependencies
		expect(result.externals).toContain("react");
		expect(result.externals).toContain("react-dom");
	});

	it("should include react as external when package has it as prod dependency", async () => {
		vi.mocked(fs.readFileSync).mockReturnValue(
			JSON.stringify({
				name: "test-package",
				version: "1.0.0",
				main: "./dist/index.js",
				dependencies: { react: "^18.0.0" },
				peerDependencies: {},
			}),
		);

		const result = await checkBundleSize({
			packageName: "test-package",
		});

		// react IS external since it's in dependencies
		expect(result.externals).toContain("react");
		// react-dom is NOT external since it's not in dependencies
		expect(result.externals).not.toContain("react-dom");
	});

	it("should handle specific exports", async () => {
		const result = await checkBundleSize({
			packageName: "test-package",
			exports: ["Button", "Input"],
		});

		expect(result.exports).toEqual(["Button", "Input"]);
	});

	it("should handle package with version", async () => {
		const result = await checkBundleSize({
			packageName: "test-package@2.0.0",
		});

		expect(result.packageName).toBe("test-package");
	});

	it("should handle peer dependencies", async () => {
		vi.mocked(fs.readFileSync).mockReturnValue(
			JSON.stringify({
				name: "test-package",
				version: "1.0.0",
				main: "./dist/index.js",
				dependencies: {},
				peerDependencies: { react: "^18.0.0" },
			}),
		);

		const result = await checkBundleSize({
			packageName: "test-package",
		});

		expect(result.dependencies).toContain("react");
		// react should be external since it's in peerDependencies
		expect(result.externals).toContain("react");
	});

	it("should respect custom gzip level", async () => {
		const result = await checkBundleSize({
			packageName: "test-package",
			gzipLevel: 1,
		});

		expect(result.gzipLevel).toBe(1);
	});

	it("should use default gzip level when not specified", async () => {
		const result = await checkBundleSize({
			packageName: "test-package",
		});

		expect(result.gzipLevel).toBe(5);
	});

	it("should pass valid registry URL to install command", async () => {
		await checkBundleSize({
			packageName: "test-package",
			registry: "https://registry.example.com",
		});

		// Verify execSync was called with the registry flag
		const execCalls = vi.mocked(execSync).mock.calls;
		const installCall = execCalls.find(
			(call) => typeof call[0] === "string" && call[0].includes("--registry"),
		);
		expect(installCall).toBeDefined();
		expect(installCall?.[0]).toContain(
			'--registry "https://registry.example.com/"',
		);
	});

	it("should reject invalid registry URL", async () => {
		await expect(
			checkBundleSize({
				packageName: "test-package",
				registry: "not-a-valid-url",
			}),
		).rejects.toThrow("Invalid registry URL");
	});

	it("should reject non-http/https registry URL", async () => {
		await expect(
			checkBundleSize({
				packageName: "test-package",
				registry: "ftp://registry.example.com",
			}),
		).rejects.toThrow("Invalid registry URL protocol");
	});

	it("should reject registry URL with command injection attempt", async () => {
		await expect(
			checkBundleSize({
				packageName: "test-package",
				registry: "https://evil.com; rm -rf /",
			}),
		).rejects.toThrow("Invalid registry URL");
	});

	it("should handle package with subpath", async () => {
		const result = await checkBundleSize({
			packageName: "@scope/package/subpath",
		});

		expect(result.packageName).toBe("@scope/package/subpath");
	});

	it("should cleanup temp directory on success", async () => {
		await checkBundleSize({ packageName: "test-package" });

		expect(fs.rmSync).toHaveBeenCalledWith(
			expect.stringContaining("bundlecheck-"),
			expect.objectContaining({ recursive: true, force: true }),
		);
	});

	it("should cleanup temp directory on error", async () => {
		vi.mocked(esbuild.build).mockRejectedValue(new Error("Build failed"));

		await expect(
			checkBundleSize({ packageName: "test-package" }),
		).rejects.toThrow("Build failed");

		expect(fs.rmSync).toHaveBeenCalled();
	});

	it("should fallback to npm when pnpm is not available", async () => {
		// Reset the module-level usePnpm cache by clearing all mocks first
		vi.resetModules();

		// Re-import after resetting modules
		const { checkBundleSize: freshCheckBundleSize } = await import(
			"../bundler.js"
		);

		// Mock execSync to throw for pnpm --version
		vi.mocked(execSync).mockImplementation((cmd: string) => {
			if (cmd === "pnpm --version") {
				throw new Error("pnpm not found");
			}
			return Buffer.from("");
		});

		await freshCheckBundleSize({ packageName: "test-package" });

		// Should have called npm install
		expect(execSync).toHaveBeenCalledWith(
			expect.stringContaining("npm install"),
			expect.any(Object),
		);
	});

	it("should handle package info read failure gracefully", async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);

		const result = await checkBundleSize({
			packageName: "test-package",
		});

		expect(result.packageVersion).toBe("unknown");
		expect(result.dependencies).toEqual([]);
	});

	it("should handle subpath exports for packages without main entry", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./header": {
							types: "./dist/Header/index.d.ts",
							import: "./dist/Header/index.js",
						},
						"./footer": {
							types: "./dist/Footer/index.d.ts",
							import: "./dist/Footer/index.js",
						},
					},
				});
			}
			if (pathStr.includes("index.d.ts")) {
				return "export declare const Header: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
		});

		// Should bundle all subpaths when no main entry
		expect(result).toBeDefined();
	});

	it("should find single subpath for exports", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./header": {
							types: "./dist/Header/index.d.ts",
							import: "./dist/Header/index.js",
						},
						"./footer": {
							types: "./dist/Footer/index.d.ts",
							import: "./dist/Footer/index.js",
						},
					},
				});
			}
			if (pathStr.includes("Header/index.d.ts")) {
				return "export declare const HeaderComponent: any;";
			}
			if (pathStr.includes("Footer/index.d.ts")) {
				return "export declare const FooterComponent: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["HeaderComponent"],
		});

		expect(result.packageName).toBe("@scope/pkg/header");
	});

	it("should find multiple subpaths for exports from different subpaths", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./header": {
							types: "./dist/Header/index.d.ts",
							import: "./dist/Header/index.js",
						},
						"./footer": {
							types: "./dist/Footer/index.d.ts",
							import: "./dist/Footer/index.js",
						},
					},
				});
			}
			if (pathStr.includes("Header/index.d.ts")) {
				return "export declare const HeaderComponent: any;";
			}
			if (pathStr.includes("Footer/index.d.ts")) {
				return "export declare const FooterComponent: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["HeaderComponent", "FooterComponent"],
		});

		// Should show multiple subpaths in the name
		expect(result.packageName).toContain("{");
		expect(result.packageName).toContain("footer");
		expect(result.packageName).toContain("header");
	});

	it("should handle string export paths in package exports", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./utils": "./dist/utils.js",
					},
				});
			}
			if (pathStr.includes("utils.js")) {
				return "export const helperFunction = () => {};";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["helperFunction"],
		});

		expect(result.packageName).toBe("@scope/pkg/utils");
	});

	it("should handle exports not found in any subpath", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./header": {
							types: "./dist/Header/index.d.ts",
							import: "./dist/Header/index.js",
						},
					},
				});
			}
			if (pathStr.includes("index.d.ts")) {
				return "export declare const SomeOtherComponent: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["NonExistentComponent"],
		});

		// Should fall back to bundling all subpaths
		expect(result).toBeDefined();
	});

	it("should skip export paths with null value", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./header": {
							types: "./dist/Header/index.d.ts",
							import: "./dist/Header/index.js",
						},
						"./internal": null,
					},
				});
			}
			if (pathStr.includes("index.d.ts")) {
				return "export declare const Header: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
		});

		expect(result).toBeDefined();
	});

	it("should handle subpath keys without ./ prefix", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						header: {
							types: "./dist/Header/index.d.ts",
							import: "./dist/Header/index.js",
						},
					},
				});
			}
			if (pathStr.includes("index.d.ts")) {
				return "export declare const Header: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["Header"],
		});

		expect(result).toBeDefined();
	});

	it("should handle export detection for 'export { Name }' pattern", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./utils": {
							types: "./dist/utils.d.ts",
							import: "./dist/utils.js",
						},
					},
				});
			}
			if (pathStr.includes("utils.d.ts")) {
				return "export { MyFunction, AnotherThing };";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["MyFunction"],
		});

		expect(result.packageName).toBe("@scope/pkg/utils");
	});

	it("should handle export detection for 'export const Name' pattern", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./utils": {
							import: "./dist/utils.js",
						},
					},
				});
			}
			if (pathStr.includes("utils.js")) {
				return "export const myConstant = 42;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["myConstant"],
		});

		expect(result.packageName).toBe("@scope/pkg/utils");
	});

	it("should handle file read errors gracefully in subpath detection", async () => {
		let callCount = 0;
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./header": {
							types: "./dist/Header/index.d.ts",
						},
						"./footer": {
							types: "./dist/Footer/index.d.ts",
						},
					},
				});
			}
			callCount++;
			if (callCount === 1) {
				throw new Error("Read error");
			}
			return "export declare const FooterComp: any;";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["FooterComp"],
		});

		expect(result).toBeDefined();
	});

	it("should skip main entry (.) in exports", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						".": "./dist/index.js",
						"./package.json": "./package.json",
						"./utils": "./dist/utils.js",
					},
				});
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
		});

		expect(result).toBeDefined();
	});

	it("should handle package.json parse error in getPackageInfo", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return "invalid json {{{";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "test-package",
		});

		expect(result.packageVersion).toBe("unknown");
	});

	it("should handle file not existing in subpath detection", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./utils": {
							types: "./dist/utils.d.ts",
						},
					},
				});
			}
			return "";
		});
		vi.mocked(fs.existsSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			// Package.json exists, but utils.d.ts doesn't
			return pathStr.includes("package.json");
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["SomeExport"],
		});

		expect(result).toBeDefined();
	});

	it("should handle already found exports when scanning subpaths", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./header": {
							types: "./dist/Header/index.d.ts",
						},
						"./header2": {
							types: "./dist/Header2/index.d.ts",
						},
					},
				});
			}
			// Both files export the same component (edge case)
			return "export declare const SharedComponent: any;";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["SharedComponent"],
		});

		// Should find it in the first subpath and skip subsequent ones
		expect(result.packageName).toBe("@scope/pkg/header");
	});

	it("should skip ./package.json in exports when finding subpaths", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					// No main entry - only subpaths
					exports: {
						"./package.json": "./package.json",
						"./utils": {
							types: "./dist/utils.d.ts",
						},
					},
				});
			}
			if (pathStr.includes("utils.d.ts")) {
				return "export declare const UtilFunc: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["UtilFunc"],
		});

		expect(result.packageName).toBe("@scope/pkg/utils");
	});

	it("should handle export with empty object value", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "@scope/pkg",
					version: "1.0.0",
					exports: {
						"./empty": {},
						"./utils": {
							types: "./dist/utils.d.ts",
						},
					},
				});
			}
			if (pathStr.includes("utils.d.ts")) {
				return "export declare const UtilFunc: any;";
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "@scope/pkg",
			exports: ["UtilFunc"],
		});

		expect(result.packageName).toBe("@scope/pkg/utils");
	});

	it("should handle null exports field in package", async () => {
		vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
			const pathStr = filePath.toString();
			if (pathStr.includes("package.json")) {
				return JSON.stringify({
					name: "test-pkg",
					version: "1.0.0",
					main: "./dist/index.js",
					exports: null,
				});
			}
			return "";
		});

		const result = await checkBundleSize({
			packageName: "test-pkg",
		});

		expect(result).toBeDefined();
	});

	describe("platform option", () => {
		it("should default to browser platform", async () => {
			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("browser");
		});

		it("should use explicit browser platform", async () => {
			const result = await checkBundleSize({
				packageName: "test-package",
				platform: "browser",
			});

			expect(result.platform).toBe("browser");
			expect(result.gzipSize).not.toBeNull();
		});

		it("should use explicit node platform", async () => {
			const result = await checkBundleSize({
				packageName: "test-package",
				platform: "node",
			});

			expect(result.platform).toBe("node");
		});

		it("should return null gzipSize for node platform", async () => {
			const result = await checkBundleSize({
				packageName: "test-package",
				platform: "node",
			});

			expect(result.gzipSize).toBeNull();
		});

		it("should return gzipSize for browser platform", async () => {
			const result = await checkBundleSize({
				packageName: "test-package",
				platform: "browser",
			});

			expect(result.gzipSize).not.toBeNull();
			expect(result.gzipSize).toBeGreaterThan(0);
		});

		it("should auto-detect node platform from engines.node", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: {},
					peerDependencies: {},
					engines: {
						node: ">=18.0.0",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("node");
			expect(result.gzipSize).toBeNull();
		});

		it("should default to browser when no engines specified", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: {},
					peerDependencies: {},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("browser");
		});

		it("should use explicit platform even when engines.node is present", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: {},
					peerDependencies: {},
					engines: {
						node: ">=18.0.0",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
				platform: "browser",
			});

			expect(result.platform).toBe("browser");
			expect(result.gzipSize).not.toBeNull();
		});

		it("should pass platform to esbuild", async () => {
			await checkBundleSize({
				packageName: "test-package",
				platform: "node",
			});

			expect(esbuild.build).toHaveBeenCalledWith(
				expect.objectContaining({
					platform: "node",
				}),
			);
		});

		it("should not auto-detect node when engines.browser is also present", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: {},
					peerDependencies: {},
					engines: {
						node: ">=18.0.0",
						browser: ">= ES2020",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("browser");
		});

		it("should detect browser platform when engines.node is present but react is in peerDependencies", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: {},
					peerDependencies: {
						react: "^18.0.0",
						"react-dom": "^18.0.0",
					},
					engines: {
						node: ">=18.17.0",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("browser");
			expect(result.gzipSize).not.toBeNull();
		});

		it("should detect browser platform when engines.node is present but react is in dependencies", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: { react: "^18.0.0" },
					peerDependencies: {},
					engines: {
						node: ">=18.0.0",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("browser");
			expect(result.gzipSize).not.toBeNull();
		});

		it("should detect browser platform when engines.node is present but vue is in dependencies", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: { vue: "^3.0.0" },
					peerDependencies: {},
					engines: {
						node: ">=16.0.0",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("browser");
			expect(result.gzipSize).not.toBeNull();
		});

		it("should detect browser platform when engines.node is present but svelte is in peerDependencies", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: {},
					peerDependencies: { svelte: "^4.0.0" },
					engines: {
						node: ">=18.0.0",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("browser");
			expect(result.gzipSize).not.toBeNull();
		});

		it("should still auto-detect node when engines.node is present and no browser framework deps", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					main: "./dist/index.js",
					dependencies: { lodash: "^4.0.0" },
					peerDependencies: {},
					engines: {
						node: ">=18.0.0",
					},
				}),
			);

			const result = await checkBundleSize({
				packageName: "test-package",
			});

			expect(result.platform).toBe("node");
			expect(result.gzipSize).toBeNull();
		});
	});
});
