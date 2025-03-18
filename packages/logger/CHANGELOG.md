# Changelog

## [1.3.0](https://github.com/versini-org/node-cli/compare/logger-v1.2.6...logger-v1.3.0) (2025-03-18)


### Features

* **Logger:** adding inMemory option to log in memory instead of stdio ([#392](https://github.com/versini-org/node-cli/issues/392)) ([96e4f3c](https://github.com/versini-org/node-cli/commit/96e4f3c3f63cbadc28cea31552638af40b90e434))


### Bug Fixes

* **logger:** bump non-breaking dependencies to latest ([#389](https://github.com/versini-org/node-cli/issues/389)) ([004fe98](https://github.com/versini-org/node-cli/commit/004fe98829b8e42458c7c7c14c9ba2390b3799c7))

## [1.2.6](https://github.com/versini-org/node-cli/compare/logger-v1.2.5...logger-v1.2.6) (2024-11-18)


### Bug Fixes

* bump non-breaking dependencies to latest ([#366](https://github.com/versini-org/node-cli/issues/366)) ([748cbab](https://github.com/versini-org/node-cli/commit/748cbab716d61c7a69746e99c99b754322c96b2c))

## [1.2.5](https://github.com/aversini/node-cli/compare/logger-v1.2.4...logger-v1.2.5) (2024-04-21)


### Bug Fixes

* bump to latest deps + replace ESLint/Prettier with Biome ([#308](https://github.com/aversini/node-cli/issues/308)) ([e33aa66](https://github.com/aversini/node-cli/commit/e33aa66c0a1b95cc7fb9e10cdac2a60eefd309de))

## [1.2.4](https://github.com/aversini/node-cli/compare/logger-v1.2.3...logger-v1.2.4) (2024-03-22)


### Bug Fixes

* **logger:** printBox does not respect the boring option ([#295](https://github.com/aversini/node-cli/issues/295)) ([9c0876b](https://github.com/aversini/node-cli/commit/9c0876b144e9841eb3dd0ee8f5ebe15c8425e45f))

## [1.2.3](https://github.com/aversini/node-cli/compare/logger-v1.2.2...logger-v1.2.3) (2024-03-16)


### Bug Fixes

* bump dependencies to latest ([4c91938](https://github.com/aversini/node-cli/commit/4c9193837c89d3aa9b4f82afa22e3f0668fdea6e))

## [1.2.2](https://github.com/aversini/node-cli/compare/logger-v1.2.1...logger-v1.2.2) (2024-01-16)


### Bug Fixes

* **logger:** bump ora to latest ([19a1d37](https://github.com/aversini/node-cli/commit/19a1d3719b08f483a57b0df6c02f69282daf1ea5))

## [1.2.1](https://github.com/aversini/node-cli/compare/logger-v1.2.0...logger-v1.2.1) (2023-07-17)


### Bug Fixes

* bump prod dependencies to latest ([07f1a5e](https://github.com/aversini/node-cli/commit/07f1a5e098be2990e4cc2387b9ad5dfc0ae89b2a))

## [1.2.0](https://github.com/aversini/node-cli/compare/logger-v1.1.0...logger-v1.2.0) (2023-05-28)


### Features

* adding Spinner class ([a123cf6](https://github.com/aversini/node-cli/commit/a123cf6ee1b89df47ba348f52db487aa26e4d7c3))


### Bug Fixes

* start() and stop() methods arguments are optional ([e6df4c3](https://github.com/aversini/node-cli/commit/e6df4c3d13709ae15bdcc23587a5a666f100316f))

## [1.1.0](https://github.com/aversini/node-cli/compare/logger-v1.0.0...logger-v1.1.0) (2023-05-23)


### Features

* adding printBox method ([9f8765d](https://github.com/aversini/node-cli/commit/9f8765d760ee72df63ab0c05e7b47c5f8a1f0347))

## 1.0.0 (2023-05-22)


### Features

* adding printErrorsAndExit method ([e764c0b](https://github.com/aversini/node-cli/commit/e764c0bb0e5dfe81403fcb73c51dcd600b5d3524))
* anything that should be private is private ([27416dd](https://github.com/aversini/node-cli/commit/27416dd304af729e1a7ea4f17f612fa070171115))
* relocating all types and adding a barrel for each ([47aa152](https://github.com/aversini/node-cli/commit/47aa152c8f50e98a4e3525150d75d1f8ed58fe73))


### Bug Fixes

* all types are now at the root of dist ([c9461a9](https://github.com/aversini/node-cli/commit/c9461a9d91db8e3f77eedd7b03469b5f09e75a2e))
* all types are now under dist/types ([6e79fe6](https://github.com/aversini/node-cli/commit/6e79fe6a4d5dc0ce1d0c89580fcabd2752e8cfb2))
* better configuration for swc+esm+ts+jest ([9967a6b](https://github.com/aversini/node-cli/commit/9967a6b81ee942c462cf1222e8ed346bf4481cbe))
* do not use private fields in tests ([46810d6](https://github.com/aversini/node-cli/commit/46810d629773911dbd8f960ffe041a7dab290afb))
* getting rid of npm-run-all ([bebf9d7](https://github.com/aversini/node-cli/commit/bebf9d76a936d517f1551e814ceea210183dcc77))
* making sure logger pkg can be published ([927e16d](https://github.com/aversini/node-cli/commit/927e16d42a0bef902095e406e8c6638b46246d07))
* reduce target code from esnext to es2022 ([1fcce62](https://github.com/aversini/node-cli/commit/1fcce6215b91366b6d7264cebf5f95fda6cf00d4))
* simpler linter rules for file name cases ([3eb0d68](https://github.com/aversini/node-cli/commit/3eb0d6812182d4f5ee02e5355640bd361fe73eff))
* using private methods ([151845d](https://github.com/aversini/node-cli/commit/151845db117844c3e9f014a4f33c3c95c459e9db))
