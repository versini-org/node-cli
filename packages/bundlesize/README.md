# Node CLI Bundle Size package

![npm](https://img.shields.io/npm/v/@node-cli/bundlesize?label=version&logo=npm)

> Bundlesize is a simple CLI tool that checks file(s) size and report if limits have been reached.

## Installation

```sh
> npm install --dev @node-cli/bundlesize
```

## Configuration

A configuration file must be provided via the `-c` parameter.

For the size option, it must export an object named "size" which is an array of objects with the following properties:

- `path`: the path to the file to check
- `limit`: the limit to check against

For the report option, it must export an object named "report" which is an object with the following properties:

- `header`: the header to display (optional, string)
- `footer`: the footer to display (optional, function receiving a boolean indicating if the limit has been reached, and a value corresponding to the diff. It must return a string)
- `previous`: the previous path to the report to compare against (required, string)
- `current`: the current path to the report to compare against (required, string)
- `columns`: the columns to display (optional, array of objects)

## Examples

### Getting stats from files

#### Single file

```js
export default {
  sizes: [
    {
      path: "dist/some-bundle.js",
      limit: "10 kB"
    }
  ]
};
```

#### Multiple files

```js
export default {
  sizes: [
    {
      path: "dist/some-bundle.js",
      limit: "10 kB"
    },
    {
      path: "dist/some-other-bundle.js",
      limit: "100 kB"
    }
  ]
};
```

#### With glob patterns

```js
export default {
  sizes: [
    {
      path: "dist/**/some-bundle.js",
      limit: "10 kB"
    },
    {
      path: "dist/**/some-other-bundle-*.js",
      limit: "100 kB"
    },
    {
      path: "dist/**/extra-+([a-zA-Z0-9]).js",
      limit: "100 kB"
    }
  ]
};
```

#### With a hash

The special keyword `<hash>` can be used to match a hash in the filename. It cannot used if multiple files match the pattern.

**NOTE**: Using `<hash>` is equivalent to using `+([a-zA-Z0-9])` in the glob pattern. However, the result will be indexed with the `hash` key instead of the `match` key, so that subsequent scripts can use the hash value.

| Status | Pattern                         | Comment                              |
| ------ | ------------------------------- | ------------------------------------ |
| OK     | `dist/**/some-bundle-<hash>.js` | If only one file matches the pattern |
| Not OK | `dist/**/same-prefix-<hash>.js` | If multiple files match the pattern  |

#### With a version

The special keyword `<semver>` can be used to match a version in the filename. It cannot be used if multiple files match the pattern.

**NOTE**: Using `<semver>` is equivalent to using `*` in the glob pattern. However, the result will be indexed with the `semver` key instead of the `match` key, so that subsequent scripts can use the semver value.

| Status | Pattern                           | Comment                              |
| ------ | --------------------------------- | ------------------------------------ |
| OK     | `dist/**/some-bundle-<semver>.js` | If only one file matches the pattern |
| Not OK | `dist/**/same-prefix-<semver>.js` | If multiple files match the pattern  |

### Printing reports from stats

#### Simple report

```js
export default {
  report: {
    prev: "stats/previous.json",
    current: "stats/current.json"
  }
};
```

#### Simple report with custom header

```js
export default {
  report: {
    header: "## My custom header",
    prev: "stats/previous.json",
    current: "stats/current.json"
  }
};
```

#### Simple report with custom footer

```js
export default {
  report: {
    footer: (limitReached, diff) => {
      return `## My custom footer: ${limitReached} ${diff}`;
    },
    prev: "stats/previous.json",
    current: "stats/current.json"
  }
};
```

#### Simple report with custom columns

```js
export default {
  report: {
    columns: [
      { status: "Status" },
      { file: "File" },
      { size: "Size" },
      { limits: "Limits" }
    ],
    prev: "stats/previous.json",
    current: "stats/current.json"
  }
};
```

## Usage

### Print the stats at the command line

```json
"scripts": {
	"stats": "bundlesize -c bundlesize.config.js"
}
```

### Print the stats in a file

```json
"scripts": {
	"stats": "bundlesize -c bundlesize.config.js -o stats.json"
}
```

### Print the stats in a file but do not fail if the limit is reached

```json
"scripts": {
  "stats": "bundlesize -c bundlesize.config.js -o stats.json -s"
}
```

### Add a prefix to the stats

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

### Compare current stats with the previous ones

```json
"scripts": {
	"stats": "bundlesize -c bundlesize.config.js --type report"
}
```

## Get help

```sh
> bundlesize --help
```

## License

MIT © Arno Versini
