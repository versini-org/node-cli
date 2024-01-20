import { fileURLToPath } from "node:url";
import kleur from "kleur";
import path from "node:path";
import { reportStats } from "../utilities.js";

kleur.enabled = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("when testing for reportStats with no logging side-effects", () => {
	it("should report there is a missing configuration file", async () => {
		expect(true).toBe(true);
		const result = await reportStats({
			flags: { configuration: "", output: "", prefix: "" },
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: "Please provide a configuration file",
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should report there is an invalid configuration file", async () => {
		const result = await reportStats({
			flags: { configuration: "invalid", output: "", prefix: "" },
		});
		expect(result).toEqual({
			data: {},
			exitCode: 1,
			exitMessage: "Invalid or missing configuration file!",
			outputFile: "",
			pass: true,
			prefix: "",
		});
	});

	it("should", async () => {
		const result = await reportStats({
			flags: {
				configuration: path.join(__dirname, "fixtures/configuration/basic.js"),
				output: "",
				prefix: "",
			},
		});

		console.log("==> ", result);
	});
});
