import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import kleur from "kleur";

const plugin: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.addHook("onResponse", async (request, reply) => {
		request.log.info(
			kleur.cyan(`${request.method} ${request.url} ${reply.statusCode}`),
		);
	});
};

export default fastifyPlugin(plugin, {
	fastify: "4.x",
	name: "fastify-simple-logger",
});
