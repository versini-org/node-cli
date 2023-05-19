const commonJest = require("../../configuration/jest.config.common.cjs");

// const coverageThreshold = commonJest.coverageThreshold;
// coverageThreshold["src/deepEqual.ts"] = {
// 	branches: 84,
// 	functions: 100,
// 	lines: 95,
// 	statements: 95,
// };
module.exports = {
	...commonJest,
};
