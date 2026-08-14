# Node CLI timer package

![npm](https://img.shields.io/npm/v/@node-cli/timer?label=version&logo=npm)

> Timer is a dead simple command line tool to display the remaining time for a given duration.

## Installation

```sh
> npm install --global @node-cli/timer
```

## Examples

Start a timer for 4 hours, 2 minutes and 15 seconds

```sh
> timer 4h2m15s
```

Start a timer for 1 minute and 42 seconds

```sh
> timer 1m42s
```

Get help

```sh
> timer --help
```

## Notifications

When the timer is done it raises a desktop notification. On macOS this is a
dialog carrying the timer's own icon, which stays on screen until you dismiss
it — a banner auto-dismisses after a few seconds, so a timer that fires while
you are away from the keyboard would leave nothing behind. The dialog is
released detached, so the timer itself exits immediately and never blocks
whatever you chained behind it.

Prefer the passive banner:

```sh
> timer 1m42s --banner
```

Turn notifications off entirely:

```sh
> timer 1m42s --no-notification
```

`--banner` is macOS-only; Linux (`notify-send`) and Windows (toast) always use
their native banner.

Be aware that macOS silently suppresses banners while a Focus mode is on or
while you are sharing your screen — `--banner` will appear to do nothing. The
dialog is an ordinary window, so it is not affected by either.

## License

MIT © Arno Versini
