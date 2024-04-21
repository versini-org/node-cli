import { Logger, Spinner } from "@node-cli/logger";
import moment, { Duration } from "moment";

import notifier from "node-notifier";
import { Configuration } from "./parse.js";

const logger = new Logger();
const spinner = new Spinner();

const UNITS = {
	ms: 1000,
	s: 1000 * 1000,
	m: 1000 * 1000 * 60,
	h: 1000 * 1000 * 60 * 60,
	d: 1000 * 1000 * 60 * 60 * 24,
	w: 1000 * 1000 * 60 * 60 * 24 * 7,
};

export const timeToMicroseconds = (value: string, unit: string) => {
	const result = UNITS[unit];
	return result ? Number.parseInt(value, 10) * result : 0;
};

export const extractDuration = (config: Configuration): Duration => {
	const { parameters, showHelp } = config;
	let totalMicroseconds = 0;

	/* istanbul ignore if */
	if (
		Object.entries(parameters).length === 0 ||
		Object.entries(parameters).length > 1
	) {
		showHelp();
	}

	const groups = parameters["0"].toLowerCase().match(/[+-]?[\d.]+[a-z]+/g);

	/* istanbul ignore if */
	if (groups === null) {
		showHelp();
	} else {
		for (const g of groups) {
			const value = g.match(/[\d.]+/g)[0];
			const unit = g.match(/[a-z]+/g)[0];
			totalMicroseconds += timeToMicroseconds(value, unit);
		}
		return moment.duration(totalMicroseconds / UNITS.ms);
	}
};

/* istanbul ignore next */
export class Timer {
	config: Configuration;
	startTime: number;
	timerDurationMilliSeconds: number;
	introMessage: string;
	timerDurationSeconds: number;

	constructor(config: Configuration) {
		this.config = config;
		const result: Duration = extractDuration(this.config);
		this.timerDurationMilliSeconds = result.asMilliseconds();
		this.timerDurationSeconds = result.asSeconds();
		this.introMessage = `${result.hours()}h ${result.minutes()}m ${result.seconds()}s`;
	}

	start = () => {
		if (this.timerDurationMilliSeconds > 0) {
			logger.printBox(`${this.introMessage}  `, {
				padding: 0,
				borderColor: "cyan",
				title: "Timer Configuration",
			});

			this.startTime = Date.now();
			spinner.start(this.introMessage);

			// update the spinner every second
			this.printRemainingTime();
			const timer = setInterval(this.printRemainingTime, 1000);

			// kill the spinner when the timer is done
			setTimeout(() => {
				const message = "Time's up!";
				if (this.config.flags.notification) {
					notifier.notify({
						message,
						sound: "Funk",
						title: "Timer Notification",
						wait: true,
					});
				}
				clearInterval(timer);
				this.printRemainingTime(message);
				spinner.stop();
			}, this.timerDurationMilliSeconds);
		}
	};

	private printRemainingTime = (message: string | void) => {
		if (message) {
			spinner.text = message;
		} else {
			const elapsed = (Date.now() - this.startTime) / 1000;
			const duration = moment.duration(
				(this.timerDurationSeconds - elapsed) * 1000,
			);
			spinner.text = `${duration.hours()}h ${duration.minutes()}m ${duration.seconds()}s`;
		}
	};
}
