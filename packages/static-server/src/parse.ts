import { defaultFlags, defaultParameters } from "./defaults.js";

import { parser } from "@node-cli/parser";

export type Flags = {
	cache?: number;
	cors?: boolean;
	dirs?: boolean;
	gzip?: boolean;
	http2?: boolean;
	logs?: boolean;
	open?: boolean;
	port?: number;
	host?: string;
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

export const config: Configuration = parser({
	meta: import.meta,
	flags: {
		host: {
			default: defaultFlags.host,
			description: "Host to listen on",
			type: "string",
		},
		cache: {
			shortFlag: "c",
			default: defaultFlags.cache,
			description: "Time in seconds for caching files",
			type: "number",
		},
		cors: {
			shortFlag: "C",
			default: defaultFlags.cors,
			description: "Set CORS headers to * to allow requests from any origin",
			type: "boolean",
		},
		dirs: {
			shortFlag: "d",
			default: defaultFlags.dirs,
			description: "List the directory's contents",
			type: "boolean",
		},
		gzip: {
			shortFlag: "g",
			default: defaultFlags.gzip,
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
			default: defaultFlags.http2,
			description: "Use HTTP/2 and SSL (local certificate provided)",
			type: "boolean",
		},
		logs: {
			shortFlag: "l",
			default: defaultFlags.logs,
			description: "Log HTTP requests at the prompt",
			type: "boolean",
		},
		open: {
			shortFlag: "o",
			default: defaultFlags.open,
			description: "Open in your default browser",
			type: "boolean",
		},
		port: {
			shortFlag: "p",
			default: defaultFlags.port,
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
	defaultFlags,
	defaultParameters,
});
