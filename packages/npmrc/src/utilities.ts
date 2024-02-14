import { Logger } from "@node-cli/logger";
import fs from "fs-extra";
import kleur from "kleur";

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
		// ignoring error since we are creating the file
	}

	// if the profile does not exist, create
	// a folder named as the profile under the storeLocation folder,
	// with the existing npmrc / yarnrc files
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

export const switchProfile = async ({
	flags,
	storeConfig,
	storeLocation,
	profileName,
	homeLocation,
}) => {
	try {
		const profiles = await fs.readJson(storeConfig);
		if (!profiles.available.includes(profileName)) {
			logger.error(`Profile '${profileName}' does not exist`);
			return 1;
		}
		// if profile is already enabled, do nothing
		if (profiles.enabled === profileName) {
			logger.warn(`Profile '${profileName}' is already active`);
			return 0;
		}
		// if profile exists and is not enabled, switch to it by copying
		// the npmrc and yarnrc files from the profile folder to the home folder
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
		logger.printBox(`Profile switched to '${profileName}'`, {
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

export const deleteProfile = async ({
	flags,
	profileName,
	storeConfig,
	storeLocation,
}) => {
	try {
		const profiles = await fs.readJson(storeConfig);
		if (!profiles.available.includes(profileName)) {
			logger.error(`Profile '${profileName}' does not exist`);
			return 1;
		}
		// if the profile is enabled, do nothing
		if (profiles.enabled === profileName) {
			logger.error(`Profile '${profileName}' is currently active`);
			return 1;
		}
		// if profile exists, delete it by removing the profile folder
		await fs.remove(`${storeLocation}/${profileName}`);
		// then remove the profile from the configuration file
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
