export default {
	sizes: [
		{ header: "### Group A" },
		{
			path: "../data/file.txt",
			limit: "1.5 kB",
		},
		{
			path: "../data/file-2.txt",
			limit: "1 B",
			alias: "second file",
		},
	],
};
