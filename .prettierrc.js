let commonPrettierConfiguration = {};
try {
	commonPrettierConfiguration = require("./configuration/prettier/common");
} catch (error) {
	// nothing to declare officer
}

module.exports = {
	...commonPrettierConfiguration,
};
