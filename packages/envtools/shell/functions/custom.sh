# shellcheck source=/dev/null
if [ -f "${EVTLS_RUNTIME_DIR}/custom/functions.sh" ]; then
	source "${EVTLS_RUNTIME_DIR}/custom/functions.sh"
fi

# Load custom aliases
if [ -f "${EVTLS_RUNTIME_DIR}/custom/aliases.sh" ]; then
	# shellcheck source=/dev/null
	source "${EVTLS_RUNTIME_DIR}/custom/aliases.sh"
fi

# Load custom exports
if [ -f "${EVTLS_RUNTIME_DIR}/custom/exports.sh" ]; then
	# shellcheck source=/dev/null
	source "${EVTLS_RUNTIME_DIR}/custom/exports.sh"
fi
