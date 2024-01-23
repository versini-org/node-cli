export default {
	report: {
		previous: "../stats/previous.json",
		current: "../stats/current.json",
	},
	sizes: [
		{
			path: "../data/file-<hash>.txt",
			limit: "1.5 kB",
		},
	],
};
