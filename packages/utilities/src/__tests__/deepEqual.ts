/* eslint-disable default-case */
/* eslint-disable complexity */
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule areEqual
 * @flow
 */

const aStackPool: any = [];
const bStackPool: any = [];

/**
 * Checks if two values are equal. Values may be primitives, arrays, or objects.
 * Returns true if both arguments have the same keys and values.
 *
 * @see http://underscorejs.org
 * @copyright 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * @license MIT
 */
function eq(a: any, b: any, aStack: any[], bStack: any[]) {
	if (a === b) {
		// Identical objects are equal. `0 === -0`, but they aren't identical.
		return a !== 0 || 1 / a === 1 / b;
	}
	if (a === null || b === null) {
		// a or b can be `null` or `undefined`
		return false;
	}
	if (typeof a !== "object" || typeof b !== "object") {
		return false;
	}
	const objectToString = Object.prototype.toString;
	const className = objectToString.call(a);
	if (className !== objectToString.call(b)) {
		return false;
	}
	switch (className) {
		case "[object String]": {
			return a === String(b);
		}
		case "[object Number]": {
			return Number.isNaN(a) || Number.isNaN(b) ? false : a === Number(b);
		}
		case "[object Date]":
		case "[object Boolean]": {
			return Number(a) === Number(b);
		}
		case "[object RegExp]": {
			return (
				a.source === b.source &&
				a.global === b.global &&
				a.multiline === b.multiline &&
				a.ignoreCase === b.ignoreCase
			);
		}
	}
	// Assume equality for cyclic structures.
	let length = aStack.length,
		size = 0;
	while (length--) {
		if (aStack[length] === a) {
			return bStack[length] === b;
		}
	}
	aStack.push(a);
	bStack.push(b);
	// Recursively compare objects and arrays.
	if (className === "[object Array]") {
		size = a.length;
		if (size !== b.length) {
			return false;
		}
		// Deep compare the contents, ignoring non-numeric properties.
		while (size--) {
			if (!eq(a[size], b[size], aStack, bStack)) {
				return false;
			}
		}
	} else {
		if (Object.hasOwn(a, "valueOf") && Object.hasOwn(b, "valueOf")) {
			return a.valueOf() === b.valueOf();
		}
		const keys = Object.keys(a);
		if (keys.length !== Object.keys(b).length) {
			return false;
		}
		for (const key of keys) {
			if (!eq(a[key], b[key], aStack, bStack)) {
				return false;
			}
		}
	}
	aStack.pop();
	bStack.pop();
	return true;
}

export function deepEqual(a?: any, b?: any) {
	const aStack: any = aStackPool.length > 0 ? aStackPool.pop() : [];
	const bStack = bStackPool.length > 0 ? bStackPool.pop() : [];
	const result = eq(a, b, aStack, bStack);
	if (aStack) {
		aStack.length = 0;
		aStackPool.push(aStack);
	}
	if (bStack) {
		bStack.length = 0;
		bStackPool.push(bStack);
	}

	return result;
}
