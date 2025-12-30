// @ts-check
const { defineConfig } = require("npm-check-updates");

/**
 * @see https://www.npmjs.com/package/npm-check-updates
 *
 * This configuration file is used by the `ncu` command to check for package updates.
 * It enables interactive mode, workspace support, and root package updates for
 * major and minor versions that have been released at least 1 day ago.
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
	 * Set cooldown to 1 day but skip it for our packages.
	 * @param packageName     The name of the dependency.
	 * @returns               Cooldown days restriction for given package.
	 */
	cooldown: (packageName) => {
		return packageName.startsWith("@versini") ||
			packageName.startsWith("@node-cli") ||
			packageName.startsWith("@sassysaint")
			? 0
			: 1;
	},
});
