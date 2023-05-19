import _ from "lodash";

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
 * If customizer returns undefined, merging is handled by the `shallowMerge` instead.
 * The customizer is invoked with six arguments: `(objValue, srcValue, key, object,
 * source, stack)`
 * @param {object} objA
 * @param {object} objB
 * @param {function} customizer
 * @returns {object}
 *
 * !! WARNING: this method will mutate objA
 */
export const shallowMerge = (
	objectA: any,
	objectB: any,
	customizer?: any
): object => {
	return typeof customizer === "function"
		? _.mergeWith(objectA, objectB, customizer)
		: _.merge(objectA, objectB);
};
