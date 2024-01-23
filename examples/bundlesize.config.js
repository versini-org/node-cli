export default {
	report: {
		// header: "## My custom header",
		// footer: (limitReached, diff) =>
		// `## My custom footer: ${limitReached ? "🚫" : "✅"} ${diff}`,

		columns: [
			{ status: "Status" },
			{ file: "File" },
			{ size: "Size" },
			{ limits: "Limits" },
		],

		previous: "stats/stats.json",
		current: "tmp/stats.json",
	},
	sizes: [
		{
			path: "data/file*.txt",
			limit: "1.5 kB",
		},
		{
			path: "data/*file.txt",
			limit: "1.5 kB",
		},
		{
			path: "data/index-<hash>.md",
			limit: "1.5 kB",
		},
	],
};
