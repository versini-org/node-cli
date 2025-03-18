# @node-cli/logger

![npm](https://img.shields.io/npm/v/@node-cli/logger?label=version&logo=npm)

> A powerful, flexible console logger for Node.js command-line applications with rich formatting options and in-memory logging capabilities.

## Installation

```sh
npm install --save-dev @node-cli/logger
```

## Overview

`@node-cli/logger` provides two main classes:

- **`Logger`**: A versatile console logger with enhanced formatting, colors, and utility methods
- **`Spinner`**: An elegant terminal spinner for displaying progress, based on [ora](https://github.com/sindresorhus/ora)

## Basic Usage

### Logger

```js
import { Logger } from "@node-cli/logger";

// Create a new logger instance
const log = new Logger();

// Basic logging methods
log.info("This is an informational message");
log.warn("This is a warning message");
log.error("This is an error message");
log.debug("This is a debug message");
log.log("This is a standard log message");
```

### Spinner

```js
import { Spinner } from "@node-cli/logger";

// Create a new spinner with initial text
const spinner = new Spinner("Processing files...");

// Start the spinner
spinner.start();

// Update the spinner text during a long-running process
spinner.text = "Analyzing data...";

// Complete the spinner with different statuses
spinner.stop("Process completed successfully!"); // Success (default)
// or
spinner.stop("Process failed!", Spinner.ERROR); // Error
// or
spinner.stop("Process needs attention", Spinner.WARNING); // Warning
// or
spinner.stop("Process information", Spinner.INFO); // Info
```

## Advanced Logger Examples

### Customizing Logger Output

```js
// Initialize with options
const log = new Logger({
  boring: false, // Enable colors (default)
  silent: false, // Enable logging (default)
  prefix: "MyApp:", // Add a prefix to all logs
  timestamp: true, // Add timestamps to logs
  inMemory: false // Log to console (default)
});

// Log with different levels
log.info("Starting application...");
log.debug("Debug information");
log.warn("Warning: configuration file not found");
log.error("Error: failed to connect to database");

// Output:
// MyApp: [ Tue Mar 18 2025 10:30:00 AM ] Starting application...
// MyApp: [ Tue Mar 18 2025 10:30:01 AM ] Debug information
// MyApp: [ Tue Mar 18 2025 10:30:02 AM ] Warning: configuration file not found
// MyApp: [ Tue Mar 18 2025 10:30:03 AM ] Error: failed to connect to database
```

### Dynamic Configuration

```js
const log = new Logger();

// Change configuration at runtime
log.info("Normal colored output");

// Disable colors for test environments
log.boring = process.env.NODE_ENV === "test";
log.info("No colors in test environment");

// Add a prefix for specific sections
log.prefix = "[CONFIG]";
log.info("Loading configuration..."); // Output: [CONFIG] Loading configuration...

// Add timestamps for debugging
log.timestamp = true;
log.debug("Detailed timing information"); // Output: [CONFIG] [ Tue Mar 18 2025 10:30:00 AM ] Detailed timing information

// Silence logs temporarily
log.silent = true;
log.info("This won't be displayed");

// Re-enable logs
log.silent = false;
log.info("Logging resumed");
```

### Printing Messages in a Box

```js
// Simple box with default options
log.printBox("Important Message");
/*
┌─────────────────────┐
│                       │
│  Important Message    │
│                       │
└─────────────────────┘
*/

// Multiple messages in a box
log.printBox(["Welcome to MyApp v1.2.3", "Copyright © 2025"]);
/*
┌─────────────────────────┐
│                           │
│  Welcome to MyApp v1.2.3  │
│    Copyright © 2025       │
│                           │
└─────────────────────────┘
*/

// Customized box
log.printBox("WARNING: Disk space low", {
  borderColor: "red",
  padding: 2,
  textAlignment: "center",
  title: "System Alert",
  newLineAfter: true,
  newLineBefore: true
});
/*
┌─ System Alert ─────────────┐
│                              │
│                              │
│    WARNING: Disk space low   │
│                              │
│                              │
└───────────────────────────┘
*/
```

### Error Handling and Process Exit

```js
// Display multiple errors and exit the process
const errors = [
  "Failed to connect to database",
  "Configuration file is invalid",
  "Required environment variables missing"
];

// Display errors and exit with code 1
log.printErrorsAndExit(errors, 1);

// Or just display errors without exiting
log.printErrorsAndExit(errors);
```

### In-Memory Logging

```js
// Create a logger that stores logs in memory instead of console
const memoryLogger = new Logger({ inMemory: true });

// Log messages that are stored in memory
memoryLogger.info("Starting process");
memoryLogger.warn("Resource usage high");
memoryLogger.error("Process failed");

// Retrieve all logs as a string
const logs = memoryLogger.getMemoryLogs();
console.log(logs);
// Output:
// Starting process
// Resource usage high
// Process failed

// Clear memory logs when no longer needed
memoryLogger.clearMemoryLogs();

// Toggle between console and memory logging
const log = new Logger();
log.info("This goes to console");

log.inMemory = true;
log.info("This goes to memory only");

// Get only the in-memory logs
const memLogs = log.getMemoryLogs(); // Contains only "This goes to memory only"

log.inMemory = false;
log.info("Back to console logging");
```

## Advanced Spinner Examples

### Spinner with Custom Options

```js
// Create a spinner with custom options
const spinner = new Spinner({
  text: "Processing...",
  color: "blue",
  spinner: "dots" // Use the 'dots' spinner pattern
});

spinner.start();
```

### Spinner in Async Functions

```js
import { Spinner } from "@node-cli/logger";

async function deployApplication() {
  const spinner = new Spinner("Preparing deployment...");
  spinner.start();

  try {
    // Building phase
    spinner.text = "Building application...";
    await buildApp();

    // Testing phase
    spinner.text = "Running tests...";
    await runTests();

    // Deployment phase
    spinner.text = "Deploying to production...";
    await deploy();

    // Success
    spinner.stop("Deployment completed successfully!");
    return true;
  } catch (error) {
    // Handle failure
    spinner.stop(`Deployment failed: ${error.message}`, Spinner.ERROR);
    return false;
  }
}
```

### Chaining Multiple Spinners

```js
import { Spinner } from "@node-cli/logger";

async function processWorkflow() {
  // Step 1
  const step1 = new Spinner("Step 1: Data validation");
  step1.start();
  await validateData();
  step1.stop("Data validation complete", Spinner.SUCCESS);

  // Step 2
  const step2 = new Spinner("Step 2: Processing records");
  step2.start();
  await processRecords();
  step2.stop("Records processed", Spinner.SUCCESS);

  // Step 3
  const step3 = new Spinner("Step 3: Generating report");
  step3.start();
  await generateReport();
  step3.stop("Report generated", Spinner.SUCCESS);

  console.log("Workflow completed successfully!");
}
```

## API Reference

### Logger Class

#### Constructor Options

| Option      | Type    | Default | Description                             |
| ----------- | ------- | ------- | --------------------------------------- |
| `boring`    | boolean | `false` | Disable colors in output                |
| `silent`    | boolean | `false` | Disable all logging                     |
| `prefix`    | string  | `""`    | Add a prefix to all log messages        |
| `timestamp` | boolean | `false` | Add timestamps to all log messages      |
| `inMemory`  | boolean | `false` | Store logs in memory instead of console |

#### Methods

| Method               | Arguments                                                   | Description                                            |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `log`                | `...args`                                                   | Standard log output (white)                            |
| `info`               | `...args`                                                   | Informational log output (blue)                        |
| `debug`              | `...args`                                                   | Debug log output (grey)                                |
| `warn`               | `...args`                                                   | Warning log output (yellow)                            |
| `error`              | `...args`                                                   | Error log output (red)                                 |
| `printBox`           | `messages: string \| string[]`, `options?: PrintBoxOptions` | Display message(s) in a formatted box                  |
| `printErrorsAndExit` | `errorMessages: string[]`, `exitStatus?: number`            | Display error messages and optionally exit the process |
| `getMemoryLogs`      | none                                                        | Get all logs stored in memory as a string              |
| `clearMemoryLogs`    | none                                                        | Clear all logs stored in memory                        |

#### Properties (Setters)

| Property    | Type    | Description                      |
| ----------- | ------- | -------------------------------- |
| `silent`    | boolean | Enable/disable logging           |
| `boring`    | boolean | Enable/disable colors            |
| `prefix`    | string  | Set prefix for log messages      |
| `timestamp` | boolean | Enable/disable timestamps        |
| `inMemory`  | boolean | Enable/disable in-memory logging |

#### PrintBox Options

| Option          | Type    | Default     | Description                                      |
| --------------- | ------- | ----------- | ------------------------------------------------ |
| `newLineAfter`  | boolean | `true`      | Print a new line after the box                   |
| `newLineBefore` | boolean | `true`      | Print a new line before the box                  |
| `borderColor`   | string  | `"yellow"`  | Color of the box border                          |
| `padding`       | number  | `1`         | Padding inside the box                           |
| `textAlignment` | string  | `"center"`  | Text alignment (`"left"`, `"center"`, `"right"`) |
| `title`         | string  | `undefined` | Optional title for the box                       |

Plus all options from [Boxen](https://github.com/sindresorhus/boxen).

### Spinner Class

#### Constructor Options

Accepts all options from [ora](https://github.com/sindresorhus/ora).

| Option    | Type             | Description                       |
| --------- | ---------------- | --------------------------------- |
| `text`    | string           | Text to display after the spinner |
| `color`   | string           | Color of the spinner              |
| `spinner` | string \| object | Spinner pattern to use            |
| ...       | ...              | All other ora options             |

#### Methods

| Method  | Arguments                          | Description                                    |
| ------- | ---------------------------------- | ---------------------------------------------- |
| `start` | `text?: string`                    | Start the spinner with optional text           |
| `stop`  | `text?: string`, `status?: string` | Stop the spinner with optional text and status |

#### Properties

| Property | Type   | Description          |
| -------- | ------ | -------------------- |
| `text`   | string | Set the spinner text |

#### Status Constants

| Constant          | Value       | Description                         |
| ----------------- | ----------- | ----------------------------------- |
| `Spinner.SUCCESS` | `"success"` | Success status (green checkmark)    |
| `Spinner.ERROR`   | `"fail"`    | Error status (red X)                |
| `Spinner.WARNING` | `"warn"`    | Warning status (yellow exclamation) |
| `Spinner.INFO`    | `"info"`    | Info status (blue i)                |

## Environment Compatibility

- Works with Node.js >=16
- ESM module format
- TypeScript definitions included

## License

MIT © Arno Versini
