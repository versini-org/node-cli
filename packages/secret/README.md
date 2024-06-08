# Node CLI secret package

![npm](https://img.shields.io/npm/v/@node-cli/secret?label=version&logo=npm)

> Secret is a command line tool that can encode or decode a file with a password. It also exposes a library to be used in other projects.

## Installation as a CLI

```sh
> npm install --global @node-cli/secret
```

## Installation as a library

```sh
> cd your-project
> npm install @node-cli/secret
```

## Usage as a library

### Encrypt a string with a password

```js
import { encrypt } from "@node-cli/secret";
const encrypted = encrypt("password", "Hello World");
```

### Decrypt a string with a password

```js
import { decrypt } from "@node-cli/secret";
const decrypted = decrypt("password", encrypted);
```

### Hash a password with a default salt

```js
import { hashPassword } from "@node-cli/secret";
const hashed = hashPassword("password");
// hashed === "some-default-salt:some-hex-string
```

### Hash a password with a custom salt

```js
import { createSalt, hashPassword } from "@node-cli/secret";
const salt = createSalt(42);
const hashed = hashPassword("password", salt);
// hashed === "some-salt:some-hex-string
```

### Verify a password against a hash

```js
import { hashPassword, verifyPassword } from "@node-cli/secret";
const hashed = hashPassword("password");
const isVerified = verifyPassword("password", hashed);
// isVerified === true
```

## Usage as a CLI

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
