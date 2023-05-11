# Node CLI run command

![npm](https://img.shields.io/npm/v/@node-cli/run?label=version&logo=npm)

> @node-cli/run is a dead-simple script runner for nodejs command-line applications.

## Installation

```sh
> cd your-project
> npm install --save-dev @node-cli/run
```

## Usage

```js
import { run } from "@node-cli/run";
const { stdout, stderr } = await run("npm config ls");
```

## API

**run(command, options) ⇒ `Promise <string>` | `Promise <object>`**

Runs a shell command asynchronously and returns both `stdout` and `stderr`. If the command fails to run (invalid command or the commands status is anything but 0), the call will throw an exception. The exception can be ignored if the `options.ignoreError` flag is true.

### Arguments

| Argument            | Type    | Default |
| ------------------- | ------- | ------- |
| command             | String  | ""      |
| options             | Object  | { }     |
| options.ignoreError | Boolean | false   |

### Note

If `ignoreError` is used, the method will not throw but will instead return an object with the keys `exitCode` and `shortMessage`.

#### Examples

```js
import { run } from "@node-cli/run";
const { stdout, stderr } = await run("npm config ls");
const { stdout, stderr } = await run(
	"git add -A && git commit -a -m 'First commit'"
);
```

```js
import { run } from "@node-cli/run";
const { exitCode, shortMessage } = await runCommand("ls /not-a-folder", {
	ignoreError: true,
});
// -> exitCode is 1 and shortMessage is "Command failed with exit code 1: ls /not-a-folder"
```
