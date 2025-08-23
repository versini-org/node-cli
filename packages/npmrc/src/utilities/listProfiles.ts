import { Logger } from "@node-cli/logger";
import { run } from "@node-cli/run";
import fs from "fs-extra";
import kleur from "kleur";
import { formatRegistries, GET_REGISTRY_CMD } from "./common.js";

export const listProfiles = async ({ flags, storeConfig }) => {
	const logger = new Logger({
		boring: process.env.NODE_ENV === "test" || flags.boring,
	});

	try {
		const profiles = await fs.readJson(storeConfig);

		if (profiles?.available?.length > 0) {
			const activeProfile = profiles.enabled;
			const messages =
				activeProfile === undefined
					? []
					: [kleur.green(`★ ${activeProfile} (active)`)];

			/**
			 * Since there is an active profile, we can check the global registries and
			 * list them, alongside the active profile.
			 */
			if (activeProfile) {
				const { stdout, stderr } = await run(GET_REGISTRY_CMD, {
					ignoreError: true,
				});

				if (!stderr) {
					messages.push(...formatRegistries(stdout as string));
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
