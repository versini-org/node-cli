import { Logger } from "@node-cli/logger";
import fs from "fs-extra";

export const logger = new Logger();
logger.boring = process.env.NODE_ENV === "test";

export const createProfile = async ({
	storeConfig,
	storeLocation,
	profileName,
	homeLocation,
}) => {
	let profiles = { available: [], enabled: undefined };
	await fs.ensureFile(storeConfig);
	try {
		// if the profile already exists, do nothing
		profiles = await fs.readJson(storeConfig);
		if (profiles.available.includes(profileName)) {
			logger.warn(`Profile '${profileName}' already exists...`);
			return 0;
		}
	} catch {
		// ignoring error since we are going to create the file
	}

	/**
	 * If the profile does not exist, create a folder named as
	 * the profile under the storeLocation folder, with the
	 * existing npmrc / yarnrc files.
	 */
	await fs.ensureDir(`${storeLocation}/${profileName}`);
	// copy the existing npmrc / yarnrc files to the new folder
	const NPMRC = `${homeLocation}/.npmrc`;
	const YARNRC = `${homeLocation}/.yarnrc`;
	if (await fs.pathExists(YARNRC)) {
		await fs.copy(YARNRC, `${storeLocation}/${profileName}/yarnrc`);
	}
	if (await fs.pathExists(NPMRC)) {
		await fs.copy(NPMRC, `${storeLocation}/${profileName}/npmrc`);
	}
	// then add the profile to the configuration file
	const newProfiles = {
		available: [...profiles.available, profileName],
		enabled: profiles.enabled ?? profileName,
	};
	await fs.writeJson(storeConfig, newProfiles, { spaces: 2 });
	logger.printBox(`Profile '${profileName}' created`, {
		textAlignment: "left",
		title: "Profiles",
		borderColor: "blue",
	});
	return 0;
};
