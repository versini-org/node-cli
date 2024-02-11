# Extend the max # of open files per terminal session
ulimit -n 7168 >/dev/null 2>&1

# Java
if [ -f "/usr/libexec/java_home" ]; then
  if [ "$JAVA_HOME" = "" ]; then
    export JAVA_HOME="$(/usr/libexec/java_home 2>/dev/null)"
  fi
fi

# Brew, node
if [ "$EVTLS_INIT_PARAM" != "reload" ]; then
  export PATH=$PATH:/usr/local/bin
fi

# Araxis
export ARAXIS_CLI="${EVTLS_SCRIPTPATH}/third/compare"
