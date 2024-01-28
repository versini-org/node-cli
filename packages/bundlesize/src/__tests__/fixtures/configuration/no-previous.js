export default {
	report: {
		current: "../stats/current.json",
	},
	sizes: [
		{
			path: "../data/**/file*.txt",
			limit: "1.5 kB",
		},
	],
};
