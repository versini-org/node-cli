import { merge, mergeWith, uniqueId } from "lodash-es";

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

/**
 * Wrapper method for lodash `merge()` and `mergeWith()` methods.
 *
 * Without the `customizer` function, this method recursively merges own and inherited
 * enumerable string keyed properties of source objects into the destination object.
 * Source properties that resolve to undefined are skipped if a destination value exists.
 * Array and plain object properties are merged recursively. Other objects and value
 * types are overridden by assignment. Source objects are applied from left to right.
 * Subsequent sources overwrite property assignments of previous sources.
 *
 * With the `customizer` function, the behavior is the same except that `customizer` is
 * invoked to produce the merged values of the destination and source properties.
 * If customizer returns undefined, merging is handled by the `fastMerge` instead.
 * The customizer is invoked with six arguments: `(objValue, srcValue, key, object,
 * source, stack)`
 * @param {object} objectA
 * @param {object} objectB
 * @param {function} customizer
 * @returns {object} !! WARNING: this method will mutate objectA
 */
export const fastMerge = (
	objectA: any,
	objectB: any,
	customizer?: any
): object => {
	return typeof customizer === "function"
		? mergeWith(objectA, objectB, customizer)
		: merge(objectA, objectB);
};
