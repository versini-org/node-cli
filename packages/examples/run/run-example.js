// ts-check

import { run } from "@node-cli/run";

const { stdout, stderr, exitCode, shortMessage } = await run(
	"ls /not-a-folder",
	{ ignoreError: true }
);
console.log(stdout);
console.log(stderr);
console.log("==> exitCode: ", exitCode);
console.log("==> shortMessage: ", shortMessage);
