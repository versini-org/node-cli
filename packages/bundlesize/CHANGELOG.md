# Changelog

## [4.1.1](https://github.com/aversini/node-cli/compare/bundlesize-v4.1.0...bundlesize-v4.1.1) (2024-07-07)


### Bug Fixes

* bump dependencies to latest ([#330](https://github.com/aversini/node-cli/issues/330)) ([0042fcc](https://github.com/aversini/node-cli/commit/0042fcc5ae686390b4425ca2282ac03844efb7ec))

## [4.1.0](https://github.com/aversini/node-cli/compare/bundlesize-v4.0.4...bundlesize-v4.1.0) (2024-06-04)


### Features

* **bundlesize:** allowing stars (*) alongside hash and semver ([#323](https://github.com/aversini/node-cli/issues/323)) ([db1a4cb](https://github.com/aversini/node-cli/commit/db1a4cb8d7abcb001c846cfcafdcb1452760fbc5))

## [4.0.4](https://github.com/aversini/node-cli/compare/bundlesize-v4.0.3...bundlesize-v4.0.4) (2024-05-13)


### Bug Fixes

* bump dependencies to latest ([#319](https://github.com/aversini/node-cli/issues/319)) ([0000388](https://github.com/aversini/node-cli/commit/0000388cfa973a86239e5b2e7976d3381286dd59))

## [4.0.3](https://github.com/aversini/node-cli/compare/bundlesize-v4.0.2...bundlesize-v4.0.3) (2024-04-21)


### Bug Fixes

* bump to latest deps + replace ESLint/Prettier with Biome ([#308](https://github.com/aversini/node-cli/issues/308)) ([e33aa66](https://github.com/aversini/node-cli/commit/e33aa66c0a1b95cc7fb9e10cdac2a60eefd309de))

## [4.0.2](https://github.com/aversini/node-cli/compare/bundlesize-v4.0.1...bundlesize-v4.0.2) (2024-03-16)


### Bug Fixes

* bump dependencies to latest ([4c91938](https://github.com/aversini/node-cli/commit/4c9193837c89d3aa9b4f82afa22e3f0668fdea6e))

## [4.0.1](https://github.com/aversini/node-cli/compare/bundlesize-v4.0.0...bundlesize-v4.0.1) (2024-02-11)


### Bug Fixes

* bump dependencies to latest ([6328f22](https://github.com/aversini/node-cli/commit/6328f22523f7760932d563f79cace26715b17d7d))

## [4.0.0](https://github.com/aversini/node-cli/compare/bundlesize-v3.1.1...bundlesize-v4.0.0) (2024-01-28)


### ⚠ BREAKING CHANGES

* **bundlesize:** the footer custom function is now accepting an object instead of multiple arguments

### Features

* **bundlesize:** improved custom footer and 100% coverage ([7cc497b](https://github.com/aversini/node-cli/commit/7cc497baa7da16343939779cab994bf7b0935aaf))

## [3.1.1](https://github.com/aversini/node-cli/compare/bundlesize-v3.1.0...bundlesize-v3.1.1) (2024-01-28)


### Bug Fixes

* **bundlesize:** do not crash if previous stats are incomplete ([8ff183a](https://github.com/aversini/node-cli/commit/8ff183a33994eadaa7d572108868b8a8d959a0f7))

## [3.1.0](https://github.com/aversini/node-cli/compare/bundlesize-v3.0.1...bundlesize-v3.1.0) (2024-01-28)


### Features

* **bundlesize:** adding support for special keyword "&lt;semver&gt;" ([0d231dc](https://github.com/aversini/node-cli/commit/0d231dc332e71ab23af5a41689e844bbc0facf62))


### Bug Fixes

* **bundlesize:** better glob pattern for semver ([5615a6f](https://github.com/aversini/node-cli/commit/5615a6f797a386bf36a35ad303daaa1ed58deea5))

## [3.0.1](https://github.com/aversini/node-cli/compare/bundlesize-v3.0.0...bundlesize-v3.0.1) (2024-01-24)


### Bug Fixes

* do not overwrite existing results unless --force is used ([451f061](https://github.com/aversini/node-cli/commit/451f0612cd725fbfd3e9c667e8cefc4bb7b5701c))

## [3.0.0](https://github.com/aversini/node-cli/compare/bundlesize-v2.1.5...bundlesize-v3.0.0) (2024-01-23)


### ⚠ BREAKING CHANGES

* **bundlesize:** the format of the configuration file has changed.

### Features

* **bundlesize:** adding compare capabilities ([d628709](https://github.com/aversini/node-cli/commit/d628709c9379fa1ab190dca0ecf71a7f8fd443f6))

## [2.1.5](https://github.com/aversini/node-cli/compare/bundlesize-v2.1.4...bundlesize-v2.1.5) (2024-01-22)


### Bug Fixes

* **bundlesize:** remove gzip-size dependency ([75149bb](https://github.com/aversini/node-cli/commit/75149bbfbc88a5f510d8e467c651010f85d81967))

## [2.1.4](https://github.com/aversini/node-cli/compare/bundlesize-v2.1.3...bundlesize-v2.1.4) (2024-01-20)


### Bug Fixes

* **bundlesize:** refactor - wip ([5a9f8d4](https://github.com/aversini/node-cli/commit/5a9f8d41fbd73d5c5f606e2fabfc9808b5d3254e))
* **bundlesize:** refactor and add unit tests ([87aee80](https://github.com/aversini/node-cli/commit/87aee80a802ab5a4beca0267f02400b20229218c))

## [2.1.3](https://github.com/aversini/node-cli/compare/bundlesize-v2.1.2...bundlesize-v2.1.3) (2024-01-19)


### Bug Fixes

* **bundlesize:** hash could contain _ or - ([a2a9275](https://github.com/aversini/node-cli/commit/a2a9275493f921771985263634000b76e9eb7132))

## [2.1.2](https://github.com/aversini/node-cli/compare/bundlesize-v2.1.1...bundlesize-v2.1.2) (2024-01-19)


### Bug Fixes

* **bundlesize:** if hash is used index should remain the same ([25265e0](https://github.com/aversini/node-cli/commit/25265e055852259a5ba039fc5e5003d279c20e7f))

## [2.1.1](https://github.com/aversini/node-cli/compare/bundlesize-v2.1.0...bundlesize-v2.1.1) (2024-01-18)


### Bug Fixes

* **bundlesize:** indexes should remain relative ([ff5c822](https://github.com/aversini/node-cli/commit/ff5c8225ff0481c27a5b74e6064dfb586a45f8ba))

## [2.1.0](https://github.com/aversini/node-cli/compare/bundlesize-v2.0.0...bundlesize-v2.1.0) (2024-01-18)


### Features

* **bundlesize:** adding support for glob in configuration ([6293514](https://github.com/aversini/node-cli/commit/629351438e70552d10723ac3b64836aba5b0cf77))

## [2.0.0](https://github.com/aversini/node-cli/compare/bundlesize-v1.0.0...bundlesize-v2.0.0) (2024-01-17)


### ⚠ BREAKING CHANGES

* **bundlesize:** output results with artifactPaths as keys

### Features

* **bundlesize:** output results with artifactPaths as keys ([09b4a5c](https://github.com/aversini/node-cli/commit/09b4a5ce03a49b029d54a7d15fe12f54c51859bd))

## 1.0.0 (2024-01-17)


### Features

* adding bundlesize ([9e02d05](https://github.com/aversini/node-cli/commit/9e02d0575d7dd51149063cc361af71f6d895b9be))
