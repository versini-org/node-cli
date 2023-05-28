import { extractDuration, timeToMicroseconds } from "../utilities.js";
import moment, { Duration } from "moment";

import { jest } from "@jest/globals";
import kleur from "kleur";
import path from "node:path";

kleur.enabled = false;

describe("when testing for individual utilities with no logging side-effects", () => {
	it("should return a valid moment duration", async () => {
		const duration = extractDuration({ parameters: { "0": "1m" } });
		expect(moment.isDuration(duration)).toBe(true);
		expect(duration).toStrictEqual(
			expect.objectContaining({
				_data: {
					milliseconds: 0,
					seconds: 0,
					minutes: 1,
					hours: 0,
					days: 0,
					months: 0,
					years: 0,
				},
			})
		);
	});

	it("should convert values to microseconds", async () => {
		expect(timeToMicroseconds("1", "m")).toBe(60_000_000);
		expect(timeToMicroseconds("1", "h")).toBe(3_600_000_000);
		expect(timeToMicroseconds("1", "s")).toBe(1_000_000);
		expect(timeToMicroseconds("1", "X")).toBe(0);
	});
});
