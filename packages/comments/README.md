# @node-cli/comments

CLI tool to reflow, normalize, wrap, and (optionally) merge JavaScript / TypeScript comments (JSDoc blocks and `//` single‑line comments) with opinionated heuristics for punctuation, NOTE normalization, and structured content preservation.

## Features

- Reflows JSDoc comment blocks to a target max width while preserving code fences, lists, tags, headings, visually‑indented code, and structured regex / pattern explanation sections.
- Wraps `//` single‑line comments (soft paragraph detection) with smart sentence termination (adds a trailing period only where appropriate).
- Optional merging of consecutive `//` lines into a synthetically generated multi‑line JSDoc block (preserves structured groups verbatim; converts explanatory paragraphs into wrapped sentences).
- NOTE normalization (`note:` → `NOTE:`) and safe sentence splitting for multiple NOTE sentences in one block.
- Defensive regex design (linear JSDoc extraction, indentation & size caps) to mitigate pathological input / ReDoS risk.
- Dry‑run diff mode with minimal, colorized unified style output and deterministic exit codes for CI enforcement.
- Glob expansion for simple patterns (`*`, `**`, `?`) via internal expander (no shell dependency) – quote globs in shells that expand themselves (e.g. zsh) to ensure consistent behavior.
- Optional disabling of line comment wrapping, and optional merge of line comment groups.
- Color output by default, suppressible with `--boring` (useful in test snapshots or plain log collectors).

## Install

Using pnpm (recommended for workspaces):

```sh
pnpm add -D @node-cli/comments
```

Using npx (no install):

```sh
npx @node-cli/comments --dry-run src/index.ts
```

## CLI Usage

```
comments [options] <files...>
```

### Examples

```sh
# Reflow comments in all TS sources
comments 'src/**/*.ts'

# Show diff for a single file (non‑zero exit if changes needed)
comments --dry-run src/index.ts

# Use custom width and merge explanatory // groups into JSDoc blocks
comments --width 100 --merge-line-comments 'src/**/*.ts'

# Disable wrapping of line comments (only reflow JSDoc blocks)
comments --no-line-wrap 'src/**/*.ts'

# Output transformed content to STDOUT (single file only)
comments --stdout src/file.ts
```

## Flags

| Flag / Short            | Default | Description                                                                                           |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `--width <n>`           | `80`    | Maximum output line width for wrapping/reflow.                                                        |
| `-D, --dry-run`         | `false` | Show diff only; exit `1` if any file would change (CI friendly).                                      |
| `--stdout`              | `false` | Print transformed content of a single file to STDOUT (no writes). Requires exactly one file argument. |
| `--no-line-wrap`        | `false` | Do not wrap `//` line comments (still reflows JSDoc blocks).                                          |
| `--merge-line-comments` | `false` | Merge consecutive `//` comment groups into JSDoc blocks (heuristics skip directives, licenses, URLs). |
| `-b, --boring`          | `false` | Disable colored output.                                                                               |
| `-h, --help`            | —       | Show help and usage examples.                                                                         |
| `-v, --version`         | —       | Show version.                                                                                         |

Notes:

1. `--stdout` may not be combined with multiple file/glob inputs.
2. `--merge-line-comments` affects grouping heuristics; structured groups (regex / pattern docs) are preserved verbatim line‑by‑line.

## Exit Codes

- `0` Success OR dry run with no required changes.
- `1` Dry run detected pending changes OR usage / restriction error.

These semantics let you add a lint step: `comments --dry-run 'src/**/*.ts'` in CI.

## Programmatic API

While the primary interface is the CLI, a small programmatic API is exposed:

```ts
import { parseAndTransformComments, diffLines } from "@node-cli/comments";

const source = `/** example */\n// note: something`;
const result = parseAndTransformComments(source, {
  width: 100,
  wrapLineComments: true,
  mergeLineComments: false
});

console.log(result.changed); // boolean
console.log(result.transformed); // new content
console.log(diffLines(source, result.transformed)); // crude line diff
```

Types:

```ts
interface ProcessOptions {
  width: number;
  wrapLineComments: boolean;
  mergeLineComments: boolean;
}

interface FileResult {
  original: string;
  transformed: string;
  changed: boolean;
}
```

## Heuristics Overview

- Adds a terminal period to sentences lacking final punctuation (unless ending with a colon, tag line, list marker, or detected continuation).
- Normalizes `NOTE:` capitalization and splits multiple NOTE sentences safely.
- Skips wrapping/merging for linter and tool directive comments, including:
  - ESLint (`eslint-disable`, `eslint-enable`, `eslint-disable-next-line`, etc.)
  - Biome (`biome-ignore`)
  - TypeScript (`@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `@ts-check`)
  - Prettier (`prettier-ignore`)
  - StyleLint (`stylelint-disable`, `stylelint-enable`)
  - Coverage tools (`v8 ignore`, `c8 ignore`, `istanbul ignore`)
  - URLs (`https://...`)
- Preserves fenced code blocks and visually indented code blocks in JSDoc.
- Structured explanation groups (regex / pattern walkthroughs) remain line‑stable to avoid unintended semantic changes.
- Protects against pathological inputs with maximum indentation and comment body size limits.

## Globs

Simple glob patterns (`*`, `**`, `?`) are expanded internally. Quote patterns to prevent your shell from pre‑expanding them inconsistently:

```sh
comments 'src/**/*.ts'
```

## Suggested CI Integration

Add to your project scripts (example):

```jsonc
{
  "scripts": {
    "comments:check": "comments --dry-run 'src/**/*.ts'",
    "comments:fix": "comments --merge-line-comments 'src/**/*.ts'"
  }
}
```

Then in CI:

```sh
pnpm comments:check
```

## Security & Performance Notes

- Regex for JSDoc extraction is linear-time (tempered) and capped by size / indentation limits.
- No remote network access; operates purely on provided files.
- Diff output omits file content when unchanged to keep logs concise.

## License

MIT © Arno Versini

---

For full design rationale see project PRD (internal) and inline comments in `src/lib.ts` documenting regex safety and heuristics.
