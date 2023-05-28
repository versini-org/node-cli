# Node CLI Logger

![npm](https://img.shields.io/npm/v/@node-cli/logger?label=version&logo=npm)

> Logger is a dead-simple console logger for nodejs command-line applications.

## Installation

```sh
> cd your-project
> npm install --save-dev @node-cli/logger
```

2 classes are available:

- `Logger` which is a facade for `console` and with added methods, such as `printBox()`
- `Spinner` is an "elegant terminal spinner", relying behind the scenes on the excellent [ora](https://github.com/sindresorhus/ora)

## Usage

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.info("this is an informational log");
log.warn("this is a warning log");
log.error("this is an error log");
```

```js
import { Spinner } from "@node-cli/logger";
const spinner = new Spinner("Updating package.json...");

// assuming a long running process here...
spinner.text = "Git stage and commit, please wait...";
// assuming a long running process here...
spinner.text = "Almost there...";
// assuming a long running process here... returning some result
if (result === "success") {
	spinner.succeed("Process completed successfully!");
} else {
	spinner.fail("Process failed miserably...");
}
```

## API

### Logger methods

Logger relies on `console` behind the scenes, and therefore supports the same [string substitution](https://developer.mozilla.org/en-US/docs/Web/API/console#Using_string_substitutions) capabilities and uses the following methods:

| Method             | Description                                               | Output color |
| ------------------ | --------------------------------------------------------- | ------------ |
| debug              | Outputs a message to the console with the log level debug | grey         |
| log                | For general output of logging information.                | white        |
| info               | Informative logging of information.                       | blue         |
| warn               | Outputs a message to the console with the log level debug | yellow       |
| error              | Outputs an error message.                                 | red          |
| printBox           | Output message(s) in a box                                | custom       |
| printErrorsAndExit | Output error message(s) and exit                          | red          |

### Options

#### Disabling logging

You can disable logging with `silent`:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.info("this will be logged");
// disabling logs in production for example
log.silent = process.env.NODE_ENV === "production";
log.info("but this will not");
log.silent = false;
log.info("this will be logged again!");
```

This option can also be passed to the constructor:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger({ silent: true });

log.info("this will not be logged");
log.silent = false;
log.info("this will be logged again!");
```

### Disabling colors

You can disable colors with `boring`:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.info("this will be logged in the default [info] color");
// disabling colors in test mode for example
log.boring = process.env.NODE_ENV === "test";
log.info("but this will not have any colors :/");
log.boring = false;
log.info("colors are back!");
```

This option can also be passed to the constructor:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger({ boring: true });

log.info("this will not be logged in color");
log.boring = false;
log.info("this will be logged again!");
```

### Adding a prefix

You can add a prefix to the logs with `prefix`:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.info("this will be logged with no prefix");
log.prefix = "[INFO]";
log.info("this will have a prefix!");
```

The output of that last line would be:

```sh
> [INFO] this will have a prefix!
```

This option can also be passed to the constructor:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger({ prefix: "Log:" });

log.info("this will be logged with a prefix");
log.prefix = false;
log.info("this will be NOT be logged with a prefix");
```

### Adding a local timestamp

You can add a timestamp to the logs with `timestamp`:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.info("this will be logged with no timestamp");
log.timestamp = true;
log.info("this will have a timestamp!");
```

The output of that last line would look like:

```sh
> [ Tue Feb 02 2021 8:32:58 PM ] this will have a timestamp!
```

This option can also be passed to the constructor:

```js
import { Logger } from "@node-cli/logger";
const log = new Logger({ timestamp: true });

log.info("this will be logged with a timestamp");
log.timestamp = false;
log.info("this will be NOT be logged with a timestamp");
```

### Log one or more messages in a box

The `printBox` method is a wrapper around the excellent [Boxen](https://github.com/sindresorhus/boxen), with sensible defaults.

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.printBox(["Message One!", "Message Two!"]);

┌──────────────────┐
│                  │
│   Message One!   │
│   Message Two!   │
│                  │
└──────────────────┘

```

`printBox` accepts the following options as a second argument:

- `printLineAfter` (default to `true`)
- `printLineBefore` (default to `true`)
- As well as all the options available with [Boxen](https://github.com/sindresorhus/boxen)

Here is a custom example with:

- a red border color
- no extra line after the box
- no padding (no space between the border and the text)
- text is justified to the right
- there is a title injected at the top of the box

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.printBox(["Message One!", "Message Two!"], {
	borderColor: "red",
	newLineAfter: false,
	padding: 0,
	textAlignment: "right",
	title: "Hello World Box Title",
});
```

### Log multiple errors and optionally exit the main program

The following will print 2 error messages and exit with error code 666.
If the second parameter (a number) is not provided, the process does not exit.

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.printErrorsAndExit(["Error One!", "Error Two!"], 666);
```

## License

MIT © Arno Versini
