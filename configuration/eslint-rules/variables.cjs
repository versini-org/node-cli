module.exports = {
	rules: {
		// disallow catch clause parameters from shadowing variables in the outer scope
		"no-catch-shadow": "error",
		// disallow deleting variables
		"no-delete-var": "error",
		// disallow labels that share a name with a variable
		"no-label-var": "error",
		// disallow identifiers from shadowing restricted names
		"no-shadow-restricted-names": "error",
		// disallow unused variables
		"@typescript-eslint/no-unused-vars": "error",
		// disallow the use of variables before they are defined
		"no-use-before-define": "error",
	},
};
