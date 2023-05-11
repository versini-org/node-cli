import { execaCommand } from "execa";
import kleur from "kleur";

/**
 * Runs a shell command asynchronously and
 * returns both `stdout` and `stderr`.
 * If the command fails to run (invalid command or the commands status is
 * anything but 0), the call will throw an exception. The exception can be
 * ignored if the `options.ignoreError` flag is true.
 *
 * @async
 */
export const run = async (
	command: string,
	options?: { ignoreError?: boolean }
): Promise<any> => {
	const { ignoreError } = {
		ignoreError: false,
		...options,
	};
	try {
		const { stdout, stderr } = await execaCommand(command, {
			/**
			 * For some reason, a command with a " or ' in execa.command() will
			 * fail, but it works if shell is set to true... It would work if
			 * the execaCommand() API is not used:
			 * execa("ls", ["-l", "|", "wc"]);
			 * Same problems with &, &&, | and ||.
			 */
			shell:
				command.includes('"') ||
				command.includes("'") ||
				command.includes("&&") ||
				command.includes("&") ||
				command.includes("||") ||
				command.includes("|"),
		});

		return { stderr, stdout };
	} catch (error) {
		if (ignoreError) {
			return {
				exitCode: error.exitCode === undefined ? 1 : error.exitCode,
				shortMessage: error.shortMessage,
				stderr: error.exitCode === undefined ? 1 : error.exitCode,
			};
		} else {
			throw new Error(kleur.red(error));
		}
	}
};
