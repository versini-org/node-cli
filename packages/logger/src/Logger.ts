import boxen, { Options as BoxenOptions } from "boxen";
import ora, { Ora, Options as OraOptions } from "ora";

import util from "node:util";
import kleur from "kleur";

export type PrintBoxOptions = {
	newLineAfter?: boolean;
	newLineBefore?: boolean;
} & BoxenOptions;

export type LoggerOptions = {
	boring?: boolean;
	silent?: boolean;
	prefix?: string;
	timestamp?: boolean;
	inMemory?: boolean;
};

export class Logger {
	#shouldLog: boolean;
	#globalPrefix: string;
	#showTimestamp: boolean;
	#printOptions: { colors: boolean; compact: boolean; depth: number };
	#inMemory: boolean;
	#memoryLogs: string[];

	constructor({
		boring = false,
		silent = false,
		prefix = "",
		timestamp = false,
		inMemory = false,
	} = {}) {
		this.#shouldLog = !silent;
		this.#globalPrefix = prefix;
		this.#showTimestamp = timestamp;
		this.#inMemory = inMemory;
		this.#memoryLogs = [];

		// When in memory mode, we disable colors
		this.#printOptions = {
			colors: !boring && !inMemory,
			compact: false,
			depth: 5,
		};
	}

	set silent(flag: boolean) {
		this.#shouldLog = !flag;
	}

	set boring(flag: boolean) {
		// Only set colors if not in memory mode
		if (!this.#inMemory) {
			this.#printOptions.colors = !flag;
		}
	}

	set prefix(prefix: string) {
		this.#globalPrefix = prefix;
	}

	set timestamp(flag: boolean) {
		this.#showTimestamp = flag;
	}

	set inMemory(flag: boolean) {
		this.#inMemory = flag;
		// When enabling in-memory mode, disable colors
		if (flag) {
			this.#printOptions.colors = false;
		}
	}

	/**
	 * Get the accumulated logs as a string
	 * @returns {string} All logs joined by the separator
	 */
	getMemoryLogs(): string {
		return this.#memoryLogs.join("\n");
	}

	/**
	 * Clear all accumulated logs from memory
	 */
	clearMemoryLogs(): void {
		this.#memoryLogs = [];
	}

	#_log(
		type: { method: string | number; color: (argument0: any) => any },
		...arguments_: string[]
	) {
		if (this.#shouldLog) {
			let message: string;
			if (!this.#showTimestamp && !this.#globalPrefix) {
				message = util.formatWithOptions(this.#printOptions, ...arguments_);
			} else {
				const prefix = this.#globalPrefix ? [this.#globalPrefix] : [];
				if (this.#showTimestamp) {
					const now = new Date();
					prefix.push(
						this.#printOptions.colors
							? `${kleur.grey(
									`[ ${now.toDateString()} ${now.toLocaleTimeString()} ]`,
								)}`
							: `[ ${now.toDateString()} ${now.toLocaleTimeString()} ]`,
					);
				}

				message = util.formatWithOptions(
					this.#printOptions,
					prefix.join(" "),
					...arguments_,
				);
			}

			// Store in memory if enabled
			if (this.#inMemory) {
				this.#memoryLogs.push(message);
			}

			// Still output to console if not in memory-only mode
			if (!this.#inMemory) {
				console[type.method](
					this.#printOptions.colors ? `${type.color(message)}` : message,
				);
			}
		}
	}

	info(...arguments_: any) {
		this.#_log({ method: "info", color: kleur.blue }, ...arguments_);
	}

	log(...arguments_: any) {
		this.#_log({ method: "log", color: kleur.white }, ...arguments_);
	}

	debug(...arguments_: any) {
		this.#_log({ method: "debug", color: kleur.grey }, ...arguments_);
	}

	warn(...arguments_: any) {
		this.#_log({ method: "warn", color: kleur.yellow }, ...arguments_);
	}

	error(...arguments_: any) {
		this.#_log({ method: "error", color: kleur.red }, ...arguments_);
	}

	/**
	 * Log multiple error messages at the prompt using `console.error` behind the scenes.
	 * @param {string[]} errorMessages array of error message to display line by line
	 * @param {number} [exitStatus] the process will exit with this value if provided
	 */
	printErrorsAndExit(errorMessages: string[], exitStatus?: number) {
		if (errorMessages && errorMessages.length > 0) {
			this.log();
			for (const message of errorMessages) {
				this.error(message);
			}
			this.log();

			if (typeof exitStatus === "number") {
				// eslint-disable-next-line unicorn/no-process-exit
				process.exit(exitStatus);
			}
		}
	}

	/**
	 * Print sets of logs in a box (wrapper to Boxen)
	 * @param messages Messages to print
	 * @param options
	 */
	printBox(messages: string | string[], options: PrintBoxOptions = {}) {
		const { newLineAfter, newLineBefore } = {
			newLineAfter: true,
			newLineBefore: true,
			...options,
		};

		/**
		 * Setting some sensible Boxen options if
		 * not provided by the user.
		 */
		const borderColor = options.borderColor || "yellow";
		const boxenOptions: BoxenOptions = {
			...options,
			borderColor: this.#printOptions.colors ? borderColor : "white",
			padding: typeof options.padding === "number" ? options.padding : 1,
			textAlignment: options.textAlignment || "center",
		};

		const oldPrefix = this.#globalPrefix;
		const oldTimestamp = this.#showTimestamp;

		this.#globalPrefix = "";
		this.#showTimestamp = false;

		newLineBefore && this.log();
		this.log(
			boxen(
				typeof messages === "string" ? messages : messages.join("\n"),
				boxenOptions,
			),
		);
		newLineAfter && this.log();

		this.#showTimestamp = oldTimestamp;
		this.#globalPrefix = oldPrefix;
	}
}

/* v8 ignore next 48 */
export class Spinner {
	spinner: Ora;

	constructor(options?: OraOptions) {
		this.spinner = ora({
			...options,
			isSilent: process.env.NODE_ENV === "test",
		});
	}

	set text(message: string) {
		this.spinner.text = message;
	}

	start(message?: string) {
		this.spinner.start(message);
	}

	stop(message?: string, type?: string) {
		switch (type) {
			case Spinner.ERROR: {
				this.spinner.fail(message);
				break;
			}
			case Spinner.WARNING: {
				this.spinner.warn(message);
				break;
			}
			case Spinner.INFO: {
				this.spinner.info(message);
				break;
			}
			default: {
				setTimeout(() => {
					this.spinner.succeed(message);
				}, 1000);
				break;
			}
		}
	}

	static SUCCESS = "success";
	static ERROR = "fail";
	static WARNING = "warn";
	static INFO = "info";
}
