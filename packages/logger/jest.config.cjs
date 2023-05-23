const commonJest = require("../../configuration/jest.config.common.cjs");

commonJest.coverageThreshold["src/Logger*.{js,ts}"] = {
	branches: 95,
	functions: 100,
	lines: 100,
	statements: 100,
};

module.exports = {
	...commonJest,
};
