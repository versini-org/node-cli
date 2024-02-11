#
# Test for OS types
#
function isWindows {
  local LOCAL_OS=$OS
  if [ "$LOCAL_OS" = "" ]; then
    LOCAL_OS=$(uname)
  fi
  [[ "$LOCAL_OS" = "MINGW32_NT-6.1" || "$LOCAL_OS" = "MINGW64_NT-6.1" || "$LOCAL_OS" = "MINGW64_NT-10.0" ]]
}
function isMac {
  local LOCAL_OS=$OS
  if [ "$LOCAL_OS" = "" ]; then
    LOCAL_OS=$(uname)
  fi
  [[ "$LOCAL_OS" = "Darwin" ]]
}
function isLinux {
  local LOCAL_OS=$OS
  if [ "$LOCAL_OS" = "" ]; then
    LOCAL_OS=$(uname)
  fi
  [[ "$LOCAL_OS" = "Linux" ]]
}
