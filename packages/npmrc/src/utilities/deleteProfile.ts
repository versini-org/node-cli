import { Logger } from "@node-cli/logger";
import fs from "fs-extra";

export const deleteProfile = async ({
	flags,
	profileName,
	storeConfig,
	storeLocation,
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
		// if the profile is enabled, do nothing.
		if (profiles.enabled === profileName) {
			logger.error(`Profile '${profileName}' is currently active`);
			return 1;
		}
		// if profile exists, delete it by removing the profile folder.
		await fs.remove(`${storeLocation}/${profileName}`);
		// then remove the profile from the configuration file.
		const newProfiles = {
			available: profiles.available.filter(
				(profile: any) => profile !== profileName,
			),
			enabled: profiles.enabled,
		};
		await fs.writeJson(storeConfig, newProfiles, { spaces: 2 });
		logger.printBox(`Profile '${profileName}' deleted`, {
			textAlignment: "left",
			title: "Profiles",
			borderColor: "blue",
		});
		return 0;
	} catch (error) {
		if (flags.verbose) {
			logger.log(error);
		}
		logger.error("Could not delete profile");
		return 1;
	}
};
