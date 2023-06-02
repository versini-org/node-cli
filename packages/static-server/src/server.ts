#!/usr/bin/env node

import { cert, key } from "./certs.js";
import fastifyStatic, { FastifyStaticOptions } from "@fastify/static";

import Fastify from "fastify";
import { Logger } from "@node-cli/logger";
import { config } from "./parse.js";
import fastifyCache from "@fastify/caching";
import fastifyCompress from "@fastify/compress";
import fastifyCors from "@fastify/cors";
import fastifyLogs from "./logs.js";
import fs from "fs-extra";
import kleur from "kleur";
import open from "open";
import path from "node:path";
import portfinder from "portfinder";
import { renderDirectories } from "./templates/directories.js";
import { renderNotFound } from "./templates/not-found.js";

export const logger = new Logger({
	boring: process.env.NODE_ENV === "test",
});

let customPath = config.parameters[0];
if (fs.pathExistsSync(customPath)) {
	customPath = path.resolve(customPath);
} else {
	logger.printErrorsAndExit([`Folder ${customPath} does not exist!`], 0);
}

const fastifyOptions: {
	disableRequestLogging?: boolean;
	http2?: boolean;
	https?: any;
	logger?: any;
} = {
	disableRequestLogging: true,
};

if (config.flags.logs) {
	fastifyOptions.logger = {
		level: "info",
		transport: {
			target: "pino-pretty",
			options: {
				hideObject: true,
				translateTime: "SYS:standard",
				ignore: "pid,hostname,reqId,resTime,resTimeMs,level",
			},
		},
	};
}

if (config.flags.http2) {
	fastifyOptions.http2 = true;
	fastifyOptions.https = { key, cert };
}

const fastify = Fastify(fastifyOptions);

if (config.flags.logs) {
	fastify.register(fastifyLogs);
}

if (config.flags.gzip) {
	fastify.register(fastifyCompress, {
		global: true,
		encodings: ["gzip", "deflate", "br", "identity"],
	});
}

if (config.flags.cors) {
	fastify.register(fastifyCors);
}

const fastifyCacheOptions: {
	expiresIn?: number;
	serverExpiresIn?: number;
	privacy?: any;
} = {};

if (config.flags.cache > 0) {
	fastifyCacheOptions.expiresIn = config.flags.cache;
	fastifyCacheOptions.serverExpiresIn = config.flags.cache;
	fastifyCacheOptions.privacy = "public";
} else {
	fastifyCacheOptions.privacy = "no-cache";
}

fastify.register(fastifyCache, fastifyCacheOptions);

const staticOptions: FastifyStaticOptions = {
	root: customPath,
};
if (config.flags.dirs) {
	staticOptions.list = {
		format: "html",
		render: renderDirectories,
	};
}
fastify.register(fastifyStatic, staticOptions);

fastify.setNotFoundHandler((request, reply) => {
	reply.code(404).type("text/html").send(renderNotFound(config.flags.dirs));
});

/**
 * Run the server!
 */
let port: number,
	address: string,
	portMessage = "";
const start = async () => {
	try {
		port = await portfinder.getPortPromise({ port: Number(config.flags.port) });
		if (port !== config.flags.port) {
			portMessage = `\n\n${kleur.yellow(
				`Warning: port ${config.flags.port} was not available!`
			)}`;
			config.flags.port = port;
		}
		const listenOptions: { port?: number; host?: string } = {
			port: config.flags.port,
		};
		if (config.flags.host) {
			listenOptions.host = config.flags.host;
			address = config.flags.host;
		} else {
			address = "localhost";
		}
		await fastify.listen(listenOptions);

		const url = `${config.flags.http2 ? "https" : "http"}://${address}:${
			config.flags.port
		}`;
		const messages = [
			`${kleur.cyan("Static Server")} is up and running!`,
			"",
			`${kleur.cyan(url)}`,
			"",
			`Hit CTRL+C to shut it down.${portMessage}`,
		];

		logger.printBox(messages, { newLineAfter: false });

		if (config.flags.open) {
			await open(url, {
				wait: false,
			});
		}
	} catch (error) {
		fastify.log.error(error);
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	}
};
start();
