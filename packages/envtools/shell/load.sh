#!/bin/bash

# Bail out early if Envtools is already loaded in *this* shell, unless this
# is a manual `reload`.
#
# Detection is keyed off EVTLS_LOADED, a plain (non-exported) shell variable.
# This is deliberate: an exported variable (like EVTLS_RUNTIME_DIR, which we
# used to test here) leaks into every child process's environment, so a child
# shell would think Envtools was already loaded and skip setup -- even though
# shell functions and aliases are NOT inherited across processes. That is
# exactly what broke tmux panes (and ssh sessions, plain sub-shells, etc.):
# the env var was inherited, the aliases were not. VSCode terminals hit the
# same issue, which is why they used to need a dedicated carve-out here.
#
# A non-exported variable persists across re-sourcing within the same shell
# (e.g. `source ~/.zshrc`) but is never inherited by child shells, so its
# lifetime matches that of the functions/aliases we set up. Any new shell
# therefore re-loads Envtools cleanly, with no per-environment special-casing.
if [ "$EVTLS_INIT_PARAM" != "reload" ] && [ -n "$EVTLS_LOADED" ]; then
	return 0
fi

# Envtools only works in bash or zsh
if [[ "$SHELL" = *"zsh"* ]]; then
	EVTLS_ZSH_ENV=true
elif [[ "$SHELL" != *"bash"* ]]; then
	echo "Unknown shell ($SHELL), no Envtools..."
	return 0
fi

# Setting some constants available at load time
# and within all scripts and functions sourced here.
EVTLS_OS=$(uname)
EVTLS_SCRIPTPATH="$(
	cd -- "$(dirname "$0")" >/dev/null 2>&1 || return 1
	pwd -P
)"

# Create the runtime directory if it doesn't exist. This is where
# users can drop custom functions, aliases and exports to extend
# Envtools without modifying the dist files.
#
# Location is ~/.envtools and the expected files are:
# - ~/.envtools/custom/functions.sh
# - ~/.envtools/custom/aliases.sh
# - ~/.envtools/custom/exports.sh
#
# All files are optional, but the custom directory must exist for
# users to be able to drop their custom scripts there. If the
# directory doesn't exist, it will be created automatically.
#
# NOTE: EVTLS_RUNTIME_DIR is exported as an environment variable so
# it can be accessed in all custom scripts and functions.

export EVTLS_RUNTIME_DIR="${HOME}/.envtools"
if [ ! -d "${EVTLS_RUNTIME_DIR}" ]; then
	mkdir -p "${EVTLS_RUNTIME_DIR}"
fi

# Get current time in milliseconds. Use shell built-in $EPOCHREALTIME
# when available (zsh 5.1+, bash 5.0+) for zero-cost timing, otherwise
# fall back to perl which starts ~10x faster than python.
if [ -n "$EVTLS_ZSH_ENV" ]; then
	# cSpell:disable-next-line
	zmodload zsh/datetime 2>/dev/null
fi

__envtools_ms() {
	if [ -n "$EPOCHREALTIME" ]; then
		local secs="${EPOCHREALTIME%.*}"
		local frac="${EPOCHREALTIME#*.}000"
		printf '%s\n' "${secs}${frac%"${frac#???}"}"
	else
		perl -MTime::HiRes -e 'printf "%d\n", Time::HiRes::time()*1000'
	fi
}
EVTLS_START_TIME=$(__envtools_ms)

# Load the OS functions (isWindows, isMac, isLinux)
source "${EVTLS_SCRIPTPATH}/functions/os.sh"

if isWindows || isLinux || isMac; then
	# Load the version
	# shellcheck source=/dev/null
	source "${EVTLS_SCRIPTPATH}/../dist/version.sh"

	# Load default functions
	source "${EVTLS_SCRIPTPATH}/functions/base.sh"
	source "${EVTLS_SCRIPTPATH}/functions/logs.sh"
	source "${EVTLS_SCRIPTPATH}/functions/banner.sh"

	# Load default aliases
	source "${EVTLS_SCRIPTPATH}/aliases/base.sh"

	# Load default exports
	source "${EVTLS_SCRIPTPATH}/exports/base.sh"

	# Load custom functions/aliases/exports if they exist
	source "${EVTLS_SCRIPTPATH}/functions/custom.sh"

	# Calculate load time and display the welcome banner
	EVTLS_STOP_TIME=$(__envtools_ms)
	EVTLS_LOAD_TIME=$((EVTLS_STOP_TIME - EVTLS_START_TIME))
	printBanner "$EVTLS_LOAD_TIME"

	# Mark Envtools as loaded for *this* shell. Intentionally NOT exported, so
	# child shells (tmux panes, ssh sessions, sub-shells, ...) re-load instead
	# of inheriting this flag. See the early-return guard at the top of this
	# file for the full rationale.
	EVTLS_LOADED=true
else
	echo "OS not supported/recognized... ($EVTLS_OS)"
fi
