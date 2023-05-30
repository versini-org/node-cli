import { uniqueId } from "lodash-es";

/**
 * Converts the first character of string to upper case
 * @param {string} string_ the string to convert
 * @returns {string} the converted string
 */
export const upperFirst = (string_: string): string =>
	string_[0].toUpperCase() + string_.slice(1);

/**
 * Converts the first character of string to lower case
 * @param {string} string_ the string to convert
 * @returns {string} the converted string
 */
export const lowerFirst = (string_: string): string =>
	string_[0].toLowerCase() + string_.slice(1);

/**
 * Generate a random number to append to an `id` string.
 *
 * NOTE: we are still using the good old lodash uniqueId when
 * the code is not in production, so that the results are a
 * little bit more consistent tests after test instead of
 * being completely random, so that they do not break
 * potential snapshot tests.
 *
 * @param {String} prefix - When a prefix is provided, the
 *                          function will return a random
 *                          number appended to the provided
 *                          prefix.
 *
 * @returns {String} - Returns a string with random numbers.
 */
export const uniqueID = (prefix: string = ""): string => {
	if (process.env.NODE_ENV !== "production") {
		return uniqueId(prefix);
	}
	// Extract the decimal part
	const randomNumber = `${Math.random()}`.split(".")[1];
	return prefix || prefix !== "" ? `${prefix}${randomNumber}` : randomNumber;
};
