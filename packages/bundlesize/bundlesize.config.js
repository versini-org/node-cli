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
		{
			path: "dist/compare.js",
			limit: "2 kB",
		},
		{
			path: "dist/compareStats.js",
			limit: "2 kB",
		},
	],
};
