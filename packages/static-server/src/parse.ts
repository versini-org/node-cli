import { defaultsFlags, defaultsParameters } from "./defaults.js";

import { parser } from "@node-cli/parser";

export type Flags = {
	cache?: number;
	cors?: boolean;
	gzip?: boolean;
	http2?: boolean;
	logs?: boolean;
	open?: boolean;
	port?: number;
};

export type Parameters = {
	path?: string;
};

export type Configuration = {
	flags?: Flags;
	parameters?: Parameters;
	usage?: boolean;
	examples?: string;
};

export const config: Configuration = parser(
	{
		flags: {
			cache: {
				shortFlag: "c",
				default: defaultsFlags.cache,
				description: "Time in seconds for caching files",
				type: "number",
			},
			cors: {
				shortFlag: "C",
				default: defaultsFlags.cors,
				description: "Set CORS headers to * to allow requests from any origin",
				type: "boolean",
			},
			gzip: {
				shortFlag: "g",
				default: defaultsFlags.gzip,
				description: "Enable GZIP compression",
				type: "boolean",
			},
			help: {
				shortFlag: "h",
				description: "Display help instructions",
				type: "boolean",
			},
			http2: {
				shortFlag: "H",
				default: defaultsFlags.http2,
				description: "Set HTTP to version 2",
				type: "boolean",
			},
			logs: {
				shortFlag: "l",
				default: defaultsFlags.logs,
				description: "Log HTTP requests at the prompt",
				type: "boolean",
			},
			open: {
				shortFlag: "o",
				default: defaultsFlags.open,
				description: "Open in your default browser",
				type: "boolean",
			},
			port: {
				shortFlag: "p",
				default: defaultsFlags.port,
				description: "Port to listen on",
				type: "number",
			},
			version: {
				shortFlag: "v",
				description: "Output the current version",
				type: "boolean",
			},
		},
		parameters: {
			path: {
				default: "current folder",
				description: "the path to serve files from",
			},
		},
		usage: true,
	},
	defaultsFlags,
	defaultsParameters
);
