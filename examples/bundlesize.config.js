export default [
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
];
