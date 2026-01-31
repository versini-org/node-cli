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
- **Platform support**: target `browser` (default) or `node` with smart auto-detection
- Custom npm registry support (for private registries)
- Fast bundling using esbuild (with pnpm support)
- **Local caching** for faster repeated lookups (SQLite-based, max 100 entries)

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

| Flag                | Short       | Description                                                      |
| ------------------- | ----------- | ---------------------------------------------------------------- |
| `--help`            | `-h`        | Display help instructions                                        |
| `--version`         | `-v`        | Output the current version                                       |
| `--versions`        | `-V`        | Choose from available package versions interactively             |
| `--trend [N]`       | `-t [N]`    | Show bundle size trend for N versions (default: 5)               |
| `--boring`          | `-b`        | Do not use color output                                          |
| `--gzipLevel <n>`   | `-g <n>`    | Gzip compression level (1-9, default: 5)                         |
| `--external <pkgs>` | `-e <pkgs>` | Comma-separated additional packages to mark as external          |
| `--noExternal`      | `-n`        | Do not mark any packages as external                             |
| `--registry <url>`  | `-r <url>`  | Custom npm registry URL (default: registry.npmjs.org)            |
| `--platform <name>` | `-p <name>` | Target platform: `auto` (default), `browser`, or `node`          |
| `--force`           | `-f`        | Bypass cache and force re-fetch/re-calculation                   |

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

# Check a Node.js package (explicit platform)
bundlecheck express --platform node

# Auto-detect platform (default behavior)
bundlecheck express  # auto-detects "node" from package.json engines

# Bypass cache and force re-fetch
bundlecheck lodash --force
```

## How It Works

1. Creates a temporary directory
2. Installs the specified npm package
3. Creates an entry file importing the package/exports
4. Bundles with esbuild (minified, tree-shaken)
5. Reports raw and gzip sizes
6. Cleans up temporary files

## Platform Support

The `--platform` flag controls how the bundle is built:

- **`auto`** (default): Automatically detects the platform from the package's `engines` field. If the package specifies `engines.node` without `engines.browser`, it uses `node`; otherwise defaults to `browser`.
- **`browser`**: Builds for browser environments (also accepts aliases: `web`, `desktop`, `client`)
- **`node`**: Builds for Node.js environments (also accepts aliases: `server`, `nodejs`, `backend`)

When targeting **node** platform:
- Gzip size is not calculated (shows "N/A") since server-side code isn't typically served compressed over HTTP
- The bundle is optimized for Node.js built-ins

```bash
# Auto-detect (recommended for most cases)
bundlecheck express           # detects "node" from engines.node

# Explicit platform
bundlecheck lodash --platform browser
bundlecheck fastify -p server  # "server" is an alias for "node"
```

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

## Cache

Bundle size results are cached locally to speed up repeated lookups. The cache is stored in `~/.bundlecheck/cache.db` using SQLite.

### How it works

- Results are cached based on: package name, version, exports, platform, gzip level, and externals configuration
- The cache holds up to **100 entries** (least recently used entries are evicted first)
- When you check a package, the CLI first looks for a cached result with matching parameters

### Smart version matching

The cache uses **resolved versions**, not the requested specifier. This means:

```bash
bundlecheck @mantine/core          # Resolves "latest" to e.g. 8.0.0, caches as 8.0.0
bundlecheck @mantine/core@8.0.0    # Cache hit! Same resolved version
```

This also works with `--trend`: if you previously checked `@mantine/core` (which resolved to v8.0.0), running `--trend` will use the cached result for v8.0.0 and only fetch the other versions.

### Bypassing the cache

Use the `--force` flag to skip the cache and re-fetch/re-calculate:

```bash
bundlecheck lodash --force    # Always fetches fresh data
bundlecheck lodash -f         # Short form
```

### Cache location

The cache database is stored at:

```
~/.bundlecheck/cache.db
```

To clear the cache, simply delete this file or the `~/.bundlecheck` directory.

## License

MIT - see [LICENSE](./LICENSE) for details.
