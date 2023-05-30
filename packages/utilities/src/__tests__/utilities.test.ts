import { fastMerge, lowerFirst, uniqueID, upperFirst } from "../utilities.js";
import { isArray, keyBy, merge, orderBy, values } from "lodash-es";

import { deepEqual } from "./deepEqual.js";

describe("when testing for utilities with no logging side-effects", () => {
	it("should return a string with the first letter capitalized", () => {
		expect(upperFirst("hello")).toBe("Hello");
		expect(upperFirst("hEllo")).toBe("HEllo");
		expect(upperFirst("Hello")).toBe("Hello");
	});

	it("should return a string with the first letter in lower case", () => {
		expect(lowerFirst("Hello")).toBe("hello");
		expect(lowerFirst("HEllo")).toBe("hEllo");
		expect(lowerFirst("hello")).toBe("hello");
	});

	it("should return two unique random numbers in both dev and prod mode", () => {
		const nodeEnvironment = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		expect(uniqueID()).not.toEqual(uniqueID());
		process.env.NODE_ENV = "development";
		expect(uniqueID()).not.toEqual(uniqueID());

		// Restore original node env.
		process.env.NODE_ENV = nodeEnvironment;
	});

	it("should return two prefixed, unique random numbers in dev mode", () => {
		const nodeEnvironment = process.env.NODE_ENV;
		process.env.NODE_ENV !== "production";
		const randomString1 = uniqueID("some-prefix-");
		const randomString2 = uniqueID("some-prefix-");
		expect(randomString1).toMatch(/some-prefix-\d+/);
		expect(randomString1).not.toEqual(randomString2);

		// Restore original node env.
		process.env.NODE_ENV = nodeEnvironment;
	});

	it("should return two prefixed, unique random numbers in prod mode", () => {
		const nodeEnvironment = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		const randomString1 = uniqueID("some-prefix-");
		const randomString2 = uniqueID("some-prefix-");
		expect(randomString1).toMatch(/some-prefix-\d{10,}/);
		expect(randomString1).not.toEqual(randomString2);

		// Restore original node env.
		process.env.NODE_ENV = nodeEnvironment;
	});

	it("should return a new configuration with keys for objB replacing keys from objA with fastMerge", async () => {
		const configDefault = {
			cache: 0,
			cors: false,
			gzip: true,
			headers: [
				{
					key1: "value1",
				},
				{
					key2: "value2",
				},
			],
			logs: false,
			open: false,
			path: process.cwd(),
			port: 8080,
		};
		const configCustom = {
			gzip: false,
			headers: [
				{
					key1: "newValue1",
				},
			],
			port: 8081,
		};
		expect(deepEqual(configDefault, configDefault)).toBe(true);
		expect(deepEqual(configDefault, configCustom)).toBe(false);
		/**
		 * This method will alter the objects, so no way to test for their
		 * equality AFTER the merge is done... Only thing we can do is test
		 * that the end result gets the right values.
		 */
		const result: any = fastMerge(configDefault, configCustom);

		// eslint-disable-next-line no-magic-numbers
		expect(result.port).toBe(8081);
		expect(result.cache).toBe(0);
		expect(result.cors).toBe(false);
		expect(result.gzip).toBe(false);
		expect(result.logs).toBe(false);
		expect(result.open).toBe(false);
		expect(result.path).toBe(process.cwd());

		expect(
			deepEqual(result.headers, [{ key1: "newValue1" }, { key2: "value2" }])
		).toBe(true);
	});

	it("should behave exactly as lodash.merge", async () => {
		const object = {
			a: [{ b: 2 }, { d: 4 }],
		};
		const other = {
			a: [{ c: 3 }, { e: 5 }],
		};
		const result = fastMerge(object, other);
		expect(
			deepEqual(result, {
				a: [
					{ b: 2, c: 3 },
					{ d: 4, e: 5 },
				],
			})
		).toBe(true);
	});

	it("should return a new configuration with custom nexPossible", async () => {
		const configA = {
			bump: {
				nextPossible: [
					{
						default: false,
						type: "minor",
					},
				],
			},
		};
		const configB = {
			bump: {
				nextPossible: [
					{
						default: true,
						type: "minor",
					},
				],
			},
		};
		expect(deepEqual(configA, configB)).toBe(false);
		/**
		 * This method will alter the objects, so no way to test for their
		 * equality AFTER the merge is done... Only thing we can do is test
		 * that the end result gets the right values.
		 */
		const result: any = fastMerge(
			configA,
			configB,
			(defined: any, custom: any, key: string) => {
				if (key === "nextPossible") {
					return orderBy(
						values(merge(keyBy(defined, "type"), keyBy(custom, "type"))),
						["pos"]
					);
				}
			}
		);

		expect(
			deepEqual(result.bump.nextPossible, [
				{
					default: true,
					type: "minor",
				},
			])
		).toBe(true);
	});

	it("should behave exactly as lodash.mergeWith", async () => {
		const object = { a: [1], b: [2] };
		const other = { a: [3], b: [4] };
		const result = fastMerge(
			object,
			other,
			(objectValue: string | any[], sourceValue: any) => {
				if (isArray(objectValue)) {
					// eslint-disable-next-line unicorn/prefer-spread
					return objectValue.concat(sourceValue);
				}
			}
		);
		expect(deepEqual(result, { a: [1, 3], b: [2, 4] })).toBe(true);
	});
});
