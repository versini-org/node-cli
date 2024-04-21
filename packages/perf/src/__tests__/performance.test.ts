import { Mock, UnknownFunction } from "jest-mock";

import { jest } from "@jest/globals";
import { Performance } from "../performance";

let mockLogError: Mock<UnknownFunction>, spyLogError: any;

describe("when testing for Performance with no logging side-effects", () => {
	it("should report basic performance data", async () => {
		const perf = new Performance();
		perf.start();
		await new Promise<void>((resolve) =>
			setTimeout(async () => {
				resolve();
				perf.stop();
				expect(perf.results.duration).toBeGreaterThanOrEqual(499);
				perf.start();
				await new Promise<void>((resolve) =>
					setTimeout(() => {
						resolve();
						perf.stop();
						expect(perf.results.duration).toBeGreaterThanOrEqual(999);
					}, 1000),
				);
			}, 500),
		);
	});
});

describe("when testing for performance.now polyfill", () => {
	it("should be available as a static method", async () => {
		expect(Performance.now()).toBeGreaterThan(0);
	});
	it("should be available as an instance method", async () => {
		const perf = new Performance();
		expect(perf.now()).toBeGreaterThan(0);
	});
});

/**
 * Some utilities have logging capabilities that needs to be
 * tested a little bit differently:
 * - mocking process.exit
 * - console.log
 * - inquirer.prompt
 */
describe("when testing for utilities with logging side-effects", () => {
	beforeEach(() => {
		mockLogError = jest.fn();

		spyLogError = jest.spyOn(console, "error").mockImplementation(mockLogError);
	});
	afterEach(() => {
		spyLogError.mockRestore();
	});
	it("should not report performance data and log and error if start() is called twice", async () => {
		const perf = new Performance();
		perf.start();
		perf.start();
		expect(mockLogError).toHaveBeenCalledWith(
			"Performance.start() can only be called once",
		);
		expect(perf.results).toStrictEqual({ duration: undefined });
	});

	it("should not report performance data and log and error if stop() is called without start()", async () => {
		const perf = new Performance();
		perf.stop();
		expect(mockLogError).toHaveBeenCalledWith(
			"Performance.stop() can only be called once after Performance.start()",
		);
		expect(perf.results).toStrictEqual({ duration: undefined });
	});
});
