# Parser

![npm](https://img.shields.io/npm/v/@node-cli/parser?label=version&logo=npm)

> Simple, non-interactive, CLI app arguments parser

# API

**parser(options) ⇒ { flags, parameters, showHelp }**

## Arguments

| Argument                  | Type              |
| ------------------------- | ----------------- |
| options                   | Object            |
| options.meta              | import.meta       |
| options.examples          | Array of Object   |
| options.flags             | Object            |
| options.parameters        | Object            |
| options.usage             | String or Boolean |
| options.defaultFlags      | Object            |
| options.defaultParameters | Object            |

## Example

```js
import { parser } from "@node-cli/parser";

const { flags, parameters, showHelp } = parser({
	meta: import.meta, // this is required for --version to work correctly
	examples: [
		{
			command: 'my-cli --verbose --command "chmod +x" bin',
			comment: '## Make all files executable in the "bin" folder',
		},
	],
	flags: {
		verbose: {
			shortFlag: "V",
			description: "Enable extra logging",
			type: "boolean",
		},
		command: {
			shortFlag: "c",
			description: "Command to execute over each node (ex: chmod +x)",
			type: "string",
		},
		help: {
			shortFlag: "h",
			description: "Display help instructions",
			type: "boolean",
		},
		version: {
			shortFlag: "v",
			description: "Output the current version",
			type: "boolean",
		},
	},
	parameters: {
		src: {
			default: "current folder",
			description: "the source",
		},
		dest: {
			description: "the destination",
		},
	},
	// use usage:true is equivalent to the following line
	usage: "my-cli [options] [src] [dest]",
	defaultFlags: {
		verbose: false,
	},
});

// `flags` will be an object with what the user provided
// `parameters` will be an object with what the user provided
// `showHelp` is a method that can be invoked to display help instructions
```

## Note

If options `--version` or `--help` are used, they will automatically print version or help, respectively, and exit with 0 (`process.exit(0)`).

## License

MIT © Arno Versini
