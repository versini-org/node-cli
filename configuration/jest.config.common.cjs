module.exports = {
	transform: {
		"^.+\\.(t|j)s?$": [
			"@swc/jest",
			{
				exclude: [],
				swcrc: false,
				jsc: {
					target: "es2022",
					parser: {
						syntax: "typescript",
					},
					externalHelpers: true,
				},
			},
		],
	},
	transformIgnorePatterns: ["/node_modules/?!(execa)/"],
	/**
	 * An array of glob patterns indicating a set of files for which
	 * coverage information should be collected. If a file matches
	 * the specified glob pattern, coverage information will be
	 * collected for it even if no tests exist for this file and
	 * it's never required in the test suite.
	 * @type {Array}
	 *
	 * Default undefined
	 */
	collectCoverageFrom: ["src/*.{js,mjs,jsx,ts,tsx}"],
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"(.+)\\.js": "$1",
	},
	/**
	 * The glob patterns Jest uses to detect test files. By default
	 * it looks for .js, .jsx, .ts and .tsx files inside of
	 * __tests__ folders, as well as any files with a suffix of
	 * .test or .spec (e.g. Component.test.js or Component.spec.js).
	 * It will also find files called test.js or spec.js.
	 * @type {Array}
	 */
	testMatch: ["**/__tests__/**/*.test.ts"],
};
