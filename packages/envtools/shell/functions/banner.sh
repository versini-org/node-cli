#
# Call this function to display a welcome banner
# $1 - load time in milliseconds (optional)
#
function printBanner {
	if [ "$ATOM_TERMINAL" = "" ] || [ "$VSCODE_CLI" = "" ]; then
		if [ "$EVTLS_INIT_PARAM" != "reload" ]; then
			local HEADER="┌─────────────────────────────────────┐"
			local FOOTER="└─────────────────────────────────────┘"
			local SEP="│"
			local INNER_WIDTH=37

			txtCyan "$HEADER" "nl"
			txtCyan "$SEP"
			if isMac; then
				txtDefault "       "
				txtRed "★"
				txtDefault " Welcome to Envtools "
				txtRed "★"
				txtDefault "       "
			else
				txtDefault "         Welcome to Envtools         "
			fi
			txtCyan "$SEP" "nl"

			txtCyan "$SEP                                     $SEP" "nl"

			# Bottom info line: version left, load time right
			local LEFT=""
			local RIGHT=""
			if [ -n "$EVTLS_VERSION" ]; then
				LEFT=" v${EVTLS_VERSION}"
			fi
			if [ -n "$1" ]; then
				RIGHT="Load: ${1}ms "
			fi

			if [ -n "$LEFT" ] || [ -n "$RIGHT" ]; then
				local PAD=$((INNER_WIDTH - ${#LEFT} - ${#RIGHT}))
				txtCyan "$SEP"
				txtDefault "$LEFT"
				printf "%${PAD}s" ""
				txtDefault "$RIGHT"
				txtCyan "$SEP" "nl"
			else
				txtCyan "$SEP                                     $SEP" "nl"
			fi

			txtCyan "$FOOTER" "nl"
		fi
	fi
}
