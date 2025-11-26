export default {
	$schema:
		"https://cdn.jsdelivr.net/npm/@node-cli/bundlesize/schemas/bundlesize.config.schema.json",
	sizes: [
		{
			path: "dist/bundlesize.js",
			limit: "1.5 kB",
		},
		{
			path: "dist/defaults.js",
			limit: "1.5 kB",
		},
		{
			path: "dist/parse.js",
			limit: "1.5 kB",
		},
	],
};
