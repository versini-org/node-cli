module.exports = {
	// coverageDirectory: "<rootDir>/../../coverage",
	// roots: ["<rootDir>/../../packages/logger/src"],
	transform: {
		"^.+\\.(t|j)s?$": [
			"@swc/jest",
			{
				exclude: [],
				swcrc: false,
				jsc: {
					parser: {
						syntax: "typescript",
					},
					externalHelpers: true,
				},
			},
		],
	},
	collectCoverageFrom: ["src/*.{js,mjs,jsx,ts,tsx}"],
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
};
