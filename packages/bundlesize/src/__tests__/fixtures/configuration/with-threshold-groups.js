export default {
	report: {
		header: "## Bundle Size With Threshold",
		previous: "../stats/previous-threshold-groups.json",
		current: "../stats/current-threshold-groups.json",
		threshold: 5,
	},
	sizes: [
		{ header: "### Group A" },
		{ path: "data/file.txt", limit: "1.5 kB" },
		{ path: "data/file-2.txt", limit: "1.5 kB" },
	],
};
