/* istanbul ignore file */
import { parser } from "@node-cli/parser";
import { DEFAULT_EXTERNALS, defaultFlags } from "./defaults.js";

export type Flags = {
	boring?: boolean;
	help?: boolean;
	version?: boolean;
	versions?: boolean;
	trend?: string;
	gzipLevel?: number;
	external?: string;
	noExternal?: boolean;
	registry?: string;
};

export type Parameters = {
	["0"]?: string; // package name
	["1"]?: string; // exports (comma-separated)
};

export type Configuration = {
	flags?: Flags;
	parameters?: Parameters;
	usage?: boolean;
	showHelp?: () => void;
};

export const config: Configuration = parser({
	meta: import.meta,
	examples: [
		{
			command: "bundlecheck lodash",
			comment: "## Check the bundle size of the entire lodash package",
		},
		{
			command: "bundlecheck lodash@4.17.0",
			comment: "## Check a specific version of a package",
		},
		{
			command: "bundlecheck @mantine/core",
			comment: "## Check the bundle size of the entire @mantine/core package",
		},
		{
			command: 'bundlecheck @mantine/core "ScrollArea,Button"',
			comment:
				"## Check the bundle size of specific exports from @mantine/core",
		},
		{
			command: "bundlecheck react --no-external",
			comment:
				"## Check the bundle size of react itself (not marked as external)",
		},
		{
			command: 'bundlecheck some-pkg --external "vue,svelte"',
			comment: "## Add vue and svelte as additional external dependencies",
		},
		{
			command: "bundlecheck lodash --gzip-level 6",
			comment: "## Use a different gzip compression level (1-9)",
		},
		{
			command: "bundlecheck lodash --versions",
			comment: "## Choose from available versions interactively",
		},
		{
			command: "bundlecheck lodash --trend",
			comment: "## Show bundle size trend (default: 5 versions)",
		},
		{
			command: "bundlecheck lodash --trend 3",
			comment: "## Show bundle size trend for 3 versions",
		},
		{
			command: "bundlecheck lodash --registry https://registry.example.com",
			comment: "## Use a custom npm registry",
		},
	],
	flags: {
		gzipLevel: {
			shortFlag: "g",
			default: defaultFlags.gzipLevel,
			description: "Gzip compression level (1-9, default: 5)",
			type: "number",
		},
		external: {
			shortFlag: "e",
			default: defaultFlags.external,
			description: `Comma-separated additional externals (default externals: ${DEFAULT_EXTERNALS.join(", ")})`,
			type: "string",
		},
		noExternal: {
			shortFlag: "n",
			default: defaultFlags.noExternal,
			description:
				"Do not mark any packages as external (useful for checking react/react-dom themselves)",
			type: "boolean",
		},
		boring: {
			shortFlag: "b",
			default: defaultFlags.boring,
			description: "Do not use color output",
			type: "boolean",
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
		versions: {
			shortFlag: "V",
			default: defaultFlags.versions,
			description: "Choose from available package versions interactively",
			type: "boolean",
		},
		trend: {
			shortFlag: "t",
			description: "Show bundle size trend for N recent versions (default: 5)",
			type: "string",
		},
		registry: {
			shortFlag: "r",
			default: defaultFlags.registry,
			description:
				"Custom npm registry URL (default: https://registry.npmjs.org)",
			type: "string",
		},
	},
	parameters: {
		package: {
			description: "The npm package to check (e.g., lodash, @mantine/core)",
		},
		exports: {
			description:
				'Comma-separated list of exports to check (e.g., "ScrollArea,Button")',
		},
	},
	restrictions: [
		{
			exit: 1,
			message: () => "Error: Package name is required",
			test: (flags, parameters) => !parameters?.["0"],
		},
		{
			exit: 1,
			message: () => "Error: Gzip level must be between 1 and 9",
			test: (flags) =>
				flags.gzipLevel !== undefined &&
				(flags.gzipLevel < 1 || flags.gzipLevel > 9),
		},
	],
	usage: true,
	defaultFlags,
});
