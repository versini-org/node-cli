import { execFile } from "node:child_process";
import { vi } from "vitest";
import { buildNotifyCommand, notify } from "../notify.js";

vi.mock("node:child_process", () => ({
	execFile: vi.fn(),
}));

const mockedExecFile = vi.mocked(execFile);

/**
 * Mimics a notifier that spawns successfully and exits cleanly.
 */
const spawnSucceeds = () => {
	mockedExecFile.mockImplementation(((
		_command: string,
		_args: string[],
		callback: (error: null, stdout: string, stderr: string) => void,
	) => {
		callback(null, "", "");
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
	mockedExecFile.mockImplementation(((
		_command: string,
		_args: string[],
		callback: (error: NodeJS.ErrnoException) => void,
	) => {
		const error: NodeJS.ErrnoException = new Error("spawn ENOENT");
		error.code = "ENOENT";
		callback(error);
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

	it("should resolve to false without spawning on an unsupported platform", async () => {
		await expect(notify(notification, "aix")).resolves.toBe(false);
		expect(mockedExecFile).not.toHaveBeenCalled();
	});
});
