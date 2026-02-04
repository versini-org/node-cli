/* istanbul ignore file */
import { parser } from "@node-cli/parser";
import { defaultFlags, isValidPlatform, isValidTarget } from "./defaults.js";

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
	platform?: string;
	force?: boolean;
	target?: string;
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
		{
			command: "bundlecheck express --platform node",
			comment:
				"## Check bundle size for Node.js platform (aliases: server, nodejs, backend)",
		},
		{
			command: "bundlecheck lodash --force",
			comment: "## Bypass cache and force re-fetch/re-calculation",
		},
		{
			command: "bundlecheck lodash --target es2020",
			comment: "## Use a specific esbuild target (default: es2022)",
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
			description:
				"Comma-separated additional externals (react, react-dom auto-external when in package deps)",
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
		platform: {
			shortFlag: "p",
			default: defaultFlags.platform,
			description:
				'Target platform: "auto" (default, detects from engines), "browser" or "node"',
			type: "string",
		},
		force: {
			shortFlag: "f",
			default: defaultFlags.force,
			description: "Bypass cache and force re-fetch/re-calculation",
			type: "boolean",
		},
		target: {
			shortFlag: "T",
			default: defaultFlags.target,
			description:
				'esbuild target for bundling (e.g., "es2022", "es2020"). Default: "es2022"',
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
		{
			exit: 1,
			message: () =>
				'Error: Invalid platform. Use "browser" (or web, desktop, client) or "node" (or server, nodejs, backend)',
			test: (flags) => !isValidPlatform(flags.platform),
		},
		{
			exit: 1,
			message: () =>
				'Error: Invalid target. Use an ECMAScript version (e.g., "es2022", "es2020", "esnext")',
			test: (flags) => !isValidTarget(flags.target),
		},
	],
	usage: true,
	defaultFlags,
});
