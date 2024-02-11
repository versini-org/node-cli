function openInFinder {
  if isValid $1; then
    open -a Finder "$1"
  else
    open -a Finder
  fi
}
