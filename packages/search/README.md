# Node CLI search package

![npm](https://img.shields.io/npm/v/@node-cli/search?label=version&logo=npm)

> Search is a command line tool that can:
>
> - find files or folders that match a certain pattern
> - look for string within those files and display them (think shell commands "find" and "grep")

## Installation

```sh
> npm install --global @node-cli/search
```

## Examples

Find all files with the extension ".jsx" in the "src" folder

```sh
> search --type f --pattern ".jsx$" src/
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
