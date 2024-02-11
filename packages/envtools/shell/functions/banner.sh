#
# Call this function to display a welcome banner
#
function printBanner {
  if [ -f "${EVTLS_RUNTIME_DIR}/envtools-banner" ]; then
    if [ "$ATOM_TERMINAL" = "" ] || [ "$VSCODE_CLI" = "" ]; then
      if [ "$EVTLS_INIT_PARAM" != "reload" ]; then
        local HEADER="┌─────────────────────────────────────┐"
        local FOOTER="└─────────────────────────────────────┘"
        local SEP="│"
        local MAX_STRING="$HEADER"
        local MAX_SIZE=${#MAX_STRING}

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

        if [ "$EVTLS_VERSION" != "" ]; then
          local VERSION_STRING="v${EVTLS_VERSION}"
          local VERSION_SIZE=${#VERSION_STRING}
          local PADDING=$(($MAX_SIZE - $VERSION_SIZE - 3))

          txtCyan "$SEP                                     $SEP" "nl"
          txtCyan "$SEP"
          printf %${PADDING}s | tr " " " "
          txtDefault "$VERSION_STRING "
          txtCyan "$SEP" "nl"
        else
          txtCyan "$SEP                                     $SEP" "nl"
        fi
        txtCyan "$FOOTER" "nl"
      fi
    fi
  fi
}
