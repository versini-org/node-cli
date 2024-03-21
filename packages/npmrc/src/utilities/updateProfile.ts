import { Logger } from "@node-cli/logger";
import fs from "fs-extra";
import kleur from "kleur";
import { run } from "@node-cli/run";

export const logger = new Logger();
logger.boring = process.env.NODE_ENV === "test";

export const updateProfile = async ({
	storeConfig,
	storeLocation,
	homeLocation,
}) => {
	let profiles: { available: string | any[]; enabled: any };

	// Step 1: check if there is an active profile
	try {
		profiles = await fs.readJson(storeConfig);
	} catch {
		// ignoring error since we are going to create the file
	}

	if (profiles?.available?.length > 0) {
		const profileName = profiles.enabled;
		if (profileName) {
			const messages = [kleur.green(`Profile '${profileName}' updated`)];
			/**
			 * Step2: since there is an active profile, we can check the
			 * global registry and list it, alongside the active profile.
			 */

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

			// Step 3: update the active profile
			await fs.ensureDir(`${storeLocation}/${profileName}`);
			// copy the existing npmrc / yarnrc files to the storage folder
			const NPMRC = `${homeLocation}/.npmrc`;
			const YARNRC = `${homeLocation}/.yarnrc`;
			if (await fs.pathExists(YARNRC)) {
				await fs.copy(YARNRC, `${storeLocation}/${profileName}/yarnrc`);
			}
			if (await fs.pathExists(NPMRC)) {
				await fs.copy(NPMRC, `${storeLocation}/${profileName}/npmrc`);
			}
			logger.printBox(messages.join("\n"), {
				textAlignment: "left",
				title: "Profiles",
				borderColor: "blue",
			});
			return 0;
		}
	}

	logger.warn(
		"Only active profiles can be updated. Please switch to the profile you want to update.",
	);
	return 0;
};
