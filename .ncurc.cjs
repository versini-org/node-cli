// @ts-check
const { defineConfig } = require("npm-check-updates");

/**
 * @see https://www.npmjs.com/package/npm-check-updates
 *
 * This configuration file is used by the `ncu` command to check for package updates.
 * It enables interactive mode, workspace support, and root package updates for
 * major and minor versions that have been released at least 7 hours ago.
 *
 */
module.exports = defineConfig({
	upgrade: true,
	interactive: true,
	workspaces: true,
	root: true,

	/**
	 * Exclude zod updates, as we don't want to update zod from v3 to v4 automatically.
	 * https://github.com/raineorshine/npm-check-updates?tab=readme-ov-file#filterversion
	 */
	filterResults: (packageName) => {
		if (packageName.startsWith("zod")) {
			return false;
		}
		return true;
	},

	/**
	 * Mirror pnpm-workspace.yaml's `minimumReleaseAge: 420` (7 hours), skipping it
	 * for our own packages. Keep this a duration STRING: ncu reads a bare number
	 * as days, so `1` here would silently gate at 24h instead of 7h.
	 * @param packageName     The name of the dependency.
	 * @returns               Cooldown restriction for given package.
	 */
	cooldown: (packageName) => {
		return packageName.startsWith("@versini") ||
			packageName.startsWith("@node-cli") ||
			packageName.startsWith("@sassysaint")
			? 0
			: "7h";
	},
});
