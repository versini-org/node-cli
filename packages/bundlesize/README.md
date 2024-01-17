# Node CLI Bundle Size package

![npm](https://img.shields.io/npm/v/@node-cli/bundlesize?label=version&logo=npm)

> Bundlesize is a simple CLI tool that checks file(s) size and report if limits have been reached.

## Installation

```sh
> npm install --dev @node-cli/bundlesize
```

## Examples

Assuming there is a `bundlesize.config.js` file in the root of the project with the following content:

```js
export default [
	{
		path: "dist/some-bundle.js",
		limit: "10 kB",
	},
];
```

### Print the results at the command line

```json
"scripts": {
	"stats": "bundlesize -c bundlesize.config.js"
}
```

### Print the results in a file

```json
"scripts": {
	"stats": "bundlesize -c bundlesize.config.js -o stats.json"
}
```

### Print the results in a file but do not fail if the limit is reached

```json
"scripts": {
  "stats": "bundlesize -c bundlesize.config.js -o stats.json -s"
}
```

### Add a prefix to the results

```json
"scripts": {
  "stats": "bundlesize -c bundlesize.config.js -o stats.json -p 'My prefix'"
}
```

### Use the current package version as a prefix

```json
"scripts": {
  "stats": "bundlesize -c bundlesize.config.js -o stats.json -p \"$npm_package_version\""
}
```

## Get help

```sh
> bundlesize --help
```

## License

MIT © Arno Versini
