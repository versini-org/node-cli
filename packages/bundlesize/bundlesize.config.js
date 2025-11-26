// @ts-check
/** @type {import('./src/config.ts').BundlesizeConfig} */
export default {
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
