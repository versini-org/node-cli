# @node-cli/bundlecheck

![npm](https://img.shields.io/npm/v/@node-cli/bundlecheck?label=version&logo=npm)

A CLI tool to check the bundle size of npm packages, similar to [bundlephobia.com](https://bundlephobia.com/).

## Features

- Check bundle size of any npm package
- Support for specific package versions (e.g., `lodash@4.17.0`)
- Interactive version selection with `--versions` flag
- Bundle size trend analysis with `--trend` flag (bar graph across versions)
- Support for checking specific exports (tree-shaking)
- Smart externalization of React and React-DOM (including subpaths like `jsx-runtime`)
- Raw and gzip sizes with configurable compression level
- **Platform support**: target `browser` (default) or `node` with smart auto-detection
- Custom npm registry support (for private registries)
- Fast bundling using esbuild (with pnpm support)
- **Local caching** for faster repeated lookups (SQLite-based, max 1000 entries)
- **Library API** for programmatic usage in Node.js applications

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

# Check react with all dependencies bundled (no externals)
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

## Programmatic Usage (Library API)

In addition to the CLI, `@node-cli/bundlecheck` can be used as a library in your Node.js code.

### Installation

```bash
npm install @node-cli/bundlecheck
```

### Basic Usage

```js
import { getBundleStats, getBundleTrend, getPackageVersions, getPackageExports } from "@node-cli/bundlecheck";

// Get bundle stats for a single package
const stats = await getBundleStats({
  package: "@mantine/core@7.0.0",
});
console.log(stats);
// {
//   packageName: "@mantine/core",
//   packageVersion: "7.0.0",
//   rawSize: 234567,
//   gzipSize: 45678,
//   rawSizeFormatted: "229.07 kB",
//   gzipSizeFormatted: "44.61 kB",
//   exports: [],
//   externals: ["react", "react-dom"],  // Only present because @mantine/core has these as peerDependencies
//   dependencies: ["@floating-ui/react", ...],
//   platform: "browser",
//   gzipLevel: 5,
//   fromCache: false
// }

// Check specific exports (tree-shaking)
const buttonStats = await getBundleStats({
  package: "@mantine/core",
  exports: ["Button", "Input"],
});
console.log(buttonStats.gzipSizeFormatted); // "12.3 kB"

// Get bundle size trend across versions
const trend = await getBundleTrend({
  package: "@mantine/core",
  versionCount: 5,
});
console.log(trend);
// {
//   packageName: "@mantine/core",
//   versions: [
//     { version: "7.0.0", rawSize: 234567, gzipSize: 45678, rawSizeFormatted: "229.07 kB", ... },
//     { version: "6.0.0", rawSize: 220000, gzipSize: 42000, ... },
//     ...
//   ],
//   change: {
//     fromVersion: "5.0.0",
//     toVersion: "7.0.0",
//     rawDiff: 14567,
//     rawPercent: 6.6,
//     rawDiffFormatted: "+14.23 kB",
//     gzipDiff: 3678,
//     gzipPercent: 8.7,
//     gzipDiffFormatted: "+3.59 kB"
//   }
// }

// Get available versions for a package
const versions = await getPackageVersions({
  package: "@mantine/core",
});
console.log(versions.tags.latest); // "7.0.0"
console.log(versions.versions.slice(0, 5)); // ["7.0.0", "6.0.21", "6.0.20", ...]

// Get named exports from a package
const exports = await getPackageExports({
  package: "date-fns@3.6.0",
});
console.log(`Found ${exports.count} exports`);
console.log(exports.exports.slice(0, 5).map(e => e.name)); // ["add", "addBusinessDays", "addDays", ...]
```

### API Reference

#### `getBundleStats(options)`

Get bundle size statistics for a single package.

**Options:**

| Option       | Type                          | Default    | Description                                              |
| ------------ | ----------------------------- | ---------- | -------------------------------------------------------- |
| `package`    | `string`                      | (required) | Package name with optional version (e.g., `lodash@4.17.0`) |
| `exports`    | `string[]`                    | `undefined`| Specific exports to measure (tree-shaking)               |
| `external`   | `string[]`                    | `undefined`| Additional packages to mark as external                  |
| `noExternal` | `boolean`                     | `false`    | Bundle everything (no externals, even react/react-dom)   |
| `gzipLevel`  | `number`                      | `5`        | Gzip compression level (1-9)                             |
| `registry`   | `string`                      | `undefined`| Custom npm registry URL                                  |
| `platform`   | `"browser" \| "node" \| "auto"` | `"auto"`   | Target platform                                          |
| `force`      | `boolean`                     | `false`    | Bypass cache                                             |

**Returns:** `Promise<BundleStats>`

```ts
type BundleStats = {
  packageName: string;        // Display name (may include subpath)
  packageVersion: string;     // Resolved version
  exports: string[];          // Exports analyzed
  rawSize: number;            // Raw size in bytes
  gzipSize: number | null;    // Gzip size in bytes (null for node platform)
  gzipLevel: number;          // Compression level used
  externals: string[];        // External packages
  dependencies: string[];     // Package dependencies
  platform: "browser" | "node";
  rawSizeFormatted: string;   // Human-readable (e.g., "45.2 kB")
  gzipSizeFormatted: string | null;
  fromCache: boolean;         // Whether result was from cache
  namedExportCount: number;   // Total named exports in package
};
```

#### `getBundleTrend(options)`

Get bundle size trend across multiple versions.

**Options:**

| Option         | Type                          | Default    | Description                                              |
| -------------- | ----------------------------- | ---------- | -------------------------------------------------------- |
| `package`      | `string`                      | (required) | Package name (version ignored if provided)               |
| `versionCount` | `number`                      | `5`        | Number of versions to analyze                            |
| `exports`      | `string[]`                    | `undefined`| Specific exports to measure                              |
| `external`     | `string[]`                    | `undefined`| Additional packages to mark as external                  |
| `noExternal`   | `boolean`                     | `false`    | Bundle everything including default externals            |
| `gzipLevel`    | `number`                      | `5`        | Gzip compression level (1-9)                             |
| `registry`     | `string`                      | `undefined`| Custom npm registry URL                                  |
| `platform`     | `"browser" \| "node" \| "auto"` | `"auto"`   | Target platform                                          |
| `force`        | `boolean`                     | `false`    | Bypass cache                                             |

**Returns:** `Promise<BundleTrend>`

```ts
type BundleTrend = {
  packageName: string;
  versions: TrendVersionResult[];  // Results for each version (newest first)
  change: TrendChange | null;      // Change between oldest and newest
};

type TrendVersionResult = {
  version: string;
  rawSize: number;
  gzipSize: number | null;
  rawSizeFormatted: string;
  gzipSizeFormatted: string | null;
};

type TrendChange = {
  fromVersion: string;
  toVersion: string;
  rawDiff: number;              // Positive = increase, negative = decrease
  rawPercent: number | null;    // null if oldest size was 0
  rawDiffFormatted: string;     // e.g., "+5.2 kB" or "-1.3 kB"
  gzipDiff: number | null;
  gzipPercent: number | null;   // null if not applicable or oldest size was 0
  gzipDiffFormatted: string | null;
};
```

#### `getPackageVersions(options)`

Get available versions for an npm package.

**Options:**

| Option     | Type     | Default    | Description                  |
| ---------- | -------- | ---------- | ---------------------------- |
| `package`  | `string` | (required) | Package name                 |
| `registry` | `string` | `undefined`| Custom npm registry URL      |

**Returns:** `Promise<PackageVersions>`

```ts
type PackageVersions = {
  versions: string[];              // All versions (newest first)
  tags: Record<string, string>;    // Dist tags (e.g., { latest: "7.0.0" })
};
```

#### `getPackageExports(options)`

Get the named exports of an npm package by analyzing its TypeScript declarations.

**Options:**

| Option     | Type     | Default    | Description                                      |
| ---------- | -------- | ---------- | ------------------------------------------------ |
| `package`  | `string` | (required) | Package name with optional version               |
| `registry` | `string` | `undefined`| Custom npm registry URL                          |

**Returns:** `Promise<PackageExports>`

```ts
type PackageExports = {
  packageName: string;            // Package name
  packageVersion: string;         // Resolved version
  exports: PackageExport[];       // All named exports (including types)
  count: number;                  // Total count (including types)
  runtimeExports: PackageExport[]; // Runtime exports only (no types/interfaces)
  runtimeCount: number;           // Count of runtime exports
};

type PackageExport = {
  name: string;                // Export name (e.g., "Button")
  kind: "function" | "class" | "const" | "type" | "interface" | "enum" | "unknown";
};
```

**Example:**

```js
const result = await getPackageExports({
  package: "@mantine/core",
});

console.log(result.count);        // 1056 (all exports including types)
console.log(result.runtimeCount); // 365 (only importable exports)
console.log(result.runtimeExports[0]); // { name: "Accordion", kind: "unknown" }
```

### Utility Functions

```js
import { formatBytes, parsePackageSpecifier, clearCache, getCacheCount } from "@node-cli/bundlecheck";

// Format bytes to human-readable string
formatBytes(1024);        // "1 kB"
formatBytes(1536);        // "1.5 kB"

// Parse a package specifier
parsePackageSpecifier("@scope/name@1.0.0");
// { name: "@scope/name", version: "1.0.0" }

parsePackageSpecifier("@scope/name/subpath@2.0.0");
// { name: "@scope/name", version: "2.0.0", subpath: "subpath" }

// Cache management
getCacheCount();  // Returns number of cached entries
clearCache();     // Clears all cached results
```

## How It Works

1. Creates a temporary directory
2. Installs the specified npm package (and its peer dependencies)
3. Creates an entry file importing the package/exports
4. Bundles with esbuild (minified, tree-shaken)
5. If bundling fails due to unresolved React imports, automatically adds React to externals and retries
6. Reports raw and gzip sizes
7. Caches the result for faster future lookups
8. Cleans up temporary files

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

When a package declares `react` or `react-dom` in its `dependencies` or `peerDependencies`, they are automatically marked as external (not included in the bundle size). This matches how these packages would typically be used in a real application where React is provided by the host application.

### Subpath externalization

When `react` is externalized, the following subpaths are also automatically externalized:

- `react/jsx-runtime`
- `react/jsx-dev-runtime`

When `react-dom` is externalized:

- `react-dom/client`
- `react-dom/server`

This ensures that modern JSX transform imports and React 18+ APIs work correctly.

### Auto-detection for improperly packaged libraries

Some npm packages import from `react` without declaring it in their `peerDependencies`. Bundlecheck automatically detects this scenario: if the initial bundle fails due to unresolved React imports, it will automatically add `react` and/or `react-dom` to externals and retry.

This means commands like the following work out of the box, even when the package doesn't properly declare its peer dependencies:

```bash
bundlecheck @versini/ui-button  # Works even though react is not in peerDependencies
```

### Disabling externals

To include all dependencies (including React when present) in the bundle size calculation, use the `--no-external` flag:

```bash
bundlecheck react --no-external  # Include React itself in the bundle
```

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
- The cache holds up to **1000 entries** (least recently used entries are evicted first)
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
