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
# Returns true if a variable is defined (set) and value's length > 0
# returns false otherwise
# Example
#   if isValid "$MY_VAR"; then
#     echo "MY_VAR is set and not empty"
#   fi
#
function isValid {
	! [[ -z "$1" ]]
}

if isMac; then
	# shellcheck source=/dev/null
	source "${EVTLS_SCRIPTPATH}/functions/mac.sh"
fi
