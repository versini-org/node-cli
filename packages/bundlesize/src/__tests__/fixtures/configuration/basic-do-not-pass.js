export default {
	report: {
		previous: "../stats/previous.json",
		current: "../stats/current.json",
	},
	sizes: [
		{
			path: "../data/**/file*.txt",
			limit: "1 B",
		},
	],
};
