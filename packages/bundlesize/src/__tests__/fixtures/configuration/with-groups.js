export default {
	report: {
		previous: "../stats/previous.json",
		current: "../stats/current.json",
		header: "## Bundle Size With Groups",
	},
	sizes: [
		{ header: "### Group A" },
		{ path: "data/file.txt", limit: "1.5 kB" },
		{ path: "data/file.zip", limit: "1.5 kB" },
		{ header: "### Group B" },
		{ path: "data/file-no-change", limit: "1.5 kB" },
	],
};
