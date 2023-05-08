# Node CLI Logger

![npm](https://img.shields.io/npm/v/@node-cli/logger?label=version&logo=npm)

> Logger is a dead-simple console logger for nodejs command-line applications.

## Installation

```sh
> cd your-project
> npm install --save-dev @node-cli/logger
```

## Usage

```js
import { Logger } from "@node-cli/logger";
const log = new Logger();

log.info("this is an informational log");
log.warn("this is a warning log");
log.error("this is an error log");
```

## API

### Methods

Logger relies on `console` behind the scenes, and therefore supports the same [string substitution](https://developer.mozilla.org/en-US/docs/Web/API/console#Using_string_substitutions) capabilities and uses the following methods:

| Method | Description                                               | Output color |
| ------ | --------------------------------------------------------- | ------------ |
| debug  | Outputs a message to the console with the log level debug | grey         |
| log    | For general output of logging information.                | white        |
| info   | Informative logging of information.                       | blue         |
| warn   | Outputs a message to the console with the log level debug | yellow       |
| error  | Outputs an error message.                                 | red          |

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

## License

MIT © Arno Versini
