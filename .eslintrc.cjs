/* eslint-env node */
module.exports = {
	extends: ["plugin:unicorn/recommended", "prettier"],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	root: true,
	rules: {
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
