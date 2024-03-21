import { Logger } from "@node-cli/logger";
import fs from "fs-extra";
import kleur from "kleur";
import { run } from "@node-cli/run";

export const logger = new Logger();
logger.boring = process.env.NODE_ENV === "test";

export const listProfiles = async ({ flags, storeConfig }) => {
	try {
		const profiles = await fs.readJson(storeConfig);

		if (profiles?.available?.length > 0) {
			const activeProfile = profiles.enabled;
			const messages =
				activeProfile === undefined
					? []
					: [kleur.green(`★ ${activeProfile} (active)`)];

			/**
			 * Since there is an active profile, we can check the
			 * global registry and list it, alongside the active profile.
			 */
			if (activeProfile) {
				const { stdout, stderr } = await run(
					'npm config list -l -g | grep "registry ="',
					{
						ignoreError: true,
					},
				);
				if (!stderr) {
					const stdoutArray = (stdout as string)
						.split("\n")
						.map((line) => kleur.grey(`   • ${line}`));
					messages.push(...stdoutArray);
				}
			}

			for (const profile of profiles.available) {
				if (profile !== activeProfile) {
					messages.push(`${profile}`);
				}
			}

			logger.printBox(messages.join("\n"), {
				textAlignment: "left",
				title: "Profiles",
				borderColor: "blue",
			});
		} else {
			logger.warn("No profiles found");
		}
		return 0;
	} catch (error) {
		if (flags.verbose) {
			logger.log(error);
		}
		logger.error("Unable to read the profile configuration file");
		return 1;
	}
};
