# @node-cli/biome-config

The biome config shared across the `@versini` and `@node-cli` repos. It ships
`biome.json` and nothing else.

```json
{
	"extends": ["@node-cli/biome-config/biome"]
}
```

`@biomejs/biome` is a peer dependency. Each repo declares the biome version it
runs, along with every other tool it uses, directly in its own `package.json`.
With `autoInstallPeers: false`, which every consumer sets, nothing installs
biome for you.

## Why it holds no dependencies

This config used to live in `@versini/dev-dependencies-common`, which also
bundled the tooling, so a repo got biome, typescript, vitest and the rest from
one pin. That coupled every repo to the bundle's release: a new major of any
tool reached the whole fleet the moment the bundle published, and a package one
repo needed was installed by all of them. Each repo now owns its tooling and
moves on its own schedule, and deps-train keeps the non-major versions aligned
across them.

Do not add dependencies here. A tool the repos share goes in each repo's
`package.json`.

## Changing the config

A rule that needs a newer biome raises the floor of the peer range in the same
change, so a repo on an older biome gets a peer warning instead of a config
error it cannot explain.
