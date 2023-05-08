import kleur from "kleur";
import util from "node:util";

export class Logger {
	#shouldLog: boolean;
	#globalPrefix: string;
	#showTimestamp: boolean;
	#printOptions: { colors: boolean; compact: boolean; depth: number };

	constructor({
		boring = false,
		silent = false,
		prefix = "",
		timestamp = false,
	} = {}) {
		this.#shouldLog = !silent;
		this.#globalPrefix = prefix;
		this.#showTimestamp = timestamp;
		this.#printOptions = {
			colors: !boring,
			compact: false,
			depth: 5,
		};
	}

	set silent(flag: boolean) {
		this.#shouldLog = !flag;
	}

	set boring(flag: boolean) {
		this.#printOptions.colors = !flag;
	}

	set prefix(prefix: string) {
		this.#globalPrefix = prefix;
	}

	set timestamp(flag: boolean) {
		this.#showTimestamp = flag;
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
									`[ ${now.toDateString()} ${now.toLocaleTimeString()} ]`
							  )}`
							: `[ ${now.toDateString()} ${now.toLocaleTimeString()} ]`
					);
				}

				message = util.formatWithOptions(
					this.#printOptions,
					prefix.join(" "),
					...arguments_
				);
			}
			console[type.method](
				this.#printOptions.colors ? `${type.color(message)}` : message
			);
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
}
