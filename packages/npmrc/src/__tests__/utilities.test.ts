import { createProfile } from "../utilities/createProfile.js";
import { deleteProfile } from "../utilities/deleteProfile.js";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { jest } from "@jest/globals";
import kleur from "kleur";
import { listProfiles } from "../utilities/listProfiles.js";
import os from "node:os";
import path from "node:path";
import { switchProfile } from "../utilities/switchProfile.js";
import { updateProfile } from "../utilities/updateProfile.js";

kleur.enabled = false;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mock = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		log: jest.fn(),
	},
	spyDate: any,
	spyLocaleTime: any,
	spyInfo: any,
	spyLog: any,
	spyDebug: any,
	spyWarn: any,
	spyError: any,
	homeLocation: string,
	temporaryConfig: string,
	temporaryStoreLocation: string;

describe("when testing with logging side-effects", () => {
	beforeEach(() => {
		kleur.enabled = false;
		mock.info = jest.fn();
		mock.log = jest.fn();
		mock.debug = jest.fn();
		mock.warn = jest.fn();
		mock.error = jest.fn();
		spyInfo = jest.spyOn(console, "info").mockImplementation(mock.info);
		spyLog = jest.spyOn(console, "log").mockImplementation(mock.log);
		spyDebug = jest.spyOn(console, "debug").mockImplementation(mock.debug);
		spyWarn = jest.spyOn(console, "warn").mockImplementation(mock.warn);
		spyError = jest.spyOn(console, "error").mockImplementation(mock.error);

		spyDate = jest
			.spyOn(Date.prototype, "toDateString")
			.mockImplementation(() => "Sat Oct 31 2020");
		spyLocaleTime = jest
			.spyOn(Date.prototype, "toLocaleTimeString")
			.mockImplementation(() => "5:00:00 PM");
	});
	afterEach(async () => {
		spyDate.mockRestore();
		spyInfo.mockRestore();
		spyLocaleTime.mockRestore();
		spyLog.mockRestore();
		spyDebug.mockRestore();
		spyWarn.mockRestore();
		spyError.mockRestore();
		if (homeLocation) {
			await fs.remove(homeLocation);
		}
		if (temporaryConfig) {
			await fs.remove(temporaryConfig);
		}
		if (temporaryStoreLocation) {
			await fs.remove(temporaryStoreLocation);
		}
	});
	describe("listProfiles with errors", () => {
		it("should return 0 if no profiles are found", async () => {
			const result = await listProfiles({
				flags: { verbose: true },
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/no-profile.json",
				),
			});
			expect(result).toEqual(0);
			expect(mock.warn).toHaveBeenCalledWith(
				expect.stringContaining("No profiles found"),
			);
		});

		it("should return 1 if the profile configuration is corrupted", async () => {
			const result = await listProfiles({
				flags: { verbose: true },
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/does-not-exist.json",
				),
			});
			expect(result).toEqual(1);
			expect(mock.error).toHaveBeenCalledWith(
				expect.stringContaining(
					"Unable to read the profile configuration file",
				),
			);
		});
	});

	describe("listProfiles with with no errors", () => {
		it("should return 0 with 1 profile found and 0 active", async () => {
			const result = await listProfiles({
				flags: { verbose: true },
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/one-profile.json",
				),
			});
			expect(result).toEqual(0);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("┌ Profiles ─┐"),
			);
			expect(mock.log).toHaveBeenCalledWith(expect.stringContaining("perso"));
			expect(mock.log).not.toHaveBeenCalledWith(
				expect.stringContaining("active"),
			);
		});

		it("should return 0 with 2 profiles found and 1 active", async () => {
			const result = await listProfiles({
				flags: { verbose: true },
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/two-profiles.json",
				),
			});
			expect(result).toEqual(0);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("┌ Profiles"),
			);
			expect(mock.log).toHaveBeenCalledWith(expect.stringContaining("perso"));
			expect(mock.log).toHaveBeenCalledWith(expect.stringContaining("work"));
			expect(mock.log).toHaveBeenCalledWith(expect.stringContaining("active"));
		});
	});

	describe("createProfile with errors", () => {
		it("should return 0 if profile already exists", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			const result = await createProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/one-profile.json",
				),
				homeLocation,
			});
			expect(result).toEqual(0);
			expect(mock.warn).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'perso' already exists..."),
			);
		});
	});

	describe("createProfile with no errors", () => {
		it("should return 0 when a new profile is created", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "tmp-config.json");
			temporaryStoreLocation = path.join(os.tmpdir(), "npmrcs");
			await fs.writeJson(temporaryConfig, {
				available: ["perso"],
				enabled: "perso",
			});
			await fs.ensureFile(path.join(homeLocation, ".npmrc"));
			await fs.ensureFile(path.join(homeLocation, ".yarnrc"));
			const result = await createProfile({
				flags: { verbose: true },
				profileName: "work",
				storeLocation: temporaryStoreLocation,
				storeConfig: temporaryConfig,
				homeLocation,
			});
			const config = await fs.readJSON(temporaryConfig);
			expect(result).toEqual(0);
			expect(config).toStrictEqual({
				available: ["perso", "work"],
				enabled: "perso",
			});
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("┌ Profiles ──────────────────┐"),
			);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'work' created"),
			);
		});

		it("should return 0, even if the profile configuration is corrupted", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "corrupted-config.json");
			await fs.outputFile(temporaryConfig, "corrupted");

			const result = await createProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: temporaryConfig,
				homeLocation,
			});
			expect(result).toEqual(0);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'perso' created"),
			);
		});

		it("should return 0, even if the profile configuration does not exist", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "does-not-exist.json");
			temporaryStoreLocation = path.join(os.tmpdir(), "npmrcs");
			await fs.ensureFile(path.join(homeLocation, ".npmrc"));
			await fs.ensureFile(path.join(homeLocation, ".yarnrc"));
			const result = await createProfile({
				flags: { verbose: true },
				profileName: "work",
				storeLocation: temporaryStoreLocation,
				storeConfig: temporaryConfig,
				homeLocation,
			});
			const config = await fs.readJSON(temporaryConfig);
			expect(result).toEqual(0);
			expect(config).toStrictEqual({
				available: ["work"],
				enabled: "work",
			});
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("┌ Profiles ──────────────────┐"),
			);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'work' created"),
			);
		});
	});

	describe("switchProfile with errors", () => {
		it("should return 1 if profile does not exist", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			const result = await switchProfile({
				flags: { verbose: true },
				profileName: "does-not-exist",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/one-profile.json",
				),
				homeLocation,
			});
			expect(result).toEqual(1);
			expect(mock.error).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'does-not-exist' does not exist"),
			);
		});

		it("should return 0 if profile is already active", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			const result = await switchProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/two-profiles.json",
				),
				homeLocation,
			});
			expect(result).toEqual(0);
			expect(mock.warn).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'perso' is already active"),
			);
		});

		it("should return 1 if the profile configuration is corrupted", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			const result = await switchProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/does-not-exist.json",
				),
				homeLocation,
			});
			expect(result).toEqual(1);
			expect(mock.error).toHaveBeenCalledWith(
				expect.stringContaining("Could not switch profile"),
			);
		});
	});

	describe("switchProfile with no errors", () => {
		it("should return 0 when a new profile is switched", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "tmp-config.json");
			await fs.writeJson(temporaryConfig, {
				available: ["perso"],
			});
			const result = await switchProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: temporaryConfig,
				homeLocation,
			});
			expect(result).toEqual(0);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile switched to 'perso'"),
			);
		});

		it("should return 0 when a new profile is switched + warning for npmrc", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "tmp-config.json");
			await fs.writeJson(temporaryConfig, {
				available: ["perso-no-npmrc"],
			});
			const result = await switchProfile({
				flags: { verbose: true },
				profileName: "perso-no-npmrc",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: temporaryConfig,
				homeLocation,
			});
			expect(result).toEqual(0);
			expect(mock.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					"No npmrc file found for profile 'perso-no-npmrc'",
				),
			);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile switched to 'perso-no-npmrc'"),
			);
		});

		it("should return 0 when a new profile is switched + warning for yarnrc", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "tmp-config.json");
			await fs.writeJson(temporaryConfig, {
				available: ["perso-no-yarnrc"],
			});
			const result = await switchProfile({
				flags: { verbose: true },
				profileName: "perso-no-yarnrc",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: temporaryConfig,
				homeLocation,
			});
			expect(result).toEqual(0);
			expect(mock.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					"No yarnrc file found for profile 'perso-no-yarnrc'",
				),
			);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile switched to 'perso-no-yarnrc'"),
			);
		});
	});

	describe("deleteProfile with errors", () => {
		it("should return 1 if profile does not exist", async () => {
			const result = await deleteProfile({
				flags: { verbose: true },
				profileName: "does-not-exist",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/one-profile.json",
				),
			});
			expect(result).toEqual(1);
			expect(mock.error).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'does-not-exist' does not exist"),
			);
		});

		it("should return 1 if profile is currently active", async () => {
			const result = await deleteProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/two-profiles.json",
				),
			});
			expect(result).toEqual(1);
			expect(mock.error).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'perso' is currently active"),
			);
		});

		it("should return 1 if the profile configuration is corrupted", async () => {
			const result = await deleteProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/does-not-exist.json",
				),
			});
			expect(result).toEqual(1);
			expect(mock.error).toHaveBeenCalledWith(
				expect.stringContaining("Could not delete profile"),
			);
		});
	});

	describe("deleteProfile with no errors", () => {
		it("should return 0 when profile is deleted", async () => {
			temporaryConfig = path.join(os.tmpdir(), "tmp-config.json");
			await fs.writeJson(temporaryConfig, {
				available: ["perso", "work"],
				enabled: "work",
			});
			const result = await deleteProfile({
				flags: { verbose: true },
				profileName: "perso",
				storeLocation: path.join(os.tmpdir(), "fixtures/npmrcs"),
				storeConfig: temporaryConfig,
			});
			expect(result).toEqual(0);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'perso' deleted"),
			);
		});
	});

	describe("updateProfile with errors", () => {
		it("should return 0 if profile does not exist", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			const result = await updateProfile({
				flags: { verbose: true },
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: path.join(
					__dirname,
					"fixtures/configuration/one-profile.json",
				),
				homeLocation,
			});
			expect(result).toEqual(0);
			expect(mock.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					"Only active profiles can be updated. Please switch to the profile you want to update.",
				),
			);
		});
	});

	describe("updateProfile with no errors", () => {
		it("should return 0 when a profile is updated", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "tmp-config.json");
			temporaryStoreLocation = path.join(os.tmpdir(), "npmrcs");
			await fs.writeJson(temporaryConfig, {
				available: ["perso"],
				enabled: "perso",
			});
			await fs.ensureFile(path.join(homeLocation, ".npmrc"));
			await fs.ensureFile(path.join(homeLocation, ".yarnrc"));
			const result = await updateProfile({
				flags: { verbose: true },
				storeLocation: temporaryStoreLocation,
				storeConfig: temporaryConfig,
				homeLocation,
			});
			const config = await fs.readJSON(temporaryConfig);
			expect(result).toEqual(0);
			expect(config).toStrictEqual({
				available: ["perso"],
				enabled: "perso",
			});
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("┌ Profiles"),
			);
			expect(mock.log).toHaveBeenCalledWith(
				expect.stringContaining("Profile 'perso' updated"),
			);
		});

		it("should return 0, even if the profile configuration is corrupted", async () => {
			homeLocation = path.join(os.tmpdir(), "home");
			temporaryConfig = path.join(os.tmpdir(), "corrupted-config.json");
			await fs.outputFile(temporaryConfig, "corrupted");

			const result = await updateProfile({
				flags: { verbose: true },
				storeLocation: path.join(__dirname, "fixtures/npmrcs"),
				storeConfig: temporaryConfig,
				homeLocation,
			});
			expect(result).toEqual(0);
		});
	});
});
