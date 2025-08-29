export default {
	report: {
		previous: "../stats/missing.json", // triggers catch (no previous stats)
		current: "../stats/current.json",
		header: "## Grouped No Previous",
	},
	sizes: [
		{ header: "### Only Group" },
		{ path: "data/file-no-change", limit: "1.5 kB" },
	],
};
