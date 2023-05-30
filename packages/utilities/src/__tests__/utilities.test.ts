import { lowerFirst, uniqueID, upperFirst } from "../utilities.js";

describe("when testing for meowHelpers with no logging side-effects", () => {
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
});
