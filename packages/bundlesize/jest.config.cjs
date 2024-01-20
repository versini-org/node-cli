const commonJest = require("../../configuration/jest.config.common.cjs");

commonJest.coverageThreshold["src/utilities.ts"] = {
	branches: 75,
	functions: 100,
	lines: 90,
	statements: 90,
};

module.exports = {
	...commonJest,
};
