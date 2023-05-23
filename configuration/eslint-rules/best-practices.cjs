module.exports = {
	rules: {
		// enforce return statements in callbacks of array methods
		"array-callback-return": "error",
		// require the use of === and !==
		eqeqeq: ["error", "smart"],
		// disallow the use of alert, confirm, and prompt
		"no-alert": "error",
		// disallow the use of eval()
		"no-eval": "error",
		// disallow extending native types
		"no-extend-native": "error",
		// disallow multiple spaces
		"no-multi-spaces": "warn",
	},
};
