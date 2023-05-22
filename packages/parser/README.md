# Parser

> Simple, non-interactive, CLI app arguments parser

# API

**parser(options, defaultFlags, defaultParameters) ⇒ { flags, parameters }**

## Arguments

| Argument                  | Type              |
| ------------------------- | ----------------- |
| options                   | Object            |
| options.examples          | Array of Object   |
| options.flags             | Object            |
| options.parameters        | Object            |
| options.usage             | String or Boolean |
| options.defaultFlags      | Object            |
| options.defaultParameters | Object            |

## Example

```js
import { parser } from "@node-cli/parser";
const { flags, parameters } = parser({
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
```

## Note

If options `--version` or `--help` are used, they will automatically print version or help, respectively, and exit with 0 (`process.exit(0)`).