export default {
	report: {
		previous: "../stats/previous.json",
		current: "../stats/current.json",
	},
	sizes: [
		{
			path: "../data/index-<hash>-<semver>.js",
			limit: "1.5 kB",
		},
	],
};
