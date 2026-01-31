# Changelog

## [3.1.6](https://github.com/versini-org/node-cli/compare/search-v3.1.5...search-v3.1.6) (2026-01-31)


### Bug Fixes

* bump non-breaking dependencies to latest ([#476](https://github.com/versini-org/node-cli/issues/476)) ([91d691f](https://github.com/versini-org/node-cli/commit/91d691fff930afc02144bfda9545b9374364b149))

## [3.1.5](https://github.com/versini-org/node-cli/compare/search-v3.1.4...search-v3.1.5) (2025-12-24)


### Bug Fixes

* bump breaking dependencies to latest ([#451](https://github.com/versini-org/node-cli/issues/451)) ([efb2f08](https://github.com/versini-org/node-cli/commit/efb2f084a937095242dbf23a1ae21399a9654ae4))
* bump non-breaking dependencies to latest ([#449](https://github.com/versini-org/node-cli/issues/449)) ([52e4f91](https://github.com/versini-org/node-cli/commit/52e4f9143e70cad02c4f69fb683771b2e3a376ba))

## [3.1.4](https://github.com/versini-org/node-cli/compare/search-v3.1.3...search-v3.1.4) (2025-08-24)


### Bug Fixes

* update workspace dependency specifiers to wildcard ([#423](https://github.com/versini-org/node-cli/issues/423)) ([728e764](https://github.com/versini-org/node-cli/commit/728e764c1deb7bb75c9769efefd79f350d4e00d3))

## [3.1.3](https://github.com/versini-org/node-cli/compare/search-v3.1.2...search-v3.1.3) (2025-08-24)


### Bug Fixes

* align JSDoc closing delimiter formatting ([#411](https://github.com/versini-org/node-cli/issues/411)) ([ad46e7e](https://github.com/versini-org/node-cli/commit/ad46e7e89d2c7d0c4bd5dc7818662f771a64fbcd))

## [3.1.2](https://github.com/versini-org/node-cli/compare/search-v3.1.1...search-v3.1.2) (2025-08-23)


### Bug Fixes

* bump non-breaking dependencies to latest ([#403](https://github.com/versini-org/node-cli/issues/403)) ([9338e27](https://github.com/versini-org/node-cli/commit/9338e27122994f5780d3be5c0c5886171b2a059c))
* refactor glob matching to use micromatch ([#408](https://github.com/versini-org/node-cli/issues/408)) ([17f9e5b](https://github.com/versini-org/node-cli/commit/17f9e5b493f3c25614ae095594e239fb41c60fb6))

## [3.1.1](https://github.com/versini-org/node-cli/compare/search-v3.1.0...search-v3.1.1) (2025-06-20)


### Bug Fixes

* convert tests from Jest to Vitest ([#399](https://github.com/versini-org/node-cli/issues/399)) ([cca4541](https://github.com/versini-org/node-cli/commit/cca45414f758508d21a179d41b9f04efe293d6d8))

## [3.1.0](https://github.com/versini-org/node-cli/compare/search-v3.0.1...search-v3.1.0) (2025-03-20)


### Features

* **Search:** adding minifyForLLM option ([#396](https://github.com/versini-org/node-cli/issues/396)) ([94878d5](https://github.com/versini-org/node-cli/commit/94878d5f9bd97cf9e741865607c9a4b895db9fc0))

## [3.0.1](https://github.com/versini-org/node-cli/compare/search-v3.0.0...search-v3.0.1) (2025-03-18)


### Bug Fixes

* **Search:** using logger in memory capabilities ([#394](https://github.com/versini-org/node-cli/issues/394)) ([0854711](https://github.com/versini-org/node-cli/commit/0854711058324def6e97b684c4df4bc0955f6710))

## [3.0.0](https://github.com/versini-org/node-cli/compare/search-v2.0.1...search-v3.0.0) (2025-03-17)


### ⚠ BREAKING CHANGES

* **Search:** foldersBlacklist is not available anymore

### Features

* **Search:** replacing hidden option foldersBlacklist with ignoreFolder ([#387](https://github.com/versini-org/node-cli/issues/387)) ([87b4e72](https://github.com/versini-org/node-cli/commit/87b4e725a9dadea1ab9e2aefcfca55ff0ed6d4f0))

## [2.0.1](https://github.com/versini-org/node-cli/compare/search-v2.0.0...search-v2.0.1) (2025-03-17)


### Bug Fixes

* **Search:** better ignoreExtension option allowing "min.js" pattern ([#385](https://github.com/versini-org/node-cli/issues/385)) ([929b674](https://github.com/versini-org/node-cli/commit/929b67447a57051c30c57a5c858f3650660433db))

## [2.0.0](https://github.com/versini-org/node-cli/compare/search-v1.2.2...search-v2.0.0) (2025-03-17)


### ⚠ BREAKING CHANGES

* **Search:** breaking change ([#383](https://github.com/versini-org/node-cli/issues/383))

### Features

* **Search:** adding ignoreFile option ([#384](https://github.com/versini-org/node-cli/issues/384)) ([74fa371](https://github.com/versini-org/node-cli/commit/74fa371d67c6048f378866e3b6f904a94d4ef43a))


### Bug Fixes

* **Search:** ! renamed ignore into ignoreExtension ([#381](https://github.com/versini-org/node-cli/issues/381)) ([6cbc75f](https://github.com/versini-org/node-cli/commit/6cbc75f33a6132f24bae790937484fba1c6437d2))
* **Search:** breaking change ([#383](https://github.com/versini-org/node-cli/issues/383)) ([1069bc3](https://github.com/versini-org/node-cli/commit/1069bc3a7b03580cb4edd1bb4c4b3f2e20387070))

## [1.2.2](https://github.com/versini-org/node-cli/compare/search-v1.2.1...search-v1.2.2) (2025-03-16)


### Bug Fixes

* **Search:** in printMode binary files content should not be displayed ([#379](https://github.com/versini-org/node-cli/issues/379)) ([ac289aa](https://github.com/versini-org/node-cli/commit/ac289aa76b7c4daf2b872b3c5aaf21a62fb1b760))

## [1.2.1](https://github.com/versini-org/node-cli/compare/search-v1.2.0...search-v1.2.1) (2025-03-16)


### Bug Fixes

* **Search:** relative path for file/dir name is invalid ([#377](https://github.com/versini-org/node-cli/issues/377)) ([5174826](https://github.com/versini-org/node-cli/commit/5174826f8dec8195de8d22b8a225fa88b42a681f))

## [1.2.0](https://github.com/versini-org/node-cli/compare/search-v1.1.1...search-v1.2.0) (2025-03-16)


### Features

* allowing to return data instead of print to stdio ([#375](https://github.com/versini-org/node-cli/issues/375)) ([ef2dc9a](https://github.com/versini-org/node-cli/commit/ef2dc9a6cd7048b88e59da018b6976b523307cc3))

## [1.1.1](https://github.com/versini-org/node-cli/compare/search-v1.1.0...search-v1.1.1) (2025-03-16)


### Bug Fixes

* **Search:** allowing search to be called programmatically ([#373](https://github.com/versini-org/node-cli/issues/373)) ([9d09ab6](https://github.com/versini-org/node-cli/commit/9d09ab618660d00b13bd75ff509265741ffc6c0d))

## [1.1.0](https://github.com/versini-org/node-cli/compare/search-v1.0.8...search-v1.1.0) (2025-03-16)


### Features

* **search:** adding ignore flag allowing ignoring some files ([#370](https://github.com/versini-org/node-cli/issues/370)) ([637f4c5](https://github.com/versini-org/node-cli/commit/637f4c568d22634aeba2e7a878abbdab0c1a0973))
* **Search:** adding print modes ([#371](https://github.com/versini-org/node-cli/issues/371)) ([b9bab3e](https://github.com/versini-org/node-cli/commit/b9bab3e09f07aba3935424f917b00dec7cec54c1))
* **Search:** adding support for taking gitignore files into account ([#372](https://github.com/versini-org/node-cli/issues/372)) ([cd2b745](https://github.com/versini-org/node-cli/commit/cd2b745064da58175e2c3cc03c37df3393ae8a42))


### Bug Fixes

* **search:** if a file contains "undefined" in its name search breaks ([#368](https://github.com/versini-org/node-cli/issues/368)) ([4220020](https://github.com/versini-org/node-cli/commit/4220020a4ae693f8d6f61b182add4e8b3dbedd8e))

## [1.0.8](https://github.com/versini-org/node-cli/compare/search-v1.0.7...search-v1.0.8) (2024-11-18)


### Bug Fixes

* bump non-breaking dependencies to latest ([#366](https://github.com/versini-org/node-cli/issues/366)) ([748cbab](https://github.com/versini-org/node-cli/commit/748cbab716d61c7a69746e99c99b754322c96b2c))

## [1.0.7](https://github.com/aversini/node-cli/compare/search-v1.0.6...search-v1.0.7) (2024-08-05)


### Bug Fixes

* bump some dependencies to latest ([#336](https://github.com/aversini/node-cli/issues/336)) ([25a4bde](https://github.com/aversini/node-cli/commit/25a4bde77249c81017db1ffa852afe619298aad8))

## [1.0.6](https://github.com/aversini/node-cli/compare/search-v1.0.5...search-v1.0.6) (2024-04-21)


### Bug Fixes

* bump to latest deps + replace ESLint/Prettier with Biome ([#308](https://github.com/aversini/node-cli/issues/308)) ([e33aa66](https://github.com/aversini/node-cli/commit/e33aa66c0a1b95cc7fb9e10cdac2a60eefd309de))

## [1.0.5](https://github.com/aversini/node-cli/compare/search-v1.0.4...search-v1.0.5) (2024-03-16)


### Bug Fixes

* bump dependencies to latest ([4c91938](https://github.com/aversini/node-cli/commit/4c9193837c89d3aa9b4f82afa22e3f0668fdea6e))

## [1.0.4](https://github.com/aversini/node-cli/compare/search-v1.0.3...search-v1.0.4) (2024-02-11)


### Bug Fixes

* bump dependencies to latest ([6328f22](https://github.com/aversini/node-cli/commit/6328f22523f7760932d563f79cace26715b17d7d))

## [1.0.3](https://github.com/aversini/node-cli/compare/search-v1.0.2...search-v1.0.3) (2024-01-16)


### Bug Fixes

* **search:** bump prod dependencies ([6e0b229](https://github.com/aversini/node-cli/commit/6e0b2294e0e9660689278c11bec9a36352de48ce))

## [1.0.2](https://github.com/aversini/node-cli/compare/search-v1.0.1...search-v1.0.2) (2023-07-17)


### Bug Fixes

* bump prod dependencies to latest ([07f1a5e](https://github.com/aversini/node-cli/commit/07f1a5e098be2990e4cc2387b9ad5dfc0ae89b2a))

## [1.0.1](https://github.com/aversini/node-cli/compare/search-v1.0.0...search-v1.0.1) (2023-05-27)


### Bug Fixes

* using parser 2.0.0 to fix invalid version reporting ([38ad701](https://github.com/aversini/node-cli/commit/38ad7013edb7888f73062e3daed3051d258a5546))

## 1.0.0 (2023-05-27)


### Features

* adding search files and folders ([ee8b6e6](https://github.com/aversini/node-cli/commit/ee8b6e689219aae7a1cd1fce78921f66c917f994))


### Bug Fixes

* no results if pattern or grep are undefined ([306afbb](https://github.com/aversini/node-cli/commit/306afbbfb7958e8c5aa6324d536683c44546161c))
