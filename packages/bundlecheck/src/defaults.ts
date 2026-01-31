/* istanbul ignore file */

export const defaultFlags = {
	boring: false,
	gzipLevel: 5,
	external: "",
	noExternal: false,
	versions: false,
	registry: "",
	platform: "auto",
};

/**
 * Normalize platform aliases to canonical esbuild platform values
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

	// Auto-detect from package.json engines
	if (normalized === "auto") {
		return undefined;
	}

	// Node aliases
	if (["node", "server", "nodejs", "backend"].includes(normalized)) {
		return "node";
	}

	// Browser aliases
	if (["browser", "web", "desktop", "client"].includes(normalized)) {
		return "browser";
	}

	// Invalid value - will be caught by validation
	return normalized as "browser" | "node";
}

/**
 * Check if a platform value is valid (either canonical or alias)
 */
export function isValidPlatform(platform: string | undefined): boolean {
	if (platform === undefined) {
		return true;
	}

	const normalized = platform.toLowerCase().trim();

	// Empty string after trim is invalid
	if (normalized === "") {
		return false;
	}
	const validValues = [
		// Auto-detect
		"auto",
		// Browser
		"browser",
		"web",
		"desktop",
		"client",
		// Node
		"node",
		"server",
		"nodejs",
		"backend",
	];

	return validValues.includes(normalized);
}

export const TREND_VERSION_COUNT = 5;

export const DEFAULT_EXTERNALS = ["react", "react-dom"];

export const DEFAULT_REGISTRY = "https://registry.npmjs.org";
