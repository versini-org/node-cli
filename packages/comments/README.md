# @node-cli/comments

CLI tool to reflow, normalize, and optionally merge JavaScript / TypeScript comment blocks (JSDoc and `//` single-line comments).

> NOTE: Implementation is scaffolded. Core transformation logic will be added incrementally following the PRD in `reflow-jsdoc-PRD.md`.

## Features (Planned)
- Reflow JSDoc blocks to a max line width
- Optional wrapping of single-line `//` comments
- Optional merging of consecutive `//` lines into a JSDoc block
- Dry run mode with diff output
- Width / punctuation heuristics and NOTE normalization

## Usage
```
comments [options] <files...>
```

Examples:
```
comments src/**/*.ts
comments --dry-run src/index.ts
comments --width 100 --merge-line-comments 'src/**/*.ts'
comments --no-line-wrap src/file.ts
```

## Flags
| Flag | Description |
| ---- | ----------- |
| `--width <n>` | Max output line width (default 80) |
| `--dry-run` | Show diff only; exit 1 if changes would occur |
| `--stdout` | Print transformed content of a single file |
| `--no-line-wrap` | Disable wrapping of `//` comments |
| `--merge-line-comments` | Merge groups of `//` into JSDoc blocks |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Exit Codes
- `0` success or dry run with no changes
- `1` dry run with changes or usage error

## Roadmap
See project PRD `reflow-jsdoc-PRD.md` for full specification.
