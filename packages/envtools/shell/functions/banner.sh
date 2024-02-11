#
# Call this function to display a welcome banner
#
function printBanner {
  if [ "$ATOM_TERMINAL" = "" ] || [ "$VSCODE_CLI" = "" ]; then
    if [ "$EVTLS_INIT_PARAM" != "reload" ]; then
      local HEADER="┌─────────────────────────────────────┐"
      local MAX_STRING="$HEADER"
      local MAX_SIZE=${#MAX_STRING}
      # echo "MAX_SIZE: $MAX_SIZE"

      if [ -f "${EVTLS_RUNTIME_DIR}/envtools-banner" ]; then
        txtCyan "$HEADER" "nl"
        txtCyan "│"
        if isMac; then
          txtDefault "       "
          txtRed "★"
          txtDefault " Welcome to Envtools "
          txtRed "★"
          txtDefault "       "
        else
          txtDefault "         Welcome to Envtools         "
        fi
        txtCyan "│" "nl"

        if [ "$EVTLS_VERSION" != "" ]; then
          local VERSION_STRING="v${EVTLS_VERSION}"
          local VERSION_SIZE=${#VERSION_STRING}
          local PADDING=$(($MAX_SIZE - $VERSION_SIZE - 3))
          # echo "VERSION_SIZE: $VERSION_SIZE"
          # echo "PADDING: $PADDING"

          txtCyan "│                                     │" "nl"
          txtCyan "│"
          printf %${PADDING}s |tr " " " "
          txtDefault "$VERSION_STRING "
          txtCyan "│" "nl"
        else
          txtCyan "│                                     │" "nl"
        fi

        txtCyan "└─────────────────────────────────────┘" "nl"
      fi
    fi
  fi
}
