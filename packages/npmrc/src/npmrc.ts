#!/usr/bin/env node
/* istanbul ignore file */

import {
	createProfile,
	deleteProfile,
	listProfiles,
	switchProfile,
} from "./utilities.js";

import { config } from "./parse.js";

const NPMRC_STORE = process.env.HOME + "/.envtools/npmrcs";
const NPMRC_STORE_CONFIG = process.env.HOME + "/.envtools/npmrcs.json";

const { parameters, flags, showHelp } = config;

if (flags.create && parameters !== undefined) {
	const exitFlag = await createProfile({
		flags,
		storeConfig: NPMRC_STORE_CONFIG,
		storeLocation: NPMRC_STORE,
		profileName: parameters["0"],
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
