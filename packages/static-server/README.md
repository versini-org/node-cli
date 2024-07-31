# Static Server

![npm](https://img.shields.io/npm/v/@node-cli/static-server?label=version&logo=npm)

> Static Server is a simple, zero-configuration, command line HTTP server to serve static files locally.

## Installation

This command line utility can be installed globally or locally within your project. It does make more sense to have it installed globally though, since it then can be use anywhere by simply starting it to serve the files located in the current folder.

```sh
> npm install -g @node-cli/static-server
```

## Usage

```sh
> static-server [options] [path]
```

`[path]` defaults to the current folder if it's not provided at the command line prompt.

At that point, you should be able to visit `http://localhost:8080` and see the files located in the current folder.

### Options

| option                     | default   | description                                                 |
| -------------------------- | --------- | ----------------------------------------------------------- |
| `-c` or `--cache <number>` | 0         | Time in seconds for caching files                           |
| `-C` or `--cors`           | false     | Set CORS headers to \* to allow requests from any origin    |
| `-d` or `--dirs`           | true      | List the directory's contents                               |
| `-h` or `--help`           |           | Display help instructions                                   |
| `--host`                   | localhost | Change the default host address to bind to                  |
| `-H` or `--http2`          | false     | Enable HTTP/2 and SSL (https)                               |
| `-l` or `--logs`           | false     | Log HTTP requests at the prompt                             |
| `-o` or `--open`           | false     | Open in your default browser                                |
| `-p` or `--port <n>`       | 8080      | Port to listen on - Will try next available if already used |
| `-g` or `--gzip`           | true      | Enable GZIP compression                                     |
| `-v` or `--version`        |           | Output the current version                                  |

### SSL support

SSL support is available by using the `--http2` option. This will enable HTTP/2 and SSL (https). The server will use a self-signed certificate to serve the files. You will be prompted to accept the certificate when you visit the server in your browser.

If you have your own local certificates, for example by using [mkcert](https://github.com/FiloSottile/mkcert), simply set the `STATIC_SERVER_CERT` and `STATIC_SERVER_KEY` environment variables to the path of your certificate and key files. In this case, you won't be prompted to accept the certificate.

```sh



## License

MIT © Arno Versini
```
