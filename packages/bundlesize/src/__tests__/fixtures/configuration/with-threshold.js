export default {
	report: {
		previous: "../stats/previous-threshold.json",
		current: "../stats/current-threshold.json",
		threshold: 5,
	},
	sizes: [
		{
			path: "../data/**/file.txt",
			limit: "1.5 kB",
		},
		{
			path: "../data/**/file-small-change.txt",
			limit: "1.5 kB",
		},
		{
			path: "../data/**/file-no-change.txt",
			limit: "1.5 kB",
		},
	],
};
