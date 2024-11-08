# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

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
plugins=(git gitfast ssh-agent sudo bundler asdf zsh-autosuggestions zsh-syntax-highlighting you-should-use)
export YSU_MODE=BESTMATCH
zstyle :omz:plugins:ssh-agent agent-forwarding on
zstyle :omz:plugins:ssh-agent identities id_rsa

# Aliases
[[ -e $HOME/.aliases ]] && source $HOME/.aliases

# Load up specific configurations
for file in $HOME/.zsh/config/**/*; do
  source "$file"
done

# Load local machine settings
[[ -f $HOME/.zshrc.local ]] && source $HOME/.zshrc.local

# Load Oh My Zsh
source $ZSH/oh-my-zsh.sh

fpath+=('/opt/homebrew/share/zsh/site-functions')

# Use the Powerlevel10k prompt
# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
source /opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme
autoload -U promptinit; promptinit
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

# Load auto-suggestions
source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh

# Load fish-like syntax highlights
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

