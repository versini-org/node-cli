import { execFile } from "node:child_process";
import { vi } from "vitest";
import { buildNotifyCommand, type Notification, notify } from "../notify.js";

/**
 * Node's own execFile defines promisify.custom, and that implementation calls
 * execFile outside a promise executor, which is what lets a spawn failure throw
 * synchronously. A bare mock has no such property, so promisify would fall back
 * to wrapping the call in `new Promise`, quietly turning every synchronous
 * throw into a rejection and hiding the very failure mode these tests exist to
 * pin down.
 */
vi.mock("node:child_process", () => {
	const execFile = vi.fn();
	/**
	 * vi.mock factories are hoisted, so the symbol is resolved inline rather than
	 * through a top-level `promisify` import.
	 */
	execFile[Symbol.for("nodejs.util.promisify.custom")] = (
		...args: unknown[]
	) => {
		let resolve: (value: unknown) => void;
		let reject: (reason: Error) => void;
		const promise = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});
		/**
		 * deliberately outside the executor above, mirroring Node, so that a
		 * synchronous throw stays synchronous instead of becoming a rejection.
		 */
		execFile(...args, (error: Error | null) =>
			error ? reject(error) : resolve({ stderr: "", stdout: "" }),
		);
		return promise;
	};
	return { execFile };
});

const mockedExecFile = vi.mocked(execFile);

type ExecFileCallback = (error: NodeJS.ErrnoException | null) => void;

/**
 * execFile is called with an optional options argument, so the callback is
 * whatever lands last rather than a fixed position.
 */
const lastArgument = (args: unknown[]): ExecFileCallback =>
	args.at(-1) as ExecFileCallback;

/**
 * Mimics a notifier that spawns successfully and exits cleanly.
 */
const spawnSucceeds = () => {
	mockedExecFile.mockImplementation(((...args: unknown[]) => {
		lastArgument(args)(null);
	}) as unknown as typeof execFile);
};

/**
 * Mimics `child_process.spawn` failing synchronously, which is how a notifier
 * binary that cannot run on the host CPU surfaces: EBADARCH (errno -86, "Bad
 * CPU type in executable") is thrown, not passed to the callback.
 */
const spawnThrowsBadArch = () => {
	mockedExecFile.mockImplementation((() => {
		const error: NodeJS.ErrnoException = new Error(
			"spawn Unknown system error -86",
		);
		error.errno = -86;
		error.code = "Unknown system error -86";
		error.syscall = "spawn";
		throw error;
	}) as unknown as typeof execFile);
};

/**
 * Mimics a notifier that is simply not installed on the host.
 */
const spawnFailsNotFound = () => {
	mockedExecFile.mockImplementation(((...args: unknown[]) => {
		const error: NodeJS.ErrnoException = new Error("spawn ENOENT");
		error.code = "ENOENT";
		lastArgument(args)(error);
	}) as unknown as typeof execFile);
};

const notification = {
	message: "Time's up!",
	sound: "Funk",
	title: "Timer Notification",
};

describe("when building the platform-native notification command", () => {
	it("should use osascript on macOS", async () => {
		expect(buildNotifyCommand("darwin", notification)).toStrictEqual({
			command: "osascript",
			args: [
				"-e",
				'display notification "Time\'s up!" with title "Timer Notification" sound name "Funk"',
			],
		});
	});

	it("should omit the sound on macOS when none is requested", async () => {
		expect(
			buildNotifyCommand("darwin", { message: "a", title: "b" }),
		).toStrictEqual({
			command: "osascript",
			args: ["-e", 'display notification "a" with title "b"'],
		});
	});

	it("should escape quotes and backslashes in the AppleScript literal", async () => {
		const { args } = buildNotifyCommand("darwin", {
			message: 'say "hi" \\ bye',
			title: 'a "quoted" title',
		});
		expect(args[1]).toBe(
			'display notification "say \\"hi\\" \\\\ bye" with title "a \\"quoted\\" title"',
		);
	});

	it("should use notify-send on Linux", async () => {
		expect(buildNotifyCommand("linux", notification)).toStrictEqual({
			command: "notify-send",
			args: ["Timer Notification", "Time's up!"],
		});
	});

	it("should use a PowerShell toast on Windows", async () => {
		const result = buildNotifyCommand("win32", notification);
		expect(result.command).toBe("powershell");
		expect(result.args[0]).toBe("-NoProfile");
		expect(result.args[2]).toContain("ToastNotificationManager");
		expect(result.args[2]).toContain("Timer Notification");
	});

	it("should double single quotes in the PowerShell literal", async () => {
		const { args } = buildNotifyCommand("win32", {
			message: "Time's up!",
			title: "it's fine",
		});
		expect(args[2]).toContain("'Time''s up!'");
		expect(args[2]).toContain("'it''s fine'");
	});

	it("should return null on an unsupported platform", async () => {
		expect(buildNotifyCommand("aix", notification)).toBeNull();
	});
});

describe("when displaying a notification", () => {
	beforeEach(() => {
		mockedExecFile.mockReset();
	});

	it("should resolve to true when the notifier runs", async () => {
		spawnSucceeds();
		await expect(notify(notification, "darwin")).resolves.toBe(true);
		expect(mockedExecFile).toHaveBeenCalledTimes(1);
	});

	/**
	 * Regression: node-notifier spawned a vendored x86_64-only terminal-notifier
	 * binary, so on an Apple Silicon host without Rosetta the spawn threw EBADARCH
	 * straight through the timer callback and crashed the process. A failed
	 * notification must degrade, not throw.
	 */
	it("should resolve to false when the notifier cannot run on this CPU", async () => {
		spawnThrowsBadArch();
		await expect(notify(notification, "darwin")).resolves.toBe(false);
	});

	it("should resolve to false when the notifier is not installed", async () => {
		spawnFailsNotFound();
		await expect(notify(notification, "linux")).resolves.toBe(false);
	});

	/**
	 * A notifier that spawns but never exits would otherwise keep the CLI alive
	 * indefinitely, since the pending child is the last thing holding the event
	 * loop open once the spinner has stopped.
	 */
	it("should bound the spawn so a hung notifier cannot keep the CLI alive", async () => {
		spawnSucceeds();
		await notify(notification, "darwin");
		expect(mockedExecFile).toHaveBeenCalledWith(
			"osascript",
			expect.any(Array),
			expect.objectContaining({ killSignal: "SIGKILL", timeout: 5000 }),
			expect.any(Function),
		);
	});

	it("should resolve to false when a malformed notification is passed", async () => {
		await expect(
			notify(
				{ message: undefined, title: "t" } as unknown as Notification,
				"darwin",
			),
		).resolves.toBe(false);
		expect(mockedExecFile).not.toHaveBeenCalled();
	});

	it("should resolve to false without spawning on an unsupported platform", async () => {
		await expect(notify(notification, "aix")).resolves.toBe(false);
		expect(mockedExecFile).not.toHaveBeenCalled();
	});
});
