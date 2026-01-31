import select from "@inquirer/select";
import { rsort } from "semver";
import { parsePackageSpecifier } from "./bundler.js";
import { DEFAULT_REGISTRY } from "./defaults.js";

export type NpmPackageInfo = {
	versions: string[];
	tags: Record<string, string>;
};

/**
 * Fetch available versions for an npm package from the registry.
 */
type NpmRegistryResponse = {
	versions?: Record<string, unknown>;
	"dist-tags"?: Record<string, string>;
};

export type FetchVersionsOptions = {
	packageName: string;
	registry?: string;
};

export async function fetchPackageVersions(
	packageNameOrOptions: string | FetchVersionsOptions,
): Promise<NpmPackageInfo> {
	// Support both string (legacy) and options object.
	const { packageName, registry } =
		typeof packageNameOrOptions === "string"
			? { packageName: packageNameOrOptions, registry: undefined }
			: packageNameOrOptions;

	// Parse the package specifier to get just the name (without version).
	const { name } = parsePackageSpecifier(packageName);

	// Use custom registry or default.
	const registryUrl = registry || DEFAULT_REGISTRY;
	// Ensure no trailing slash.
	const baseUrl = registryUrl.replace(/\/$/, "");
	const url = `${baseUrl}/${name}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch package info: ${response.statusText}`);
	}

	const data = (await response.json()) as NpmRegistryResponse;

	// Get all versions sorted by semver (newest first).
	const versions = rsort(Object.keys(data.versions || {}));

	// Get dist-tags (latest, next, beta, etc.)
	const tags = data["dist-tags"] || {};

	return { versions, tags };
}

/**
 * Prompt user to select a version from available versions.
 */
export async function promptForVersion(
	packageName: string,
	versions: string[],
	tags: Record<string, string>,
): Promise<string> {
	// Build choices with tags highlighted.
	const taggedVersions = new Set(Object.values(tags));
	const tagByVersion = Object.fromEntries(
		Object.entries(tags).map(([tag, ver]) => [ver, tag]),
	);

	/**
	 * Limit to most recent 20 versions for usability, but include all tagged
	 * versions.
	 */
	const recentVersions = versions.slice(0, 20);
	const displayVersions = [
		...new Set([...Object.values(tags), ...recentVersions]),
	];

	// Sort so tagged versions appear first, then by version order.
	displayVersions.sort((a, b) => {
		const aTagged = taggedVersions.has(a);
		const bTagged = taggedVersions.has(b);
		if (aTagged && !bTagged) {
			return -1;
		}
		if (!aTagged && bTagged) {
			return 1;
		}
		return versions.indexOf(a) - versions.indexOf(b);
	});

	const choices = displayVersions.map((ver) => {
		const tag = tagByVersion[ver];
		return {
			name: tag ? `${ver} (${tag})` : ver,
			value: ver,
		};
	});

	const selectedVersion = await select({
		message: `Select a version for ${packageName}:`,
		choices,
		pageSize: 15,
	});

	return selectedVersion;
}
