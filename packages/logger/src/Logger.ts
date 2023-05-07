import kleur from "kleur";
import util from "node:util";

export class Logger {
	shouldLog: boolean;
	globalPrefix: string;
	showTimestamp: boolean;
	printOptions: { colors: boolean; compact: boolean; depth: number };

	constructor({
		boring = false,
		silent = false,
		prefix = "",
		timestamp = false,
	} = {}) {
		this.shouldLog = !silent;
		this.globalPrefix = prefix;
		this.showTimestamp = timestamp;
		this.printOptions = {
			colors: !boring,
			compact: false,
			depth: 5,
		};
	}

	set silent(flag: boolean) {
		this.shouldLog = !flag;
	}

	set boring(flag: boolean) {
		this.printOptions.colors = !flag;
	}

	set prefix(prefix: string) {
		this.globalPrefix = prefix;
	}

	set timestamp(flag: boolean) {
		this.showTimestamp = flag;
	}

	_log(
		type: { method: string | number; color: (arg0: any) => any },
		...args: string[]
	) {
		if (this.shouldLog) {
			let msg: string;
			if (!this.showTimestamp && !this.globalPrefix) {
				msg = util.formatWithOptions(this.printOptions, ...args);
			} else {
				const prefix = this.globalPrefix ? [this.globalPrefix] : [];
				if (this.showTimestamp) {
					const now = new Date();
					prefix.push(
						this.printOptions.colors
							? `${kleur.grey(
									`[ ${now.toDateString()} ${now.toLocaleTimeString()} ]`
							  )}`
							: `[ ${now.toDateString()} ${now.toLocaleTimeString()} ]`
					);
				}

				msg = util.formatWithOptions(
					this.printOptions,
					prefix.join(" "),
					...args
				);
			}
			console[type.method](
				this.printOptions.colors ? `${type.color(msg)}` : msg
			);
		}
	}

	info(...args: any) {
		this._log({ method: "info", color: kleur.blue }, ...args);
	}

	log(...args: any) {
		this._log({ method: "log", color: kleur.white }, ...args);
	}

	debug(...args: any) {
		this._log({ method: "debug", color: kleur.grey }, ...args);
	}

	warn(...args: any) {
		this._log({ method: "warn", color: kleur.yellow }, ...args);
	}

	error(...args: any) {
		this._log({ method: "error", color: kleur.red }, ...args);
	}
}
