# Node CLI npmrc package

![npm](https://img.shields.io/npm/v/@node-cli/npmrc?label=version&logo=npm)

> Npmrc allows you to toggle different npmrc configuration files on the fly.

## Installation

```sh
> npm install --global @node-cli/npmrc
```

## Examples

List existing profiles

```sh
> npmrc -l
```

Create a profile

```sh
> npmrc -c my-profile
```

Switch to an existing profile

```sh
> npmrc my-profile
```

Delete a profile

```sh
> npmrc -d my-profile
```

Get help

```sh
> npmrc --help
```

## License

MIT © Arno Versini
