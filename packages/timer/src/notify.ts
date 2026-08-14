import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * A notifier that spawns but never exits would keep the CLI alive forever, so
 * it is killed outright rather than merely asked to stop: a wedged child can
 * ignore SIGTERM.
 */
const NOTIFIER_TIMEOUT_MS = 5000;

/**
 * Resolved from this module rather than the process, so it survives being
 * invoked through a symlinked bin. `src` and `dist` sit at the same depth, so
 * the same relative path works whether the source or the build is running.
 */
const ALERT_ICON_PATH = fileURLToPath(
	new URL("../assets/hourglass.png", import.meta.url),
);

export type Notification = {
	banner?: boolean;
	message: string;
	sound?: string;
	title: string;
};

export type NotifyCommand = {
	args: string[];
	command: string;
	detached: boolean;
};

/**
 * Escapes a value so it can be embedded in an AppleScript double-quoted string
 * literal, where only backslashes and double quotes are special.
 */
const escapeAppleScript = (value: string): string =>
	value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

/**
 * Escapes a value so it can be embedded in a PowerShell single-quoted string
 * literal, where a single quote is escaped by doubling it.
 */
const escapePowerShell = (value: string): string => value.replaceAll("'", "''");

const macBannerCommand = ({
	message,
	sound,
	title,
}: Notification): NotifyCommand => {
	const script = [
		`display notification "${escapeAppleScript(message)}"`,
		`with title "${escapeAppleScript(title)}"`,
		sound ? `sound name "${escapeAppleScript(sound)}"` : "",
	]
		.filter(Boolean)
		.join(" ");

	return { args: ["-e", script], command: "osascript", detached: false };
};

/**
 * A banner auto-dismisses after a few seconds, so a timer that fires while you
 * are away from the keyboard leaves nothing behind. This dialog waits until it
 * is acknowledged, which is the behaviour an alarm actually wants.
 *
 * `display dialog` takes an arbitrary image, which is the only way to escape
 * the Script Editor icon macOS otherwise stamps on anything osascript posts.
 *
 */
const macAlertCommand = ({
	message,
	sound,
	title,
}: Notification): NotifyCommand => {
	const dialog = [
		`display dialog "${escapeAppleScript(message)}"`,
		`with title "${escapeAppleScript(title)}"`,
		`with icon (POSIX file "${escapeAppleScript(ALERT_ICON_PATH)}")`,
		'buttons {"OK"} default button "OK"',
	].join(" ");

	/**
	 * `display dialog` has no sound parameter, so the alert sound is played
	 * alongside it. Backgrounded and silenced because a missing sound file must
	 * not stall or fail the dialog.
	 */
	const play = sound
		? [
				"-e",
				`do shell script "afplay /System/Library/Sounds/${escapeAppleScript(sound)}.aiff > /dev/null 2>&1 &"`,
			]
		: [];

	return {
		args: [...play, "-e", dialog],
		command: "osascript",
		detached: true,
	};
};

const linuxCommand = ({ message, title }: Notification): NotifyCommand => ({
	args: [title, message],
	command: "notify-send",
	detached: false,
});

const windowsCommand = ({ message, title }: Notification): NotifyCommand => {
	const script = [
		"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null",
		"$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
		`$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${escapePowerShell(title)}')) > $null`,
		`$xml.GetElementsByTagName('text')[1].AppendChild($xml.CreateTextNode('${escapePowerShell(message)}')) > $null`,
		"[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('@node-cli/timer').Show([Windows.UI.Notifications.ToastNotification]::new($xml))",
	].join("; ");

	return {
		args: ["-NoProfile", "-Command", script],
		command: "powershell",
		detached: false,
	};
};

/**
 * Builds the platform-native command used to display a desktop notification.
 * Returns null on platforms we do not know how to notify on.
 *
 * Every supported platform ships its notifier as part of the OS, so nothing is
 * vendored and nothing has to match the host CPU architecture.
 *
 * Only macOS distinguishes an alert from a banner: it is the platform whose
 * banner cannot carry our icon, and the one where the dialog is available for
 * free. Linux and Windows always get their native banner.
 *
 */
export const buildNotifyCommand = (
	platform: string,
	notification: Notification,
): NotifyCommand | null => {
	switch (platform) {
		case "darwin": {
			return notification.banner
				? macBannerCommand(notification)
				: macAlertCommand(notification);
		}
		case "linux": {
			return linuxCommand(notification);
		}
		case "win32": {
			return windowsCommand(notification);
		}
		default: {
			return null;
		}
	}
};

/**
 * Releases a notifier that must outlive the CLI. An alert waits for a human, so
 * awaiting it would hold the timer open until the dialog is clicked and stall
 * anything chained behind it.
 *
 * Detaching costs the delivery result: spawn reports failure asynchronously,
 * long after the CLI is gone. The caller is told only that the alert was
 * released, which is all a best-effort courtesy needs to report.
 *
 */
const release = ({ args, command }: NotifyCommand): boolean => {
	const child = spawn(command, args, { detached: true, stdio: "ignore" });

	/**
	 * An unhandled "error" event on a child process is thrown, so a notifier that
	 * cannot spawn at all would take the timer down with it.
	 */
	child.on("error", () => {});
	child.unref();
	return true;
};

/**
 * Displays a desktop notification, resolving to true when it was shown.
 *
 * A notification is a courtesy, never a reason to fail: an unsupported
 * platform, a missing notifier, or a notifier that refuses to run all resolve
 * to false instead of throwing.
 *
 */
export const notify = async (
	notification: Notification,
	platform: string = process.platform,
): Promise<boolean> => {
	try {
		const notifyCommand = buildNotifyCommand(platform, notification);

		if (notifyCommand === null) {
			return false;
		}

		if (notifyCommand.detached) {
			return release(notifyCommand);
		}

		await execFileAsync(notifyCommand.command, notifyCommand.args, {
			killSignal: "SIGKILL",
			timeout: NOTIFIER_TIMEOUT_MS,
		});
		return true;
	} catch {
		return false;
	}
};
