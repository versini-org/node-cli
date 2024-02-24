#
# returns 0 if the user confirmed yes, 1 otherwise
# $1 optional prompt, default to "Continue? "
# $2 optional default, "yes" or "no" - no default
#
function confirm() {
  local default=""
  local prompt="Continue?"

  if isValid "$1"; then
    prompt=$1
  fi

  case "$2" in
  [nN][oO] | [nN])
    default="no"
    prompt="$prompt [yes|No] "
    ;;
  [yY][eE][sS] | [yY])
    default="yes"
    prompt="$prompt [Yes|no] "
    ;;
  *)
    prompt="$prompt [yes|no] "
    ;;
  esac

  while true; do
    if isZsh; then
      read resp\?"$prompt"
    else
      txtBoldWhite "$prompt"
      read resp
    fi

    case "$resp" in
    [nN][oO] | [nN])
      return 1
      ;;
    [yY][eE][sS] | [yY])
      return 0
      ;;
    "")
      # it's empty, user just pressed enter
      if [ "$default" = "no" ]; then
        return 1
      elif [ "$default" = "yes" ]; then
        return 0
      else
        txtRed "Yes or no?" "nl"
      fi
      ;;
    *)
      txtRed "Yes or no?" "nl"
      ;;
    esac
  done
}
