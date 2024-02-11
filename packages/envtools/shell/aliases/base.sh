# ls and all its variant
alias l=ls
alias ll='ls -lo'
alias la='ls -lrtd .?*'
alias lt='ls -lt'
alias lrt='ls -lrt'
alias ld='ls -ld */'

# request confirmation before removing a file
alias rm='rm -i'

# dyslexia anyone?
alias maek='make'
alias grpe='grep'

# misc shortcuts
alias sudo='sudo -E'
alias sds='sudo su -'
alias tailf='tail -f'
alias grep='grep --color'

# vim as default editor
if [ -f /usr/local/bin/vim -o -f /usr/bin/vim ]; then
  alias vi=vim
fi

# sort environment aliases output
alias env='env | sort'

# Shortcut to some default paths
alias desk='cd $HOME/Desktop; tit "~/Desktop"'
alias down='cd $HOME/Downloads; tit "~/Downloads"'
alias dow='down'

if isMac; then
  source "${EVTLS_SCRIPTPATH}/aliases/mac.sh"
fi

if isLinux; then
  source "${EVTLS_SCRIPTPATH}/aliases/linux.sh"
fi
