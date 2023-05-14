#!/usr/bin/env node

import { cert, key } from "./certs.js";

import Fastify from "fastify";
import boxen from "boxen";
import { config } from "./parse.js";
import fastifyCache from "@fastify/caching";
import fastifyCompress from "@fastify/compress";
import fastifyCors from "@fastify/cors";
import fastifyLogs from "./logs.js";
import fastifyStatic from "@fastify/static";
import kleur from "kleur";
import { logger } from "./utilities.js";
import open from "open";
import portfinder from "portfinder";

const fastifyOptions: {
	disableRequestLogging?: boolean;
	http2?: boolean;
	https?: any;
	logger?: any;
} = {
	disableRequestLogging: true,
};

if (config.logs) {
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

if (config.http2) {
	fastifyOptions.http2 = true;
	fastifyOptions.https = { key, cert };
}

const fastify = Fastify(fastifyOptions);

if (config.logs) {
	fastify.register(fastifyLogs);
}

if (config.gzip) {
	fastify.register(fastifyCompress, {
		global: true,
		encodings: ["gzip", "deflate", "br", "identity"],
	});
}

if (config.cors) {
	fastify.register(fastifyCors);
}

const fastifyCacheOptions: {
	expiresIn?: number;
	serverExpiresIn?: number;
	privacy?: any;
} = {};

if (config.cache > 0) {
	fastifyCacheOptions.expiresIn = config.cache;
	fastifyCacheOptions.serverExpiresIn = config.cache;
	fastifyCacheOptions.privacy = fastifyCache.privacy.PUBLIC;
} else {
	fastifyCacheOptions.privacy = fastifyCache.privacy.NOCACHE;
}

fastify.register(fastifyCache, fastifyCacheOptions);

fastify.register(fastifyStatic, {
	root: config.path,
});

/**
 * Run the server!
 */
let port: number,
	portMessage = "";
const start = async () => {
	try {
		port = await portfinder.getPortPromise({ port: Number(config.port) });
		if (port !== config.port) {
			portMessage = `\n\n${kleur.yellow(
				`Warning: port ${config.port} was not available!`
			)}`;
			config.port = port;
		}
		await fastify.listen({ port: config.port });

		const url = `${config.http2 ? "https" : "http"}://localhost:${config.port}`;
		const messages = [
			`${kleur.cyan("Static Server")} is up and running!`,
			"",
			`${kleur.cyan(url)}`,
			"",
			`Hit CTRL+C to shut it down.${portMessage}`,
		];

		logger.log();
		logger.log(
			boxen(messages.join("\n"), {
				align: "center",
				borderColor: "yellow",
				padding: 1,
			})
		);

		if (config.open) {
			await open(url, {
				url: true,
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
