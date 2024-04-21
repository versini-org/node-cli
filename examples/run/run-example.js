/* eslint-disable no-console */
// ts-check

import { run } from "@node-cli/run";

const { stdout, stderr, exitCode, shortMessage } = await run(
	"ls /not-a-folder",
	{ ignoreError: true },
);
console.info(stdout);
console.info(stderr);
console.info("==> exitCode: ", exitCode);
console.info("==> shortMessage: ", shortMessage);
