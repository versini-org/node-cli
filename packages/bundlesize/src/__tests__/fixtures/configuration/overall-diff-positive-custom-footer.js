export default {
	report: {
		current: "../stats/previous.json",
		previous: "../stats/current.json",
		footer: ({ limitReached, overallDiff, totalGzipSize }) => {
			return `## Custom Footer: ${limitReached ? "Limit reached" : "Limit not reached"} (${overallDiff} ${totalGzipSize})`;
		},
	},
	sizes: [
		{
			path: "../data/**/file*.txt",
			limit: "1.5 kB",
		},
	],
};
