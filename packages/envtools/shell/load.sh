#!/bin/bash

# If not VSCode, or already loaded and it's not a manual
# reload, get out of here quietly...
if [ "$EVTLS_INIT_PARAM" != "reload" ] && [ "$EVTLS_RUNTIME_DIR" != "" ]; then
	if [ "$VSCODE_CLI" = "" ] && [ "$VSC_TERMINAL" = "" ]; then
		exit 0
	fi
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
else
	echo "OS not supported/recognized... ($EVTLS_OS)"
fi
