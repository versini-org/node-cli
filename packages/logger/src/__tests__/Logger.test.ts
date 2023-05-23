import { Logger } from "../Logger";
import { jest } from "@jest/globals";
import kleur from "kleur";

let mock = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		log: jest.fn(),
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
			"{\n  titi: {\n    tata: 3\n  },\n  toto: 1\n}"
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
			"[ Sat Oct 31 2020 5:00:00 PM ] Hello World"
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
			"==> [ Sat Oct 31 2020 5:00:00 PM ] Hello World"
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
			"[ Sat Oct 31 2020 5:00:00 PM ] Hello World"
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
	`("should respect the color for type $type", ({ type, color }) => {
		const log = new Logger({ timestamp: true });
		const message = "Hello Technicolor";
		const messagePrefix = "[ Sat Oct 31 2020 5:00:00 PM ]";

		log[type](message);
		expect(mock[type]).toHaveBeenCalledWith(expect.stringContaining(message));
		expect(mock[type]).toHaveBeenCalledWith(
			expect.stringContaining(messagePrefix)
		);
	});
});

/**
 * printErrorsAndExit logging capabilities need to be
 * tested a little bit differently:
 * - mocking process.exit
 * - console.log
 */
describe("when testing for printErrorsAndExit with logging side-effects", () => {
	beforeEach(() => {
		kleur.enabled = false;
		mock.log = jest.fn();
		mock.warn = jest.fn();
		mock.error = jest.fn();
		mock.exit = () => {
			return undefined as never;
		};

		spyLog = jest.spyOn(console, "log").mockImplementation(mock.log);
		spyWarn = jest.spyOn(console, "warn").mockImplementation(mock.warn);
		spyError = jest.spyOn(console, "error").mockImplementation(mock.error);
		spyExit = jest.spyOn(process, "exit").mockImplementation(mock.exit);
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
			expect.stringContaining("┌─────────────────┐")
		);
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(message));
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("└─────────────────┘")
		);
	});

	it("should log multiple messages in a box", async () => {
		const log = new Logger();
		const messages = ["Hello World", "Hello Moon"];
		log.boring = true;
		log.printBox(messages);
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("┌─────────────────┐")
		);
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[0]));
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[1]));
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("└─────────────────┘")
		);
	});

	it("should respect a custom box padding", async () => {
		const log = new Logger();
		const messages = ["Hello World", "Hello Moon"];
		log.boring = true;
		log.printBox(messages, { padding: 2 });
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("┌───────────────────────┐")
		);
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[0]));
		expect(mock.log).toHaveBeenCalledWith(expect.stringContaining(messages[1]));
		expect(mock.log).toHaveBeenCalledWith(
			expect.stringContaining("└───────────────────────┘")
		);
	});
});
