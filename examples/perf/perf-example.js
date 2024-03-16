// ts-check

import { Logger } from "@node-cli/logger";
import { Performance } from "@node-cli/perf";

const logger = new Logger();
const perf = new Performance();

perf.start();
const array = [];
for (let index = 0; index < 2_000_000_000; index++) {
	array[0] = index;
}
perf.stop();
logger.log("==> perf: ", perf.results);

perf.start();
for (let index = 0; index < 1_000_000_000; index++) {
	array[0] = index;
}
perf.stop();
logger.log("==> perf: ", perf.results);
