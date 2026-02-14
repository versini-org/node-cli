/* istanbul ignore file */

export const defaultFlags = {
	boring: false,
	gzipLevel: 5,
	external: "",
	noExternal: false,
	versions: false,
	registry: "",
	platform: "auto",
	force: false,
	target: "es2022",
};

/**
 * Normalize platform aliases to canonical esbuild platform values.
 * - "auto" → undefined (triggers auto-detection based on package engines)
 * - Browser aliases: "browser", "web", "desktop", "client" → "browser"
 * - Node aliases: "node", "server", "nodejs", "backend" → "node"
 */
export function normalizePlatform(
	platform: string | undefined,
): "browser" | "node" | undefined {
	if (!platform) {
		return undefined;
	}

	const normalized = platform.toLowerCase().trim();

	// Auto-detect from package.json engines.
	if (normalized === "auto") {
		return undefined;
	}

	// Node aliases.
	if (["node", "server", "nodejs", "backend"].includes(normalized)) {
		return "node";
	}

	// Browser aliases.
	if (["browser", "web", "desktop", "client"].includes(normalized)) {
		return "browser";
	}

	// Invalid value - will be caught by validation.
	return normalized as "browser" | "node";
}

/**
 * Check if a platform value is valid (either canonical or alias).
 */
export function isValidPlatform(platform: string | undefined): boolean {
	if (platform === undefined) {
		return true;
	}

	const normalized = platform.toLowerCase().trim();

	// Empty string after trim is invalid.
	if (normalized === "") {
		return false;
	}
	const validValues = [
		// Auto-detect.
		"auto",
		// Browser.
		"browser",
		"web",
		"desktop",
		"client",
		// Node.
		"node",
		"server",
		"nodejs",
		"backend",
	];

	return validValues.includes(normalized);
}

export const TREND_VERSION_COUNT = 5;

/**
 * Default esbuild target for bundling.
 */
export const DEFAULT_TARGET = "es2022";

/**
 * Valid esbuild target values.
 * Includes ECMAScript versions (es2015-es2024, esnext) and browser/runtime targets.
 */
export const VALID_TARGETS = [
	"es2015",
	"es2016",
	"es2017",
	"es2018",
	"es2019",
	"es2020",
	"es2021",
	"es2022",
	"es2023",
	"es2024",
	"esnext",
];

/**
 * Check if a target value is valid.
 */
export function isValidTarget(target: string | undefined): boolean {
	if (target === undefined) {
		return true;
	}

	const normalized = target.toLowerCase().trim();

	// Empty string after trim is invalid.
	if (normalized === "") {
		return false;
	}

	return VALID_TARGETS.includes(normalized);
}

/**
 * Normalize target to lowercase.
 */
export function normalizeTarget(target: string | undefined): string {
	if (!target) {
		return DEFAULT_TARGET;
	}
	return target.toLowerCase().trim();
}

/**
 * Browser framework packages used for platform auto-detection. If a package has
 * any of these in its dependencies or peerDependencies, it's treated as a
 * browser package even if it specifies engines.node (many browser packages set
 * engines.node for build tooling or SSR compatibility).
 */
export const BROWSER_FRAMEWORK_DEPS = [
	"react",
	"react-dom",
	"vue",
	"svelte",
	"@angular/core",
	"preact",
	"solid-js",
];

/**
 * Base packages to auto-detect for externalization. These are checked against
 * the package's dependencies/peerDependencies.
 */
export const DEFAULT_EXTERNALS = ["react", "react-dom"];

/**
 * Subpath externals to add when a base package is detected. When "react" is in
 * dependencies, we also need to externalize "react/jsx-runtime" etc. because
 * esbuild doesn't automatically externalize subpaths.
 */
export const EXTERNAL_SUBPATHS: Record<string, string[]> = {
	react: ["react/jsx-runtime", "react/jsx-dev-runtime"],
	"react-dom": ["react-dom/client", "react-dom/server"],
};

export const DEFAULT_REGISTRY = "https://registry.npmjs.org";
