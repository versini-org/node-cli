export LANG=en_US.UTF-8
export EDITOR=vi

if [ "$EVTLS_INIT_PARAM" != "reload" ]; then
  export PATH=$PATH:/usr/sbin
fi

# Improve history search with up and down keys.
# Try typing ls
# and then up and down arrows... joy!
# (not binding when not interactive shell (scp for ex))
if [[ $- = *i* ]]; then
  if isBash; then
    bind '"\e[A":history-search-backward'
    bind '"\e[B":history-search-forward'
  elif isZsh; then
    autoload -U up-line-or-beginning-search
    autoload -U down-line-or-beginning-search
    zle -N up-line-or-beginning-search
    zle -N down-line-or-beginning-search
    zmodload zsh/terminfo
    bindkey "$terminfo[kcuu1]" up-line-or-beginning-search   # Up
    bindkey "$terminfo[kcud1]" down-line-or-beginning-search # Down
  fi
fi

if isMac; then
  source "${EVTLS_SCRIPTPATH}/exports/mac.sh"
fi
