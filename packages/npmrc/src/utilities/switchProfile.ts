import { Logger } from "@node-cli/logger";
import { run } from "@node-cli/run";
import fs from "fs-extra";
import kleur from "kleur";
import { formatRegistries, GET_REGISTRY_CMD } from "./common.js";

export const switchProfile = async ({
	flags,
	storeConfig,
	storeLocation,
	profileName,
	homeLocation,
}) => {
	const logger = new Logger({
		boring: process.env.NODE_ENV === "test" || flags.boring,
	});

	try {
		const profiles = await fs.readJson(storeConfig);
		if (!profiles.available.includes(profileName)) {
			logger.error(`Profile '${profileName}' does not exist`);
			return 1;
		}
		// if profile is already enabled, do nothing.
		if (profiles.enabled === profileName) {
			logger.warn(`Profile '${profileName}' is already active`);
			return 0;
		}
		/**
		 * if profile exists and is not enabled, switch to it by copying the npmrc and
		 * yarnrc files from the profile folder to the home folder.
		 */
		const NPMRC = `${homeLocation}/.npmrc`;
		const PROFILE_NPMRC = `${storeLocation}/${profileName}/npmrc`;
		const YARNRC = `${homeLocation}/.yarnrc`;
		const PROFILE_YARNRC = `${storeLocation}/${profileName}/yarnrc`;

		if (await fs.pathExists(PROFILE_NPMRC)) {
			await fs.copy(PROFILE_NPMRC, NPMRC, {
				overwrite: true,
			});
		} else {
			logger.warn(`No npmrc file found for profile '${profileName}'`);
		}
		if (await fs.pathExists(PROFILE_YARNRC)) {
			await fs.copy(PROFILE_YARNRC, YARNRC, {
				overwrite: true,
			});
		} else {
			logger.warn(`No yarnrc file found for profile '${profileName}'`);
		}

		const newProfiles = {
			available: profiles.available,
			enabled: profileName,
		};
		await fs.writeJson(storeConfig, newProfiles, { spaces: 2 });
		const messages = [kleur.green(`Profile switched to '${profileName}'`)];
		const { stdout, stderr } = await run(GET_REGISTRY_CMD, {
			ignoreError: true,
		});
		if (!stderr) {
			messages.push(...formatRegistries(stdout as string));
		}
		logger.printBox(messages.join("\n"), {
			textAlignment: "left",
			title: "Profiles",
			borderColor: "blue",
		});
		return 0;
	} catch (error) {
		if (flags.verbose) {
			logger.log(error);
		}
		logger.error("Could not switch profile");
		return 1;
	}
};
