# @node-cli/bundlecheck

![npm](https://img.shields.io/npm/v/@node-cli/bundlecheck?label=version&logo=npm)

A CLI tool to check the bundle size of npm packages, similar to [bundlephobia.com](https://bundlephobia.com/).

## Features

- Check bundle size of any npm package
- Support for specific package versions (e.g., `lodash@4.17.0`)
- Interactive version selection with `--versions` flag
- Bundle size trend analysis with `--trend` flag (bar graph across versions)
- Support for checking specific exports (tree-shaking)
- Automatic externalization of React and React-DOM
- Raw and gzip sizes with configurable compression level
- Custom npm registry support (for private registries)
- Fast bundling using esbuild (with pnpm support)

## Installation

```bash
npm install -g @node-cli/bundlecheck
```

Or use with npx:

```bash
npx @node-cli/bundlecheck <package-name>
```

## Usage

### Check entire package

```bash
bundlecheck lodash
bundlecheck @mantine/core
```

### Check a specific version

```bash
bundlecheck lodash@4.17.0
bundlecheck @versini/ui-panel@1.0.0
```

### Choose version interactively

```bash
bundlecheck lodash --versions
bundlecheck @mantine/core --versions
```

This will fetch available versions from npm and let you select one from a list.

### Show bundle size trend

```bash
bundlecheck lodash --trend       # default: 5 versions
bundlecheck clsx --trend 3       # custom: 3 versions
```

This analyzes recent versions and displays a bar graph showing how the bundle size has evolved:

```
Bundle Size Trend: clsx
────────────────────────────────────────────────────────────

Gzip Size:
  2.1.1  ██████████████████████████████ 331 B
  2.0.0  █████████████████████████████ 321 B
  1.2.0  █████████████████████████████ 318 B
  1.0.4  ████████████████████████████ 308 B
  1.0.1  ██████████████████████████ 285 B

Raw Size:
  2.1.1  ██████████████████████████████ 527 B
  ...

────────────────────────────────────────────────────────────
Change from 1.0.1 to 2.1.1:
  Gzip: +46 B (+16.1%)
  Raw:  +108 B (+25.8%)
```

### Check specific exports (tree-shaking)

```bash
bundlecheck @mantine/core "ScrollArea,Button"
bundlecheck lodash "debounce,throttle"
```

### Options

| Flag                | Short       | Description                                             |
| ------------------- | ----------- | ------------------------------------------------------- |
| `--help`            | `-h`        | Display help instructions                               |
| `--version`         | `-v`        | Output the current version                              |
| `--versions`        | `-V`        | Choose from available package versions interactively    |
| `--trend [N]`       | `-t [N]`    | Show bundle size trend for N versions (default: 5)      |
| `--boring`          | `-b`        | Do not use color output                                 |
| `--gzipLevel <n>`   | `-g <n>`    | Gzip compression level (1-9, default: 5)                |
| `--external <pkgs>` | `-e <pkgs>` | Comma-separated additional packages to mark as external |
| `--noExternal`      | `-n`        | Do not mark any packages as external                    |
| `--registry <url>`  | `-r <url>`  | Custom npm registry URL (default: registry.npmjs.org)   |

### Examples

```bash
# Check the entire lodash package
bundlecheck lodash

# Check a specific version
bundlecheck lodash@4.17.0
bundlecheck @versini/ui-panel@1.0.0

# Check specific exports from @mantine/core
bundlecheck @mantine/core "ScrollArea,Button"

# Check react itself (without marking it as external)
bundlecheck react -n

# Add vue and svelte as additional externals
bundlecheck some-package --external "vue,svelte"

# Use a different gzip compression level
bundlecheck lodash --gzipLevel 6

# Choose version interactively
bundlecheck lodash --versions

# Show bundle size trend (default: 5 versions)
bundlecheck lodash --trend

# Show bundle size trend for 3 versions
bundlecheck lodash --trend 3

# Use a custom npm registry
bundlecheck @myorg/private-pkg --registry https://npm.mycompany.com
```

## How It Works

1. Creates a temporary directory
2. Installs the specified npm package
3. Creates an entry file importing the package/exports
4. Bundles with esbuild (minified, tree-shaken)
5. Reports raw and gzip sizes
6. Cleans up temporary files

## Default Externals

By default, `react` and `react-dom` are marked as external (not included in the bundle size) since most React-based packages expect these as peer dependencies. This matches how these packages would typically be used in a real application.

To include React/React-DOM in the bundle size calculation, use the `--no-external` flag.

## Custom Registry

Use the `--registry` flag to check packages from private or alternative npm registries:

```bash
# Private corporate registry
bundlecheck @myorg/myorg-ui-library --registry https://npm.mycompany.com

# Verdaccio local registry
bundlecheck my-local-pkg --registry http://localhost:4873

```

Note: If the registry requires authentication, ensure your npm/pnpm is configured with the appropriate credentials (via `.npmrc` or environment variables).

## License

MIT - see [LICENSE](./LICENSE) for details.
