import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * A notifier that spawns but never exits would keep the CLI alive forever, so
 * it is killed outright rather than merely asked to stop: a wedged child can
 * ignore SIGTERM.
 */
const NOTIFIER_TIMEOUT_MS = 5000;

export type Notification = {
	message: string;
	sound?: string;
	title: string;
};

export type NotifyCommand = {
	args: string[];
	command: string;
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

const macCommand = ({ message, sound, title }: Notification): NotifyCommand => {
	const script = [
		`display notification "${escapeAppleScript(message)}"`,
		`with title "${escapeAppleScript(title)}"`,
		sound ? `sound name "${escapeAppleScript(sound)}"` : "",
	]
		.filter(Boolean)
		.join(" ");

	return { args: ["-e", script], command: "osascript" };
};

const linuxCommand = ({ message, title }: Notification): NotifyCommand => ({
	args: [title, message],
	command: "notify-send",
});

const windowsCommand = ({ message, title }: Notification): NotifyCommand => {
	const script = [
		"[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null",
		"$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
		`$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${escapePowerShell(title)}')) > $null`,
		`$xml.GetElementsByTagName('text')[1].AppendChild($xml.CreateTextNode('${escapePowerShell(message)}')) > $null`,
		"[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('@node-cli/timer').Show([Windows.UI.Notifications.ToastNotification]::new($xml))",
	].join("; ");

	return { args: ["-NoProfile", "-Command", script], command: "powershell" };
};

/**
 * Builds the platform-native command used to display a desktop notification.
 * Returns null on platforms we do not know how to notify on.
 *
 * Every supported platform ships its notifier as part of the OS, so nothing is
 * vendored and nothing has to match the host CPU architecture.
 *
 */
export const buildNotifyCommand = (
	platform: string,
	notification: Notification,
): NotifyCommand | null => {
	switch (platform) {
		case "darwin": {
			return macCommand(notification);
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

		await execFileAsync(notifyCommand.command, notifyCommand.args, {
			killSignal: "SIGKILL",
			timeout: NOTIFIER_TIMEOUT_MS,
		});
		return true;
	} catch {
		return false;
	}
};
