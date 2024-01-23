export default {
	report: {
		current: "../stats/previous.json",
		previous: "../stats/current.json",
	},
	sizes: [
		{
			path: "../data/**/file*.txt",
			limit: "1.5 kB",
		},
	],
};
