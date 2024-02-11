#!/bin/sh

# If not VSCode, or already loaded and it's not a manual
# reload, get out of here quietly...
if [ "$EVTLS_INIT_PARAM" != "reload" ] && [ "$EVTLS_RUNTIME_DIR" != "" ]; then
  if [ "$VSCODE_CLI" = "" ] && [ "$VSC_TERMINAL" = "" ]; then
    exit 0
  fi
fi

# Envtools only works in bash or zsh
if [[ "$SHELL" = *"bash"* ]]; then
  EVTLS_BASH_ENV=true
elif [[ "$SHELL" = *"zsh"* ]]; then
  EVTLS_ZSH_ENV=true
else
  echo "Unknown shell ($SHELL), no Envtools..."
  exit 1
fi

# Setting some constants available at load time
# and within all scripts and functions sourced here.
EVTLS_OS=$(uname)
EVTLS_SCRIPTPATH="$(
  cd -- "$(dirname "$0")" >/dev/null 2>&1
  pwd -P
)"
export EVTLS_RUNTIME_DIR="${HOME}/.envtools"
if [ ! -d "${EVTLS_RUNTIME_DIR}" ]; then
  mkdir -p "${EVTLS_RUNTIME_DIR}"
  touch "${EVTLS_RUNTIME_DIR}/envtools-banner"
fi
EVTLS_RUNTIME_BIN_DIR="${HOME}/.envtools/bin"
EVTLS_CUSTOM_ENVDIR="${EVTLS_RUNTIME_DIR}/custom"
EVTLS_DIST_DIR="${EVTLS_SCRIPTPATH}/../dist"

if [ -f "${EVTLS_RUNTIME_DIR}/envtools-timing" ]; then
  EVTLS_START_TIME=$(/usr/bin/python3 -c "import time; print(int(round(time.time() * 1000)))")
fi

# Load the OS functions (isWindows, isMac, isLinux)
source "${EVTLS_SCRIPTPATH}/functions/os.sh"

if isWindows || isLinux || isMac; then
  # Load the version and default functions
  source "${EVTLS_DIST_DIR}/version.sh"
  source "${EVTLS_SCRIPTPATH}/functions/base.sh"
  source "${EVTLS_SCRIPTPATH}/functions/logs.sh"
  source "${EVTLS_SCRIPTPATH}/functions/banner.sh"

  # Load default aliases
  source "${EVTLS_SCRIPTPATH}/aliases/base.sh"

  # Load default exports
  source "${EVTLS_SCRIPTPATH}/exports/base.sh"

  # Load custom functions
  if [ -f "${EVTLS_RUNTIME_DIR}/custom/functions.sh" ]; then
    source "${EVTLS_RUNTIME_DIR}/custom/functions.sh"
  fi
  # Load custom aliases
  if [ -f "${EVTLS_RUNTIME_DIR}/custom/aliases.sh" ]; then
    source "${EVTLS_RUNTIME_DIR}/custom/aliases.sh"
  fi
  # Load custom exports
  if [ -f "${EVTLS_RUNTIME_DIR}/custom/exports.sh" ]; then
    source "${EVTLS_RUNTIME_DIR}/custom/exports.sh"
  fi

  # Print the welcome banner
  printBanner
else
  echo "OS not supported/recognized... ($EVTLS_OS)"
fi

if [ -f "${EVTLS_RUNTIME_DIR}/envtools-timing" ]; then
  EVTLS_STOP_TIME=$(/usr/bin/python3 -c "import time; print(int(round(time.time() * 1000)))")
  export EVTLS_LOAD_TIME=$(($EVTLS_STOP_TIME - $EVTLS_START_TIME))
  echo "Envtools loaded in ${EVTLS_LOAD_TIME}ms"
fi
