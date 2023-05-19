/* eslint-env node */
module.exports = {
	extends: ["plugin:unicorn/recommended", "prettier"],
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
