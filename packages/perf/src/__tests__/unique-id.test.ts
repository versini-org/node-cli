import { uniqueID } from "../unique-id";

describe("when testing for uniqueID with no logging side-effects", () => {
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
