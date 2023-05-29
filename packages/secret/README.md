# Node CLI secret package

![npm](https://img.shields.io/npm/v/@node-cli/secret?label=version&logo=npm)

> Secret is a command line tool that can encode or decode a file with a password.

## Installation

```sh
> npm install --global @node-cli/secret
```

## Examples

NOTE: The password is not stored anywhere, it is only used to encrypt or decrypt the file and will be prompted each time.

### Encrypt a file

```sh
> secret --encrypt README.md README.md.enc
```

### Decrypt a file

```sh
> secret --decrypt README.md.enc README.md
```

### Get help

```sh
> search --help
```

## License

MIT © Arno Versini
