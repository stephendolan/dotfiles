# Path to your oh-my-zsh installation.
export ZSH=$HOME/.oh-my-zsh

# THEME
ZSH_THEME=""

# HISTORY
setopt hist_ignore_all_dups inc_append_history
HIST_STAMPS="yyyy-mm-dd"
HISTFILE=~/.zhistory
HISTSIZE=4096
SAVEHIST=4096
export ERL_AFLAGS="-kernel shell_history enabled"

# Awesome cd movements from zshkit
setopt auto_cd auto_pushd pushd_minus pushd_silent pushd_to_home cdable_vars
DIRSTACKSIZE=5

# Enable extended globbing
setopt extended_glob

# Allow [ or ] whereever you want
unsetopt no_match

# Smarter searches
HYPHEN_INSENSITIVE="true"

# Vim for all the things
export VISUAL=vim
export EDITOR=$VISUAL
export MANPAGER="nvim -c 'set ft=man' -"

# Add some plugins
plugins=(git gitfast ssh-agent sudo ripgrep bundler asdf fzf)
zstyle :omz:plugins:ssh-agent agent-forwarding on

# Aliases
[[ -e $HOME/.aliases ]] && source $HOME/.aliases

# Load up specific configurations
for file in $HOME/.zsh/config/**/*; do
  source "$file"
done

# Load local machine settings
[[ -f $HOME/.zshrc.local ]] && source $HOME/.zshrc.local

# Use the Pure prompt
autoload -U promptinit; promptinit
prompt pure

source $ZSH/oh-my-zsh.sh
