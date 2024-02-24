#
# Test for shell types
#
function isBash {
  [[ "$SHELL" = *"bash"* ]]
}
function isZsh {
  [[ "$SHELL" = *"zsh"* ]]
}

#
# returns true if a variable is defined (set) and value's length > 0
# returns false otherwise
#
function isValid {
  ! [[ -z "$1" ]]
}

if isMac; then
  source "${EVTLS_SCRIPTPATH}/functions/mac.sh"
fi
