#!/usr/bin/env node
/* istanbul ignore file */

import { config } from "./parse.js";
import { createProfile } from "./utilities/createProfile.js";
import { deleteProfile } from "./utilities/deleteProfile.js";
import { listProfiles } from "./utilities/listProfiles.js";
import path from "node:path";
import { switchProfile } from "./utilities/switchProfile.js";
import { updateProfile } from "./utilities/updateProfile.js";

const HOME = process.env.HOME;
const NPMRC_STORE = path.join(HOME, ".envtools/npmrcs");
const NPMRC_STORE_CONFIG = path.join(HOME, "/.envtools/npmrcs.json");

const { parameters, flags, showHelp } = config;

if (flags.create && parameters !== undefined) {
	const exitFlag = await createProfile({
		flags,
		storeConfig: NPMRC_STORE_CONFIG,
		storeLocation: NPMRC_STORE,
		profileName: parameters["0"],
		homeLocation: HOME,
	});
	process.exit(exitFlag);
}

if (flags.update && parameters !== undefined) {
	const exitFlag = await updateProfile({
		flags,
		storeConfig: NPMRC_STORE_CONFIG,
		storeLocation: NPMRC_STORE,
		homeLocation: HOME,
	});
	process.exit(exitFlag);
}

if (flags.delete && parameters !== undefined) {
	const exitFlag = await deleteProfile({
		flags,
		storeConfig: NPMRC_STORE_CONFIG,
		storeLocation: NPMRC_STORE,
		profileName: parameters["0"],
	});
	process.exit(exitFlag);
}

if (parameters !== undefined && parameters["0"] !== undefined) {
	const exitFlag = await switchProfile({
		flags,
		storeConfig: NPMRC_STORE_CONFIG,
		storeLocation: NPMRC_STORE,
		profileName: parameters["0"],
		homeLocation: HOME,
	});
	process.exit(exitFlag);
}

if (flags.list || (!flags.version && !flags.help)) {
	const exitFlag = await listProfiles({
		flags,
		storeConfig: NPMRC_STORE_CONFIG,
	});
	process.exit(exitFlag);
}

showHelp();
