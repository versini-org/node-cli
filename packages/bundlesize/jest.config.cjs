const commonJest = require("../../configuration/jest.config.common.cjs");

commonJest.coverageThreshold["src/getRawStats.ts"] = {
	statements: 90,
	branches: 75,
	functions: 100,
	lines: 90,
};
commonJest.coverageThreshold["src/utilities.ts"] = {
	statements: 95,
	branches: 100,
	functions: 100,
	lines: 95,
};

module.exports = {
	...commonJest,
};
