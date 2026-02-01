import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getNamedExports, type NamedExport } from "./exports.js";

/**
 * Check if pnpm is available.
 */
function isPnpmAvailable(): boolean {
	try {
		execSync("pnpm --version", { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

// Cache the result of pnpm availability check.
let usePnpm: boolean | null = null;

/**
 * Validate and sanitize a registry URL to prevent command injection.
 */
function validateRegistryUrl(registry: string): string {
	let url: URL;
	try {
		url = new URL(registry);
	} catch {
		throw new Error(
			`Invalid registry URL: ${registry}. Must be a valid URL (e.g., https://registry.example.com)`,
		);
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error(
			`Invalid registry URL protocol: ${url.protocol}. Only http: and https: are allowed`,
		);
	}

	return url.toString();
}

/**
 * Get the install command (pnpm preferred, npm fallback).
 */
function getInstallCommand(registry?: string): string {
	if (usePnpm === null) {
		usePnpm = isPnpmAvailable();
	}

	let registryArg = "";
	if (registry) {
		const sanitizedRegistry = validateRegistryUrl(registry);
		registryArg = ` --registry "${sanitizedRegistry}"`;
	}

	if (usePnpm) {
		return `pnpm install --ignore-scripts --no-frozen-lockfile${registryArg}`;
	}
	return `npm install --legacy-peer-deps --ignore-scripts${registryArg}`;
}

/**
 * Create a temporary directory for installation.
 */
function createTempDir(): string {
	const tmpDir = path.join(os.tmpdir(), `bundlecheck-exports-${Date.now()}`);
	fs.mkdirSync(tmpDir, { recursive: true });
	return tmpDir;
}

/**
 * Clean up temporary directory.
 */
function cleanupTempDir(tmpDir: string): void {
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors.
	}
}

export type InstallPackageOptions = {
	packageName: string;
	version: string;
	registry?: string;
};

export type InstallPackageResult = {
	version: string;
	exports: NamedExport[];
	runtimeExports: NamedExport[];
};

/**
 * Install a package temporarily and extract its named exports.
 */
export async function installPackage(
	options: InstallPackageOptions,
): Promise<InstallPackageResult> {
	const { packageName, version, registry } = options;
	const tmpDir = createTempDir();

	try {
		// Create minimal package.json
		const packageJson = {
			name: "bundlecheck-exports-temp",
			version: "1.0.0",
			type: "module",
			dependencies: {
				[packageName]: version,
			},
		};

		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify(packageJson, null, 2),
		);

		// Install the package
		const installCmd = getInstallCommand(registry);
		execSync(installCmd, {
			cwd: tmpDir,
			stdio: "pipe",
		});

		// Read the installed version
		const pkgJsonPath = path.join(
			tmpDir,
			"node_modules",
			packageName,
			"package.json",
		);
		let installedVersion = version;
		if (fs.existsSync(pkgJsonPath)) {
			const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
			installedVersion = pkgJson.version || version;
		}

		// Get named exports
		const { exports, runtimeExports } = getNamedExports(tmpDir, packageName);

		return {
			version: installedVersion,
			exports,
			runtimeExports,
		};
	} finally {
		cleanupTempDir(tmpDir);
	}
}

/**
 * Alias for backward compatibility.
 */
export const getPackageInfoAndExports = installPackage;
