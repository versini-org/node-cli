# Node CLI search package

![npm](https://img.shields.io/npm/v/@node-cli/search?label=version&logo=npm)

> Search is a command line tool that can:
>
> - find files or folders that match a certain pattern
> - look for string within those files and display them (think shell commands "find" and "grep")

## Installation

This command line utility can be installed globally or locally within your project. It does make more sense to have it installed globally though, since it then can be use anywhere by simply starting it to search files and folders located in the current folder.

```sh
> npm install --global @node-cli/search
```

## Examples

Find all files with the extension ".jsx" in the "src" folder

```sh
> search --type f --pattern ".jsx$" src/
```

Find all files without the extension "jsx" or "md" in the "src" folder

```sh
> search --type f --ignore "jsx" --ignore "md" src/
```

Change the permissions to executable for all the files with the extension ".sh" found under the "bin" folder

```sh
> search --type f --pattern ".sh$" --command "chmod +x" bin/
```

Search in all the markdown files under the "src" folder for the keywords "Table of Content"

```sh
> search --type f --pattern ".md$" --grep "Table of Content"
```

Get help

```sh
> search --help
```

## License

MIT © Arno Versini
