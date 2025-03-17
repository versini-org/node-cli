# @node-cli/search

![npm](https://img.shields.io/npm/v/@node-cli/search?label=version&logo=npm)

> A powerful and flexible command line tool for searching files and directories with advanced filtering capabilities. It combines the functionality of shell commands like "find" and "grep" with additional features for modern development workflows.

## Features

- Find files or folders that match specific patterns
- Search for text within files using regular expressions
- Filter results by file type, extension, or name
- Respect `.gitignore` files (or optionally ignore them)
- Execute commands on matched files
- Output file content in different formats (simple text or XML) if needed
- Detailed statistics about search operations

## Installation

This command line utility can be installed globally or locally within your project. It makes more sense to install it globally so it can be used anywhere to search files and folders in the current directory.

```sh
npm install --global @node-cli/search
```

## Command Line Usage

### Help

To get help about available options and usage, run:

```sh
search --help
```

### Basic Examples

**Find all files with the extension ".jsx" in the "src" folder:**

```sh
search --type f --pattern "\.jsx$" src/
```

**Find all files without the extensions "jsx" or "md" in the "src" folder:**

```sh
search --type f --ignoreExtension jsx --ignoreExtension md src/
```

**Change the permissions to executable for all shell scripts in the "bin" folder:**

```sh
search --type f --pattern "\.sh$" --command "chmod +x" bin/
```

**Search in all markdown files for the keywords "Table of Content":**

```sh
search --type f --pattern "\.md$" --grep "Table of Content"
```

**Find all files with the extension ".jsx" and print their content:**

```sh
search --type f --pattern "\.jsx$" --printMode simple src/
```

**Find all files with the extension ".jsx" and print their content in Claude XML format:**

```sh
search --type f --pattern "\.jsx$" --printMode xml src/
```

### Advanced Examples

**Find all files ignoring case sensitivity:**

```sh
search --type f --pattern "readme" --ignoreCase
```

**Find all hidden files:**

```sh
search --type f --dot
```

**Find all files ignoring specific folders:**

```sh
search --type f --ignoreFolder node_modules --ignoreFolder dist
```

**Find all files ignoring specific file names:**

```sh
search --type f --ignoreFile README.md --ignoreFile CHANGELOG.md
```

**Find all non-minified JavaScript files:**

```sh
search --type f --pattern "\.js$" --ignoreExtension min.js
```

**Search for multiple patterns in TypeScript files:**

```sh
search --type f --pattern "\.ts$" --grep "export (class|function|const)"
```

**Find all files ignoring .gitignore rules:**

```sh
search --type f --ignoreGitIgnore
```

## Programmatic API Usage

The search functionality can also be used programmatically in your Node.js applications:

```javascript
import { Search } from "@node-cli/search";

// Create a new search instance with configuration
const search = new Search({
  // Path to search in
  path: process.cwd(),

  // Search for files only
  type: "f",

  // Pattern to match file names (as RegExp string)
  pattern: ".js$",

  // Case insensitive search
  ignoreCase: true,

  // Show hidden files
  dot: true,

  // Display statistics
  stats: true,

  // Extensions to ignore
  ignoreExtension: ["min.js", "map"],

  // Files to ignore
  ignoreFile: ["package-lock.json"],

  // Folders to ignore
  ignoreFolder: ["node_modules", "dist"],

  // Search for text within files
  grep: "function",

  // Command to execute on matched files
  command: "wc -l",

  // Output format
  printMode: "simple", // or 'xml'

  // Ignore .gitignore rules
  ignoreGitIgnore: false,

  // Short listing format
  short: true,

  // No color output
  boring: false
});

// Start the search and print results to the console
await search.start();
```

### Returning Results Instead of Printing

By default, the search results are printed to the console. To get the results as a string instead, pass `true` to the `start()` method:

```javascript
// For simple print mode
const search = new Search({
  path: "./src",
  type: "f",
  pattern: ".ts$",
  printMode: "simple"
});
const results = await search.start(true);
// results will contain the file contents in simple format
```

### XML Output Format

The XML output format is useful for parsing search results in other applications:

```javascript
const search = new Search({
  path: "./src",
  type: "f",
  pattern: ".ts$",
  printMode: "xml"
});
const xmlResults = await search.start(true);
// xmlResults will contain the file contents in XML format
```

### Searching with Regular Expressions

You can use regular expressions for both file pattern matching and content searching:

```javascript
const search = new Search({
  path: "./src",
  type: "f",
  pattern: "(component|hook).tsx?$",
  grep: "export\\s+const\\s+\\w+\\s*=\\s*\\(",
  ignoreCase: true
});
await search.start();
```

### Filtering Options

The search utility provides multiple ways to filter results:

```javascript
const search = new Search({
  path: "./src",
  type: "f",
  // Ignore specific file extensions
  ignoreExtension: ["test.ts", "spec.ts", "d.ts"],
  // Ignore specific file names
  ignoreFile: ["index.ts", "constants.ts"],
  // Ignore specific folders
  ignoreFolder: ["__tests__", "__mocks__"]
});
await search.start();
```

## Available Options

| Option            | Type     | Description                                                        |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `path`            | string   | The path where to start the search (defaults to current directory) |
| `type`            | string   | Search for files ('f'), directories ('d'), or both ('both')        |
| `pattern`         | string   | A regular expression to match file or folder names                 |
| `grep`            | string   | A regular expression to match the content of files                 |
| `ignoreCase`      | boolean  | Ignore case when searching                                         |
| `dot`             | boolean  | Show hidden files and directories                                  |
| `short`           | boolean  | Short listing format (equivalent to ls)                            |
| `stats`           | boolean  | Display search statistics                                          |
| `command`         | string   | Command to execute over each matched node                          |
| `ignoreExtension` | string[] | File extensions to ignore                                          |
| `ignoreFile`      | string[] | File names to ignore                                               |
| `ignoreFolder`    | string[] | Folder names to ignore                                             |
| `printMode`       | string   | Print mode ('simple' or 'xml')                                     |
| `ignoreGitIgnore` | boolean  | Ignore .gitignore files                                            |
| `boring`          | boolean  | Do not use color output                                            |

## License

MIT © Arno Versini
