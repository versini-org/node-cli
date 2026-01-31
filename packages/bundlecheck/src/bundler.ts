import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";
import * as esbuild from "esbuild";
import { DEFAULT_EXTERNALS } from "./defaults.js";

const gzipAsync = promisify(zlib.gzip);

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type ParsedPackage = {
	name: string;
	version: string;
	subpath?: string;
};

/**
 * Parse a package specifier to extract name, version, and subpath
 * Handles:
 * - @scope/package@1.0.0
 * - @scope/package/subpath@1.0.0
 * - @scope/package/subpath
 * - package/subpath@1.0.0
 */
export function parsePackageSpecifier(specifier: string): ParsedPackage {
	let workingSpec = specifier;
	let version = "latest";

	// Handle scoped packages (@scope/name...)
	if (workingSpec.startsWith("@")) {
		// Find the second @ which would separate version
		const secondAtIndex = workingSpec.indexOf("@", 1);
		if (secondAtIndex !== -1) {
			version = workingSpec.substring(secondAtIndex + 1);
			workingSpec = workingSpec.substring(0, secondAtIndex);
		}

		// Now workingSpec is like @scope/name or @scope/name/subpath
		// Split by / and check if there are more than 2 parts
		const parts = workingSpec.split("/");
		if (parts.length > 2) {
			// Has subpath: @scope/name/subpath/more
			const name = `${parts[0]}/${parts[1]}`;
			const subpath = parts.slice(2).join("/");
			return { name, version, subpath };
		}
		// No subpath: @scope/name
		return { name: workingSpec, version };
	}

	// Handle non-scoped packages (name@version or name/subpath@version)
	const atIndex = workingSpec.indexOf("@");
	if (atIndex !== -1) {
		version = workingSpec.substring(atIndex + 1);
		workingSpec = workingSpec.substring(0, atIndex);
	}

	// Check for subpath in non-scoped packages
	const slashIndex = workingSpec.indexOf("/");
	if (slashIndex !== -1) {
		const name = workingSpec.substring(0, slashIndex);
		const subpath = workingSpec.substring(slashIndex + 1);
		return { name, version, subpath };
	}

	return { name: workingSpec, version };
}

export type BundleOptions = {
	packageName: string;
	exports?: string[];
	additionalExternals?: string[];
	noExternal?: boolean;
	gzipLevel?: number;
};

export type BundleResult = {
	packageName: string;
	packageVersion: string;
	exports: string[];
	rawSize: number;
	gzipSize: number;
	gzipLevel: number;
	externals: string[];
	dependencies: string[];
};

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 B";
	}
	const k = 1024;
	const sizes = ["B", "kB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Create a temporary directory for bundling
 */
function createTempDir(): string {
	const tmpDir = path.join(os.tmpdir(), `bundlecheck-${Date.now()}`);
	fs.mkdirSync(tmpDir, { recursive: true });
	return tmpDir;
}

/**
 * Clean up temporary directory
 */
function cleanupTempDir(tmpDir: string): void {
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
}

/**
 * Check if pnpm is available
 */
function isPnpmAvailable(): boolean {
	try {
		execSync("pnpm --version", { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

// Cache the result of pnpm availability check
let usePnpm: boolean | null = null;

/**
 * Get the install command (pnpm preferred, npm fallback)
 */
function getInstallCommand(): string {
	if (usePnpm === null) {
		usePnpm = isPnpmAvailable();
	}

	if (usePnpm) {
		return "pnpm install --ignore-scripts";
	}
	return "npm install --legacy-peer-deps --ignore-scripts";
}

export type EntryContentOptions = {
	packageName: string;
	subpath?: string;
	exports?: string[];
	allSubpaths?: string[];
	exportToSubpath?: Map<string, string>;
};

/**
 * Generate the entry file content based on package, subpath, and exports
 */
function generateEntryContent(options: EntryContentOptions): string {
	const { packageName, subpath, exports, allSubpaths, exportToSubpath } =
		options;

	// If we have exports mapped to different subpaths
	if (exportToSubpath && exportToSubpath.size > 0) {
		// Group exports by subpath
		const subpathToExports = new Map<string, string[]>();
		for (const [exportName, sp] of exportToSubpath) {
			const existing = subpathToExports.get(sp) || [];
			existing.push(exportName);
			subpathToExports.set(sp, existing);
		}

		// Generate imports for each subpath
		const lines: string[] = [];
		const allExportNames: string[] = [];

		for (const [sp, exportNames] of subpathToExports) {
			const importPath = `${packageName}/${sp}`;
			const names = exportNames.join(", ");
			lines.push(`import { ${names} } from "${importPath}";`);
			allExportNames.push(...exportNames);
		}

		lines.push(`export { ${allExportNames.join(", ")} };`);
		return lines.join("\n") + "\n";
	}

	// If we have specific exports to import
	if (exports && exports.length > 0) {
		// Determine the import path
		const importPath = subpath ? `${packageName}/${subpath}` : packageName;
		const importNames = exports.join(", ");
		return `import { ${importNames} } from "${importPath}";\nexport { ${importNames} };\n`;
	}

	// If we have a specific subpath (but no specific exports)
	if (subpath) {
		const importPath = `${packageName}/${subpath}`;
		return `import * as pkg from "${importPath}";\nexport default pkg;\n`;
	}

	// If package has subpath exports only (no main entry), import all subpaths
	if (allSubpaths && allSubpaths.length > 0) {
		const imports = allSubpaths
			.map(
				(sp, i) =>
					`import * as sub${i} from "${packageName}/${sp}";\nexport { sub${i} };`,
			)
			.join("\n");
		return imports + "\n";
	}

	// Default: import everything from main entry
	return `import * as pkg from "${packageName}";\nexport default pkg;\n`;
}

/**
 * Get externals list based on options
 */
function getExternals(
	packageName: string,
	externals?: string[],
	noExternal?: boolean,
): string[] {
	if (noExternal) {
		return [];
	}

	// Start with default externals (react, react-dom)
	let result = [...DEFAULT_EXTERNALS];

	// If checking react or react-dom themselves, don't mark them as external
	if (packageName === "react") {
		result = result.filter((e) => e !== "react");
	} else if (packageName === "react-dom") {
		result = result.filter((e) => e !== "react-dom");
	}

	// Add any additional externals
	if (externals && externals.length > 0) {
		result = [...new Set([...result, ...externals])];
	}

	return result;
}

export type PackageExports = Record<
	string,
	string | { import?: string; types?: string }
>;

export type PackageInfo = {
	version: string;
	dependencies: Record<string, string>;
	peerDependencies: Record<string, string>;
	exports: PackageExports | null;
	hasMainEntry: boolean;
};

/**
 * Get version, dependencies, peer dependencies, and exports from an installed package
 */
function getPackageInfo(tmpDir: string, packageName: string): PackageInfo {
	try {
		// Handle scoped packages - the package name in node_modules
		const pkgJsonPath = path.join(
			tmpDir,
			"node_modules",
			packageName,
			"package.json",
		);
		if (fs.existsSync(pkgJsonPath)) {
			const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));

			// Check if package has a main entry point
			const hasMainEntry = Boolean(
				pkgJson.main ||
					pkgJson.module ||
					pkgJson.exports?.["."] ||
					pkgJson.exports?.["./index"] ||
					(!pkgJson.exports && !pkgJson.main && !pkgJson.module),
			);

			return {
				version: pkgJson.version || "unknown",
				dependencies: pkgJson.dependencies || {},
				peerDependencies: pkgJson.peerDependencies || {},
				exports: pkgJson.exports || null,
				hasMainEntry,
			};
		}
	} catch {
		// Ignore errors reading package info
	}
	return {
		version: "unknown",
		dependencies: {},
		peerDependencies: {},
		exports: null,
		hasMainEntry: true,
	};
}

/**
 * Extract subpath export names from package exports field
 * Returns array of subpaths like ["header", "body", "datagrid"]
 */
function getSubpathExports(exports: PackageExports | null): string[] {
	if (!exports) {
		return [];
	}

	const subpaths: string[] = [];
	for (const key of Object.keys(exports)) {
		// Skip the main entry point and package.json
		if (key === "." || key === "./package.json") {
			continue;
		}
		// Remove leading "./" to get subpath name
		if (key.startsWith("./")) {
			subpaths.push(key.substring(2));
		}
	}
	return subpaths;
}

/**
 * Result of finding subpaths for exports
 */
type SubpathMapping = {
	// Single subpath if all exports are from the same subpath
	singleSubpath?: string;
	// Map of export name to subpath for multiple subpaths
	exportToSubpath?: Map<string, string>;
};

/**
 * Find which subpath(s) export the given component names
 * Reads type definition files or JS files to find the exports
 */
function findSubpathsForExports(
	tmpDir: string,
	packageName: string,
	exports: PackageExports,
	componentNames: string[],
): SubpathMapping {
	const packageDir = path.join(tmpDir, "node_modules", packageName);
	const exportToSubpath = new Map<string, string>();

	for (const [subpathKey, subpathValue] of Object.entries(exports)) {
		// Skip main entry and package.json
		if (subpathKey === "." || subpathKey === "./package.json") {
			continue;
		}

		// Get the types or import path
		let filePath: string | undefined;
		if (typeof subpathValue === "object" && subpathValue !== null) {
			// Prefer types file for more accurate export detection
			filePath = subpathValue.types || subpathValue.import;
		} else if (typeof subpathValue === "string") {
			filePath = subpathValue;
		}

		if (!filePath) {
			continue;
		}

		// Resolve the file path
		const fullPath = path.join(packageDir, filePath);

		try {
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, "utf-8");
				const subpath = subpathKey.startsWith("./")
					? subpathKey.substring(2)
					: subpathKey;

				// Check each component name
				for (const name of componentNames) {
					// Skip if already found
					if (exportToSubpath.has(name)) {
						continue;
					}

					// Escape regex special characters in the name to prevent injection
					const escapedName = escapeRegExp(name);

					// Look for various export patterns
					const patterns = [
						new RegExp(`export\\s*\\{[^}]*\\b${escapedName}\\b[^}]*\\}`, "m"),
						new RegExp(
							`export\\s+declare\\s+(?:const|function|class)\\s+${escapedName}\\b`,
							"m",
						),
						new RegExp(
							`export\\s+(?:const|function|class)\\s+${escapedName}\\b`,
							"m",
						),
					];

					if (patterns.some((pattern) => pattern.test(content))) {
						exportToSubpath.set(name, subpath);
					}
				}
			}
		} catch {
			// Ignore read errors, continue to next subpath
		}
	}

	// Check if all exports were found
	if (exportToSubpath.size !== componentNames.length) {
		return {}; // Not all exports found
	}

	// Check if all exports are from the same subpath
	const subpaths = new Set(exportToSubpath.values());
	if (subpaths.size === 1) {
		return { singleSubpath: [...subpaths][0] };
	}

	// Multiple subpaths needed
	return { exportToSubpath };
}

/**
 * Check the bundle size of an npm package
 */
export async function checkBundleSize(
	options: BundleOptions,
): Promise<BundleResult> {
	const {
		packageName: packageSpecifier,
		exports,
		additionalExternals,
		noExternal,
		gzipLevel = 5,
	} = options;

	// Parse the package specifier to extract name, version, and subpath
	const {
		name: packageName,
		version: requestedVersion,
		subpath,
	} = parsePackageSpecifier(packageSpecifier);

	const tmpDir = createTempDir();

	try {
		// Create initial package.json
		const packageJson: {
			name: string;
			version: string;
			type: string;
			dependencies: Record<string, string>;
		} = {
			name: "bundlecheck-temp",
			version: "1.0.0",
			type: "module",
			dependencies: {
				[packageName]: requestedVersion,
			},
		};

		fs.writeFileSync(
			path.join(tmpDir, "package.json"),
			JSON.stringify(packageJson, null, 2),
		);

		// Install the main package (try pnpm first, fallback to npm)
		const installCmd = getInstallCommand();
		execSync(installCmd, {
			cwd: tmpDir,
			stdio: "pipe",
		});

		// Get package info (version, dependencies, peer dependencies, exports)
		const pkgInfo = getPackageInfo(tmpDir, packageName);
		const peerDepKeys = Object.keys(pkgInfo.peerDependencies);

		// Collect all dependency names (prod + peer)
		const allDependencies = [
			...new Set([...Object.keys(pkgInfo.dependencies), ...peerDepKeys]),
		].sort();

		if (peerDepKeys.length > 0) {
			// Add peer dependencies to package.json
			for (const dep of peerDepKeys) {
				// Use the version range from peer dependencies
				packageJson.dependencies[dep] = pkgInfo.peerDependencies[dep];
			}

			// Update package.json and reinstall
			fs.writeFileSync(
				path.join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, 2),
			);

			execSync(installCmd, {
				cwd: tmpDir,
				stdio: "pipe",
			});
		}

		// Determine if we need to use all subpath exports or find the right subpath(s)
		let allSubpaths: string[] | undefined;
		let resolvedSubpath = subpath;
		let exportToSubpath: Map<string, string> | undefined;

		if (!subpath && !pkgInfo.hasMainEntry && pkgInfo.exports) {
			if (exports && exports.length > 0) {
				// User specified exports but no subpath - try to find the right subpath(s)
				const mapping = findSubpathsForExports(
					tmpDir,
					packageName,
					pkgInfo.exports,
					exports,
				);

				if (mapping.singleSubpath) {
					// All exports from the same subpath
					resolvedSubpath = mapping.singleSubpath;
				} else if (mapping.exportToSubpath) {
					// Exports from multiple subpaths
					exportToSubpath = mapping.exportToSubpath;
				}
			}

			// If still no subpath resolved and no mapping, bundle all subpaths
			if (!resolvedSubpath && !exportToSubpath) {
				allSubpaths = getSubpathExports(pkgInfo.exports);
			}
		}

		// Create entry file with appropriate content
		const entryContent = generateEntryContent({
			packageName,
			subpath: resolvedSubpath,
			exports,
			allSubpaths,
			exportToSubpath,
		});
		const entryFile = path.join(tmpDir, "entry.js");
		fs.writeFileSync(entryFile, entryContent);

		// Get externals
		const externals = getExternals(
			packageName,
			additionalExternals,
			noExternal,
		);

		// Bundle with esbuild
		const result = await esbuild.build({
			entryPoints: [entryFile],
			bundle: true,
			write: false,
			format: "esm",
			platform: "browser",
			target: "es2020",
			minify: true,
			treeShaking: true,
			external: externals,
			metafile: true,
		});

		// Get raw size
		const bundleContent = result.outputFiles[0].contents;
		const rawSize = bundleContent.length;

		// Gzip the bundle
		const gzipped = await gzipAsync(Buffer.from(bundleContent), {
			level: gzipLevel,
		});
		const gzipSize = gzipped.length;

		// Determine the display name
		let displayName = packageName;
		if (resolvedSubpath) {
			displayName = `${packageName}/${resolvedSubpath}`;
		} else if (exportToSubpath && exportToSubpath.size > 0) {
			// Multiple subpaths - show them all
			const uniqueSubpaths = [...new Set(exportToSubpath.values())].sort();
			displayName = `${packageName}/{${uniqueSubpaths.join(", ")}}`;
		}

		return {
			packageName: displayName,
			packageVersion: pkgInfo.version,
			exports: exports || [],
			rawSize,
			gzipSize,
			gzipLevel,
			externals,
			dependencies: allDependencies,
		};
	} finally {
		cleanupTempDir(tmpDir);
	}
}
