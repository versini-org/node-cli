import { execFile, spawn } from "node:child_process";
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
	return { execFile, spawn: vi.fn() };
});

const mockedExecFile = vi.mocked(execFile);
const mockedSpawn = vi.mocked(spawn);

/**
 * Mimics the subset of ChildProcess that the detached path touches.
 */
const spawnReturnsChild = () => {
	const child = { on: vi.fn(), unref: vi.fn() };
	mockedSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);
	return child;
};

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

const bannerNotification = { ...notification, banner: true };

describe("when building the platform-native notification command", () => {
	/**
	 * The dialog is the macOS default because a banner cannot carry the timer's
	 * own icon and disappears on its own, which loses the alarm entirely when
	 * nobody is watching the screen.
	 */
	it("should default to an alert dialog on macOS", async () => {
		const { args, command, detached } = buildNotifyCommand(
			"darwin",
			notification,
		);

		expect(command).toBe("osascript");
		expect(detached).toBe(true);
		expect(args.at(-1)).toContain('display dialog "Time\'s up!"');
		expect(args.at(-1)).toContain('with title "Timer Notification"');
		expect(args.at(-1)).toContain("hourglass.png");
		expect(args.at(-1)).toContain('buttons {"OK"} default button "OK"');
	});

	it("should play the sound alongside the alert dialog on macOS", async () => {
		const { args } = buildNotifyCommand("darwin", notification);

		expect(args[0]).toBe("-e");
		expect(args[1]).toContain("afplay /System/Library/Sounds/Funk.aiff");
	});

	it("should omit the sound script when the alert has no sound", async () => {
		const { args } = buildNotifyCommand("darwin", { message: "a", title: "b" });

		expect(args).toHaveLength(2);
		expect(args[1]).not.toContain("afplay");
	});

	it("should use a banner on macOS when one is asked for", async () => {
		expect(buildNotifyCommand("darwin", bannerNotification)).toStrictEqual({
			command: "osascript",
			detached: false,
			args: [
				"-e",
				'display notification "Time\'s up!" with title "Timer Notification" sound name "Funk"',
			],
		});
	});

	it("should omit the sound on macOS when none is requested", async () => {
		expect(
			buildNotifyCommand("darwin", { banner: true, message: "a", title: "b" }),
		).toStrictEqual({
			command: "osascript",
			detached: false,
			args: ["-e", 'display notification "a" with title "b"'],
		});
	});

	it("should escape quotes and backslashes in the AppleScript literal", async () => {
		const { args } = buildNotifyCommand("darwin", {
			banner: true,
			message: 'say "hi" \\ bye',
			title: 'a "quoted" title',
		});
		expect(args[1]).toBe(
			'display notification "say \\"hi\\" \\\\ bye" with title "a \\"quoted\\" title"',
		);
	});

	it("should escape quotes and backslashes in the alert dialog literal", async () => {
		const { args } = buildNotifyCommand("darwin", {
			message: 'say "hi" \\ bye',
			title: 'a "quoted" title',
		});
		expect(args.at(-1)).toContain('display dialog "say \\"hi\\" \\\\ bye"');
		expect(args.at(-1)).toContain('with title "a \\"quoted\\" title"');
	});

	/**
	 * The alert is macOS-only: the other two platforms get their native banner
	 * whether or not one was asked for.
	 */
	it("should use notify-send on Linux", async () => {
		expect(buildNotifyCommand("linux", notification)).toStrictEqual({
			command: "notify-send",
			detached: false,
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
		mockedSpawn.mockReset();
	});

	it("should resolve to true when the notifier runs", async () => {
		spawnSucceeds();
		await expect(notify(bannerNotification, "darwin")).resolves.toBe(true);
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
		await expect(notify(bannerNotification, "darwin")).resolves.toBe(false);
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
		await notify(bannerNotification, "darwin");
		expect(mockedExecFile).toHaveBeenCalledWith(
			"osascript",
			expect.any(Array),
			expect.objectContaining({ killSignal: "SIGKILL", timeout: 5000 }),
			expect.any(Function),
		);
	});

	/**
	 * The alert waits for a human, so awaiting it would hold the timer open until
	 * the dialog is clicked and stall anything chained behind it.
	 */
	it("should detach the alert instead of waiting for it to be dismissed", async () => {
		const child = spawnReturnsChild();

		await expect(notify(notification, "darwin")).resolves.toBe(true);
		expect(mockedExecFile).not.toHaveBeenCalled();
		expect(mockedSpawn).toHaveBeenCalledWith(
			"osascript",
			expect.any(Array),
			expect.objectContaining({ detached: true, stdio: "ignore" }),
		);
		expect(child.unref).toHaveBeenCalledTimes(1);
	});

	/**
	 * An unhandled "error" event on a child process is thrown, so a notifier that
	 * cannot spawn at all would otherwise take the timer down with it.
	 */
	it("should swallow a spawn failure on the detached alert", async () => {
		const child = spawnReturnsChild();

		await notify(notification, "darwin");
		expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));

		const handler = child.on.mock.calls[0][1] as () => void;
		expect(handler).not.toThrow();
	});

	it("should resolve to false when the alert cannot be spawned at all", async () => {
		mockedSpawn.mockImplementation(() => {
			throw new Error("spawn EACCES");
		});
		await expect(notify(notification, "darwin")).resolves.toBe(false);
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
