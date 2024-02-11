# GLOBAL DEFINITIONS
EVTLS_GLOBAL_LOG_VERBOSE=true
EVTLS_GLOBAL_ERROR_MSG=""
EVTLS_GLOBAL_CONTINUE=true

# Color definitions to be used in anything else than
# prompt command
EVTLS_RAW_COLOR_RED="\e[0;31m"
EVTLS_RAW_COLOR_BLUE="\e[0;34m"
if isWindows; then
  EVTLS_RAW_COLOR_BLUE="\e[0;36m"
fi
EVTLS_RAW_COLOR_GREEN="\e[0;32m"
EVTLS_RAW_COLOR_YELLOW="\e[0;33m"
EVTLS_RAW_COLOR_MAGENTA="\e[0;35m"
EVTLS_RAW_COLOR_CYAN="\e[0;36m"
EVTLS_RAW_COLOR_GRAY="\e[0;90m"

EVTLS_RAW_COLOR_B_RED="\e[1;31m"
EVTLS_RAW_COLOR_B_BLUE="\e[1;34m"
EVTLS_RAW_COLOR_B_GREEN="\e[1;32m"
EVTLS_RAW_COLOR_B_YELLOW="\e[1;33m"
EVTLS_RAW_COLOR_B_MAGENTA="\e[1;35m"
EVTLS_RAW_COLOR_B_CYAN="\e[1;36m"
EVTLS_RAW_COLOR_B_GRAY="\e[1;90m"
EVTLS_RAW_COLOR_B_WHITE="\e[1;97m"

EVTLS_RAW_COLOR_DEFAULT="\e[00m"

#
# returns 0 if the global variable EVTLS_GLOBAL_LOG_VERBOSE
# is true or unset return 1 otherwise
#
function shouldLog {
  if isValid $EVTLS_GLOBAL_LOG_VERBOSE; then
    if $EVTLS_GLOBAL_LOG_VERBOSE = true; then
      return 0
    else
      return 1
    fi
  else
    return 0
  fi
}

# functions to change prompt text color
function txtRed {
  txtColor "$EVTLS_RAW_COLOR_RED" "$@"
}
function txtBlue {
  txtColor "$EVTLS_RAW_COLOR_BLUE" "$@"
}
function txtGreen {
  txtColor "$EVTLS_RAW_COLOR_GREEN" "$@"
}
function txtYellow {
  txtColor "$EVTLS_RAW_COLOR_YELLOW" "$@"
}
function txtMagenta {
  txtColor "$EVTLS_RAW_COLOR_MAGENTA" "$@"
}
function txtCyan {
  txtColor "$EVTLS_RAW_COLOR_CYAN" "$@"
}
function txtDefault {
  txtColor "$EVTLS_RAW_COLOR_DEFAULT" "$@"
}

function txtBoldRed {
  txtColor "$EVTLS_RAW_COLOR_B_RED" "$@"
}
function txtBoldBlue {
  txtColor "$EVTLS_RAW_COLOR_B_BLUE" "$@"
}
function txtBoldGreen {
  txtColor "$EVTLS_RAW_COLOR_B_GREEN" "$@"
}
function txtBoldYellow {
  txtColor "$EVTLS_RAW_COLOR_B_YELLOW" "$@"
}
function txtBoldMagenta {
  txtColor "$EVTLS_RAW_COLOR_B_MAGENTA" "$@"
}
function txtBoldCyan {
  txtColor "$EVTLS_RAW_COLOR_B_CYAN" "$@"
}
function txtBoldWhite {
  txtColor "$EVTLS_RAW_COLOR_B_WHITE" "$@"
}

function txtColor {
  if shouldLog; then
    printf "$1%s$EVTLS_RAW_COLOR_DEFAULT" "$2"
    if [ $# -eq 3 ] && [ "$3" = "nl" ]; then
      echo
    fi
  fi
}

