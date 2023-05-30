import { PerformanceObserver, performance } from "node:perf_hooks";

import { Logger } from "@node-cli/logger";
import { uniqueID } from "@node-cli/utilities";

const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

export class Performance {
	perfObserver: PerformanceObserver;
	startMarkerName: any;
	measureName: string;

	constructor() {
		this.perfObserver = new PerformanceObserver(
			/* istanbul ignore next */ () => {
				performance.clearMeasures();
			}
		);
		this.perfObserver.observe({ type: "measure" });
	}

	start() {
		if (this.startMarkerName) {
			logger.error("Performance.start() can only be called once");
		} else {
			this.startMarkerName = uniqueID();
			performance.mark(this.startMarkerName);
		}
	}

	stop() {
		if (this.startMarkerName) {
			const stopMarkerName = uniqueID();
			this.measureName = `internal-${this.startMarkerName}-${stopMarkerName}`;

			performance.mark(stopMarkerName);

			performance.measure(
				this.measureName,
				this.startMarkerName,
				stopMarkerName
			);
			this.startMarkerName = undefined;
		} else {
			logger.error(
				"Performance.stop() can only be called once after Performance.start()"
			);
		}
	}

	static now() {
		return performance?.now() * 1e6;
	}

	get now() {
		return Performance.now;
	}

	get results() {
		return {
			duration:
				performance?.getEntriesByName(this.measureName)[0]?.duration ||
				undefined,
		};
	}
}
