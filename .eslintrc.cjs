/* eslint-env node */
module.exports = {
	extends: [
		"plugin:unicorn/recommended",
		"prettier",
		"./configuration/eslint-rules/best-practices.cjs",
		"./configuration/eslint-rules/possible-errors.cjs",
		"./configuration/eslint-rules/variables.cjs",
	],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	root: true,
	rules: {
		"unicorn/no-abusive-eslint-disable": 0,
		"unicorn/no-console-spaces": 0,
		"unicorn/filename-case": [
			"error",
			{
				cases: {
					pascalCase: true,
					camelCase: true,
					kebabCase: true,
				},
			},
		],
	},
};
