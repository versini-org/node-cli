# Node CLI Utilities

![npm](https://img.shields.io/npm/v/@node-cli/utilities?label=version&logo=npm)

> A few common utilities for Node CLI applications

## Table of Content

- [Table of Content](#table-of-content)
- [Installation](#installation)
- [API](#api)
  - [lowerFirst](#lowerfirst)
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
