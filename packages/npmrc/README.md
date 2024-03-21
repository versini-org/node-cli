# Node CLI npmrc package

![npm](https://img.shields.io/npm/v/@node-cli/npmrc?label=version&logo=npm)

> Npmrc allows you to toggle different npmrc configuration files on the fly.

## Installation

```sh
> npm install --global @node-cli/npmrc
```

## Examples

Create a profile from the current .npmrc file

```sh
> npmrc -c my-profile
```

List profiles handled by npmrc

```sh
> npmrc -l
```

Update an existing profile with the current .npmrc file

```sh
> npmrc -u
```

Switch to an existing profile handled by npmrc

```sh
> npmrc my-profile
```

Delete a profile handled by npmrc

```sh
> npmrc -d my-profile
```

Get help

```sh
> npmrc --help
```

## License

MIT © Arno Versini
