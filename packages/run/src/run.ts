import { execa, execaCommand } from "execa";
import kleur from "kleur";
import { parseCommandString } from "./utilities.js";

/**
 * Runs a shell command asynchronously and
 * returns both `stdout` and `stderr`.
 * If the command fails to run (invalid command or the commands status is
 * anything but 0), the call will throw an exception. The exception can be
 * ignored if the `options.ignoreError` flag is true.
 *
 * @async
 */
export type RunResult = {
	stderr?: string | number;
	stdout?: string | number;
	exitCode?: number;
	shortMessage?: string;
};
export type RunOptions = {
	ignoreError?: boolean;
	streamOutput?: boolean;
};
type ExecaOptions = {
	preferLocal: boolean;
	shell: boolean;
	stdout?: ["pipe", "inherit"];
};

export const run = async (
	command: string,
	options?: RunOptions,
): Promise<RunResult> => {
	const { ignoreError } = {
		ignoreError: false,
		...options,
	};
	const execaOptions: ExecaOptions = {
		shell: false,
		preferLocal: true,
	};

	if (
		command.includes("&&") ||
		command.includes("&") ||
		command.includes("||") ||
		command.includes("|")
	) {
		execaOptions.shell = true;
	}

	/* istanbul ignore next */
	if (options?.streamOutput) {
		execaOptions.stdout = ["pipe", "inherit"];
	}

	try {
		if (execaOptions.shell) {
			const { stdout, stderr } = await execaCommand(command, execaOptions);
			return { stderr, stdout };
		} else {
			const commandArray = parseCommandString(command);
			const { stdout, stderr } = await execa(
				commandArray[0],
				commandArray.slice(1),
				execaOptions,
			);
			return { stderr, stdout };
		}
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
