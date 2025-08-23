import kleur from "kleur";
import { vi } from "vitest";
import { Logger } from "../Logger";

let mock = {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		log: vi.fn(),
		exit: () => {
			return undefined as never;
		},
	},
	spyDate: any,
	spyLocaleTime: any,
	spyInfo: any,
	spyLog: any,
	spyDebug: any,
	spyWarn: any,
	spyError: any,
	spyExit: any;

describe("when testing with logging side-effects", () => {
	beforeEach(() => {
		kleur.enabled = false;
		mock.info = vi.fn();
		mock.log = vi.fn();
		mock.debug = vi.fn();
		mock.warn = vi.fn();
		mock.error = vi.fn();
		spyInfo = vi.spyOn(console, "info").mockImplementation(mock.info);
		spyLog = vi.spyOn(console, "log").mockImplementation(mock.log);
		spyDebug = vi.spyOn(console, "debug").mockImplementation(mock.debug);
		spyWarn = vi.spyOn(console, "warn").mockImplementation(mock.warn);
		spyError = vi.spyOn(console, "error").mockImplementation(mock.error);

		spyDate = vi
			.spyOn(Date.prototype, "toDateString")
			.mockImplementation(() => "Sat Oct 31 2020");
		spyLocaleTime = vi
			.spyOn(Date.prototype, "toLocaleTimeString")
			.mockImplementation(() => "5:00:00 PM");
	});
	afterEach(() => {
		spyDate.mockRestore();
		spyInfo.mockRestore();
		spyLocaleTime.mockRestore();
		spyLog.mockRestore();
		spyDebug.mockRestore();
		spyWarn.mockRestore();
		spyError.mockRestore();
	});

	it("should log a simple message", async () => {
		const log = new Logger();
		log.boring = true;
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith("Hello World");
		log.info();
		expect(mock.info).toHaveBeenCalledWith("");
	});

	it("should log a complex message", async () => {
		const log = new Logger();
		log.boring = true;
		log.log({
			titi: { tata: 3 },
			toto: 1,
		});
		expect(mock.log).toHaveBeenCalledWith(
			"{\n  titi: {\n    tata: 3\n  },\n  toto: 1\n}",
		);
		log.info();
		expect(mock.info).toHaveBeenCalledWith("");
	});

	it("should log a simple message with a prefix", async () => {
		const log = new Logger();
		log.boring = true;
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith("Hello World");
		log.prefix = "==>";
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith("==> Hello World");
	});

	it("should log a simple message with a timestamp", async () => {
		const log = new Logger();
		log.boring = true;
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith("Hello World");
		log.timestamp = true;
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith(
			"[ Sat Oct 31 2020 5:00:00 PM ] Hello World",
		);
	});

	it("should log a simple message with a prefix and a timestamp", async () => {
		const log = new Logger();
		log.boring = true;
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith("Hello World");
		log.timestamp = true;
		log.prefix = "==>";
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith(
			"==> [ Sat Oct 31 2020 5:00:00 PM ] Hello World",
		);
	});

	it("should NOT log a simple message", async () => {
		const log = new Logger();
		log.silent = true;
		log.info("Hello World Again");
		expect(mock.info).not.toHaveBeenCalled();
	});

	it("should respect the constructor options (no colors)", async () => {
		const log = new Logger({ boring: true });
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith("Hello World");
		log.info();
		expect(mock.info).toHaveBeenCalledWith("");
	});

	it("should respect the constructor options (silent)", async () => {
		const log = new Logger({ silent: true });
		log.boring = true;
		log.info("Hello World");
		expect(mock.info).not.toHaveBeenCalled();
		log.silent = false;
		log.info("Hello World Again");
		expect(mock.info).toHaveBeenCalledWith("Hello World Again");
	});

	it("should respect the constructor options (prefix)", async () => {
		const log = new Logger({ prefix: "==>" });
		log.boring = true;
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith("==> Hello World");
		log.prefix = "";
		log.info("Hello Hell");
		expect(mock.info).toHaveBeenCalledWith("Hello Hell");
	});

	it("should respect the constructor options (timestamp)", async () => {
		const log = new Logger({ timestamp: true });
		log.boring = true;
		log.info("Hello World");
		expect(mock.info).toHaveBeenCalledWith(
			"[ Sat Oct 31 2020 5:00:00 PM ] Hello World",
		);
		log.timestamp = false;
		log.info("Hello Hell");
		expect(mock.info).toHaveBeenCalledWith("Hello Hell");
	});

	it.each`
		type       | color
		${"info"}  | ${"blue"}
		${"log"}   | ${"white"}
		${"debug"} | ${"grey"}
		${"warn"}  | ${"yellow"}
		${"error"} | ${"red"}
	`("should respect the color for type $type", ({ type, _color }) => {
		const log = new Logger({ timestamp: true });
		const message = "Hello Technicolor";
		const messagePrefix = "[ Sat Oct 31 2020 5:00:00 PM ]";

		log[type](message);
		expect(mock[type]).toHaveBeenCalledWith(expect.stringContaining(message));
		expect(mock[type]).toHaveBeenCalledWith(
			expect.stringContaining(messagePrefix),
		);
	});
});

/**
 * printErrorsAndExit logging capabilities need to be tested a little bit
 * differently:
 * - mocking process.exit
 * - console.log
 */
describe("when testing for printErrorsAndExit with logging side-effects", () => {
	beforeEach(() => {
		kleur.enabled = false;
		mock.log = vi.fn();
		mock.warn = vi.fn();
		mock.error = vi.fn();
		mock.exit = () => {
			return undefined as never;
		};

		spyLog = vi.spyOn(console, "log").mockImplementation(mock.log);
		spyWarn = vi.spyOn(console, "warn").mockImplementation(mock.warn);
		spyError = vi.spyOn(console, "error").mockImplementation(mock.error);
		spyExit = vi.spyOn(process, "exit").mockImplementation(mock.exit);
	});
	afterEach(() => {
		spyExit.mockRestore();
		spyLog.mockRestore();
		spyError.mockRestore();
		spyWarn.mockRestore();
	});

	it("should display the proper error messages and exit with 666", async () => {
		const log = new Logger();
		log.printErrorsAndExit(["message one", "message two"], 666);
		expect(mock.error).toHaveBeenCalledWith("message one");
		expect(mock.error).toHaveBeenCalledWith("message two");
		expect(spyExit).toHaveBeenCalledWith(666);
	});

	it("should display the proper error messages but will not NOT exit", async () => {
		const log = new Logger({ boring: true });
		log.printErrorsAndExit(["message one", "message two"]);
		expect(mock.error).toHaveBeenCalledWith("message one");
		expect(mock.error).toHaveBeenCalledWith("message two");
		expect(spyExit).not.toHaveBeenCalled();
	});
});

describe("when testing for printInABox with logging side-effects", () => {
	beforeEach(() => {
		kleur.enabled = false;
		mock.info = vi.fn();
		mock.log = vi.fn();
		mock.debug = vi.fn();
		mock.warn = vi.fn();
		mock.error = vi.fn();
		spyInfo = vi.spyOn(console, "info").mockImplementation(mock.info);
		spyLog = vi.spyOn(console, "log").mockImplementation(mock.log);
		spyDebug = vi.spyOn(console, "debug").mockImplementation(mock.debug);
		spyWarn = vi.spyOn(console, "warn").mockImplementation(mock.warn);
		spyError = vi.spyOn(console, "error").mockImplementation(mock.error);

		spyDate = vi
			.spyOn(Date.prototype, "toDateString")
			.mockImplementation(() => "Sat Oct 31 2020");
		spyLocaleTime = vi
			.spyOn(Date.prototype, "toLocaleTimeString")
			.mockImplementation(() => "5:00:00 PM");
	});
	afterEach(() => {
		spyDate.mockRestore();
		spyInfo.mockRestore();
		spyLocaleTime.mockRestore();
		spyLog.mockRestore();
		spyDebug.mockRestore();
		spyWarn.mockRestore();
		spyError.mockRestore();
	});

	it("should log a simple message in a box", async () => {
		const log = new Logger();
		const message = "Hello World";
		log.boring = true;
		log.printBox(message);
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("┌─────────────────┐"),
		);
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(message));
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("└─────────────────┘"),
		);
	});

	it("should log multiple messages in a box", async () => {
		const log = new Logger();
		const messages = ["Hello World", "Hello Moon"];
		log.boring = true;
		log.printBox(messages);
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("┌─────────────────┐"),
		);
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[0]));
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[1]));
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("└─────────────────┘"),
		);
	});

	it("should respect a custom box padding", async () => {
		const log = new Logger();
		const messages = ["Hello World", "Hello Moon"];
		log.boring = true;
		log.printBox(messages, { padding: 2 });
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("┌───────────────────────┐"),
		);
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[0]));
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[1]));
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("└───────────────────────┘"),
		);
	});
});

describe("when testing in-memory logging functionality", () => {
	beforeEach(() => {
		kleur.enabled = false;
		mock.info = vi.fn();
		mock.log = vi.fn();
		mock.debug = vi.fn();
		mock.warn = vi.fn();
		mock.error = vi.fn();
		spyInfo = vi.spyOn(console, "info").mockImplementation(mock.info);
		spyLog = vi.spyOn(console, "log").mockImplementation(mock.log);
		spyDebug = vi.spyOn(console, "debug").mockImplementation(mock.debug);
		spyWarn = vi.spyOn(console, "warn").mockImplementation(mock.warn);
		spyError = vi.spyOn(console, "error").mockImplementation(mock.error);

		spyDate = vi
			.spyOn(Date.prototype, "toDateString")
			.mockImplementation(() => "Sat Oct 31 2020");
		spyLocaleTime = vi
			.spyOn(Date.prototype, "toLocaleTimeString")
			.mockImplementation(() => "5:00:00 PM");
	});

	afterEach(() => {
		spyDate.mockRestore();
		spyInfo.mockRestore();
		spyLocaleTime.mockRestore();
		spyLog.mockRestore();
		spyDebug.mockRestore();
		spyWarn.mockRestore();
		spyError.mockRestore();
	});

	it("should store logs in memory when inMemory is enabled", () => {
		const log = new Logger({ inMemory: true });
		log.info("Memory log 1");
		log.error("Memory log 2");

		const logs = log.getMemoryLogs();
		expect(logs).toBe("Memory log 1\nMemory log 2");

		// Verify no console output when inMemory is enabled.
		expect(mock.info).not.toHaveBeenCalled();
		expect(mock.error).not.toHaveBeenCalled();
	});

	it("should clear memory logs when clearMemoryLogs is called", () => {
		const log = new Logger({ inMemory: true });
		log.info("Memory log 1");
		log.error("Memory log 2");

		// Verify logs are stored.
		expect(log.getMemoryLogs()).toBe("Memory log 1\nMemory log 2");

		// Clear logs.
		log.clearMemoryLogs();

		// Verify logs are cleared.
		expect(log.getMemoryLogs()).toBe("");
	});

	it("should preserve timestamps in memory logs when timestamp is enabled", () => {
		const log = new Logger({ inMemory: true, timestamp: true });
		log.info("Memory log with timestamp");

		expect(log.getMemoryLogs()).toBe(
			"[ Sat Oct 31 2020 5:00:00 PM ] Memory log with timestamp",
		);
	});

	it("should preserve prefix in memory logs when prefix is set", () => {
		const log = new Logger({ inMemory: true, prefix: "TEST" });
		log.info("Memory log with prefix");

		expect(log.getMemoryLogs()).toBe("TEST Memory log with prefix");
	});

	it("should preserve both timestamp and prefix in memory logs", () => {
		const log = new Logger({ inMemory: true, timestamp: true, prefix: "TEST" });
		log.info("Memory log with timestamp and prefix");

		expect(log.getMemoryLogs()).toBe(
			"TEST [ Sat Oct 31 2020 5:00:00 PM ] Memory log with timestamp and prefix",
		);
	});

	it("should not affect previously retrieved logs when clearing memory", () => {
		const log = new Logger({ inMemory: true });
		log.info("Memory log 1");
		log.error("Memory log 2");

		const logs = log.getMemoryLogs();
		log.clearMemoryLogs();

		// Original variable should still contain the logs.
		expect(logs).toBe("Memory log 1\nMemory log 2");
		// But new retrieval should be empty.
		expect(log.getMemoryLogs()).toBe("");
	});

	it("should disable colors when inMemory is enabled via constructor", () => {
		const log = new Logger({ inMemory: true });

		// Try to enable colors, which should be ignored in memory mode.
		log.boring = false;

		log.info("Memory log with colors disabled");
		expect(log.getMemoryLogs()).toBe("Memory log with colors disabled");
	});

	it("should disable colors when inMemory is enabled via setter", () => {
		const log = new Logger();
		log.boring = false; // Enable colors

		// Then enable in-memory mode, which should disable colors.
		log.inMemory = true;

		log.info("Memory log with colors disabled");
		expect(log.getMemoryLogs()).toBe("Memory log with colors disabled");
	});

	it("should handle multiple log types in memory", () => {
		const log = new Logger({ inMemory: true });

		log.info("Info message");
		log.log("Log message");
		log.debug("Debug message");
		log.warn("Warning message");
		log.error("Error message");

		expect(log.getMemoryLogs()).toBe(
			"Info message\n" +
				"Log message\n" +
				"Debug message\n" +
				"Warning message\n" +
				"Error message",
		);
	});

	it("should handle complex objects in memory logs", () => {
		const log = new Logger({ inMemory: true });

		log.info({ test: "object", nested: { value: 123 } });

		expect(log.getMemoryLogs()).toContain("test: 'object'");
		expect(log.getMemoryLogs()).toContain("nested: {");
		expect(log.getMemoryLogs()).toContain("value: 123");
	});
});
