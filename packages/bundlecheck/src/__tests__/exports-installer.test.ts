import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as exports from "../exports.js";

// Mock modules
vi.mock("node:child_process");
vi.mock("node:fs");
vi.mock("node:os");
vi.mock("../exports.js");

describe("exports-installer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset module to clear cached usePnpm value
		vi.resetModules();

		// Default mocks
		vi.mocked(os.tmpdir).mockReturnValue("/tmp");
		vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
		vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
		vi.mocked(fs.rmSync).mockReturnValue(undefined);
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(
			JSON.stringify({ version: "1.0.0" }),
		);
		vi.mocked(execSync).mockReturnValue(Buffer.from(""));
		vi.mocked(exports.getNamedExports).mockReturnValue({
			exports: [{ name: "TestExport", kind: "function" }],
			count: 1,
			runtimeExports: [{ name: "TestExport", kind: "function" }],
			runtimeCount: 1,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("installPackage", () => {
		it("should install a package and return its exports", async () => {
			const { installPackage } = await import("../exports-installer.js");
			const result = await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(result.version).toBe("1.0.0");
			expect(result.exports).toEqual([
				{ name: "TestExport", kind: "function" },
			]);
			expect(result.runtimeExports).toEqual([
				{ name: "TestExport", kind: "function" },
			]);
		});

		it("should create a temporary directory", async () => {
			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(fs.mkdirSync).toHaveBeenCalledWith(
				expect.stringContaining("bundlecheck-exports-"),
				{ recursive: true },
			);
		});

		it("should write package.json with the correct dependencies", async () => {
			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "@scope/test-package",
				version: "2.0.0",
			});

			expect(fs.writeFileSync).toHaveBeenCalledWith(
				expect.stringContaining("package.json"),
				expect.stringContaining('"@scope/test-package": "2.0.0"'),
			);
		});

		it("should use pnpm when available", async () => {
			// pnpm is available (no error thrown)
			vi.mocked(execSync).mockImplementation((cmd) => {
				if (String(cmd) === "pnpm --version") {
					return Buffer.from("8.0.0");
				}
				return Buffer.from("");
			});

			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(execSync).toHaveBeenCalledWith(
				expect.stringContaining("pnpm install"),
				expect.any(Object),
			);
		});

		it("should fall back to npm when pnpm is not available", async () => {
			// pnpm is not available
			vi.mocked(execSync).mockImplementation((cmd) => {
				if (String(cmd) === "pnpm --version") {
					throw new Error("pnpm not found");
				}
				return Buffer.from("");
			});

			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(execSync).toHaveBeenCalledWith(
				expect.stringContaining("npm install"),
				expect.any(Object),
			);
		});

		it("should include registry flag when registry is provided", async () => {
			vi.mocked(execSync).mockImplementation((cmd) => {
				if (String(cmd) === "pnpm --version") {
					return Buffer.from("8.0.0");
				}
				return Buffer.from("");
			});

			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "test-package",
				version: "1.0.0",
				registry: "https://registry.example.com",
			});

			expect(execSync).toHaveBeenCalledWith(
				expect.stringContaining('--registry "https://registry.example.com/"'),
				expect.any(Object),
			);
		});

		it("should reject invalid registry URLs", async () => {
			const { installPackage } = await import("../exports-installer.js");
			await expect(
				installPackage({
					packageName: "test-package",
					version: "1.0.0",
					registry: "not-a-valid-url",
				}),
			).rejects.toThrow("Invalid registry URL");
		});

		it("should reject non-http/https registry URLs", async () => {
			const { installPackage } = await import("../exports-installer.js");
			await expect(
				installPackage({
					packageName: "test-package",
					version: "1.0.0",
					registry: "ftp://registry.example.com",
				}),
			).rejects.toThrow("Invalid registry URL protocol");
		});

		it("should read the installed package version from node_modules", async () => {
			vi.mocked(fs.readFileSync).mockReturnValue(
				JSON.stringify({ version: "1.2.3" }),
			);

			const { installPackage } = await import("../exports-installer.js");
			const result = await installPackage({
				packageName: "test-package",
				version: "^1.0.0",
			});

			expect(result.version).toBe("1.2.3");
		});

		it("should use provided version when package.json read fails", async () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);

			const { installPackage } = await import("../exports-installer.js");
			const result = await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(result.version).toBe("1.0.0");
		});

		it("should clean up temporary directory after success", async () => {
			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(fs.rmSync).toHaveBeenCalledWith(
				expect.stringContaining("bundlecheck-exports-"),
				{ recursive: true, force: true },
			);
		});

		it("should clean up temporary directory after failure", async () => {
			vi.mocked(execSync).mockImplementation((cmd) => {
				if (String(cmd) === "pnpm --version") {
					return Buffer.from("8.0.0");
				}
				throw new Error("Install failed");
			});

			const { installPackage } = await import("../exports-installer.js");
			await expect(
				installPackage({
					packageName: "test-package",
					version: "1.0.0",
				}),
			).rejects.toThrow("Install failed");

			expect(fs.rmSync).toHaveBeenCalledWith(
				expect.stringContaining("bundlecheck-exports-"),
				{ recursive: true, force: true },
			);
		});

		it("should ignore cleanup errors", async () => {
			vi.mocked(fs.rmSync).mockImplementation(() => {
				throw new Error("Cleanup failed");
			});

			const { installPackage } = await import("../exports-installer.js");
			// Should not throw
			const result = await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(result.exports).toBeDefined();
		});

		it("should call getNamedExports with correct arguments", async () => {
			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "@scope/test-package",
				version: "1.0.0",
			});

			expect(exports.getNamedExports).toHaveBeenCalledWith(
				expect.stringContaining("bundlecheck-exports-"),
				"@scope/test-package",
			);
		});

		it("should handle npm install with --legacy-peer-deps and --ignore-scripts", async () => {
			vi.mocked(execSync).mockImplementation((cmd) => {
				if (String(cmd) === "pnpm --version") {
					throw new Error("pnpm not found");
				}
				return Buffer.from("");
			});

			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(execSync).toHaveBeenCalledWith(
				expect.stringContaining("--legacy-peer-deps"),
				expect.any(Object),
			);
			expect(execSync).toHaveBeenCalledWith(
				expect.stringContaining("--ignore-scripts"),
				expect.any(Object),
			);
		});

		it("should handle pnpm install with --ignore-scripts and --no-frozen-lockfile", async () => {
			vi.mocked(execSync).mockImplementation((cmd) => {
				if (String(cmd) === "pnpm --version") {
					return Buffer.from("8.0.0");
				}
				return Buffer.from("");
			});

			const { installPackage } = await import("../exports-installer.js");
			await installPackage({
				packageName: "test-package",
				version: "1.0.0",
			});

			expect(execSync).toHaveBeenCalledWith(
				expect.stringContaining("--ignore-scripts"),
				expect.any(Object),
			);
			expect(execSync).toHaveBeenCalledWith(
				expect.stringContaining("--no-frozen-lockfile"),
				expect.any(Object),
			);
		});
	});
});
