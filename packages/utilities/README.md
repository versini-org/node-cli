# Node CLI Utilities

![npm](https://img.shields.io/npm/v/@node-cli/utilities?label=version&logo=npm)

> A few common utilities for Node CLI applications

## Table of Content

- [Table of Content](#table-of-content)
- [Installation](#installation)
- [API](#api)
  - [lowerFirst](#lowerfirst)
  - [shallowMerge](#shallowmerge)
  - [uniqueID](#uniqueid)
  - [upperFirst](#upperfirst)
- [License](#license)

## Installation

```sh
> cd your-project
> npm install --save-dev @node-cli/utilities
```

## API

### lowerFirst

**lowerFirst(text: string) ⇒ `string`**

Transform the first letter of the provided string to lowercase (but not all the words).

```js
import { lowerFirst } from "@node-cli/utilities";
const str = lowerFirst("HELLO WORLD");
// str is "hELLO WORLD"
```

### shallowMerge

**shallowMerge(objA: object, objB: object, customizer: () => void) ⇒ `object`**

Wrapper method for lodash `merge()` and `mergeWith()` methods.

Without the `customizer` function, this method recursively merges own and inherited enumerable string keyed properties of source objects into the destination object. Source properties that resolve to undefined are skipped if a destination value exists. Array and plain object properties are merged recursively. Other objects and value types are overridden by assignment. Source objects are applied from left to right. Subsequent sources overwrite property assignments of previous sources.

With the `customizer` function, the behavior is the same except that `customizer` is invoked to produce the merged values of the destination and source properties. If customizer returns undefined, merging is handled by the `shallowMerge` instead. The customizer is invoked with six arguments: `(objValue, srcValue, key, object, source, stack)`

**WARNING**: this method will mutate objA!

```js
import { shallowMerge } from "@node-cli/utilities";

const objA = { port: 123, cache: false, gzip: true };
const objB = { port: 456, gzip: false };
const objC = shallowMerge(objA, objB);

// objC is { port: 456, cache: false, gzip: false };
```

```js
import { isArray } from "lodash-es";
import { shallowMerge } from "@node-cli/utilities";

const objA = { a: [1], b: [2] };
const objB = { a: [3], b: [4] };
const objC = shallowMerge(objA, objB, (objValue, srcValue) => {
	if (isArray(objValue)) {
		return objValue.concat(srcValue);
	}
});

// objC is { 'a': [1, 3], 'b': [2, 4] };
```

### uniqueID

**uniqueID(prefix?: string = "") ⇒ `string`**

Generate a unique ID.

```js
import { uniqueID } from "@node-cli/utilities";
const id = uniqueID("my-prefix-");
// id is something like "my-prefix-5f3a2b3c-1a2b-3c4d-5e6f-7a8b9c0d1e2f"
```

### upperFirst

**upperFirst(text: string) ⇒ `string`**

Capitalize the first letter of the provided string (but not all the words).

```js
import { upperFirst } from "@node-cli/utilities";
const str = upperFirst("hello world");
// str is "Hello world"
```

## License

MIT © Arno Versini
