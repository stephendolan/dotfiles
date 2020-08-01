set nocompatible

" Set leader
let mapleader = ' '

function! s:SourceConfigFilesIn(directory)
  let directory_splat = '~/.config/nvim/' . a:directory . '/*'
  for config_file in split(glob(directory_splat), '\n')
    if filereadable(config_file)
      execute 'source' config_file
    endif
  endfor
endfunction

call plug#begin( '$HOME/.local/share/nvim/plugged' )
call s:SourceConfigFilesIn('vim_plugins')
call plug#end()

call s:SourceConfigFilesIn('vim_rc')

set t_Co=256                          " Allow vim to use 256 colors for colorschemes
set scrolloff=4                       " Keep X lines when scrolling
set formatoptions=tcqnj               " See :help fo-table for more information
set completeopt=noinsert,menuone,noselect,preview
set pastetoggle=<F6>                  " Toggle paste mode
set termguicolors                     " Enable true color terminal
set visualbell                        " Set visual bell
set foldnestmax=10                    " Deepest fold is 10 levels
set nofoldenable                      " Do not fold by default on file open
set noerrorbells                      " Don't make noise
set laststatus=2                      " Always show the status line
set incsearch                         " Search as you type
set hlsearch                          " Highlight as you type
set ruler                             " Show cursor position
set autoindent                        " Smart indenting
set lazyredraw                        " Redraw the screen lazily
set smarttab
set showmatch                         " Highlight pairs of {} [] ()
set ignorecase                        " Ignore case only when searching all lowercase
set smartcase
set showcmd                           " Show the commands being typed
set shortmess+=c                      " Suppress 'pattern not found' messages
set history=1000                      " Sets how many lines of history VIM has to remember
set backspace=indent,eol,start        " Make backspace more flexible
set background=dark                   " Set a dark background
set showmode                          " Show what mode you are in (Insert, Visual, etc.)
set modelines=4                       " Search for mode lines at bottom/top of file
set viminfo^=%                        " Remember info about open buffers on close
set relativenumber                    " Have nice numbers on the side of files
set number                            " Have current line number turned on
set cindent                           " Smart indenting
set expandtab                         " Smart tabbing
set tabstop=2                         " Set how many columns a tab counts for
set shiftwidth=2                      " How many columns to use with indent operators (>>, <<)
set shell=/bin/bash                   " Use bash as the shell, regardless of what launched vim

syntax enable

highlight VertSplit guibg=NONE
highlight NormalFloat guifg=#999999 guibg=#222222
hi Pmenu guibg=#222222 guifg=#999999

" Set up Neovim Python sources
let g:loaded_python_provider = 1 " Disable python 2 interface
let g:python_host_skip_check = 1 " Skip python 2 host check
let g:python3_host_prog = expand('~/.asdf/shims/python3')

" Ensure that Neovim will copy to system clipboard
set clipboard=unnamedplus

" Make the netrw file tree browser a bit prettier
let g:netrw_banner = 0
let g:netrw_liststyle = 3

function! AdjustWindowHeight(minheight, maxheight)
  exe max([min([line('$'), a:maxheight]), a:minheight]) . 'wincmd _'
endfunction

" Turn off F1 for help
map  <F1> <Esc>
imap <F1> <Esc>

" Toggle gutter junk with F4
noremap <F4> :set invnumber invrelativenumber<CR>
      \ :GitGutterToggle<CR>
      \ :ALEHover<CR>

" Persist undos across sessions
if has('persistent_undo')
  set undodir=~/.config/nvim/_undo/
  set undofile
endif

augroup custom
  " Add some custom filetypes
  au BufRead,BufNewFile *.prawn      set filetype=ruby
  au BufRead,BufNewFile *.vue        set filetype=vue
  au BufRead,BufNewFile *_spec.rb    set filetype=rspec.ruby
  au BufRead,BufNewFile Gemfile      set filetype=gemfile.ruby
  au BufRead,BufNewFile .applescript set filetype=applescript

  " Return to last edit position when opening files
  autocmd BufReadPost *
        \ if line("'\"") > 0 && line("'\"") <= line("$") |
        \   exe "normal! g`\"" |
        \ endif

  " Disable paste mode when leaving insert
  au InsertLeave * set nopaste

  " Automatically set quickfix window height
  au FileType qf call AdjustWindowHeight(3, 20)

  " Remove tabs and substitute for the correct number of spaces on write
  autocmd BufWritePre * :retab
augroup END

" Disable 'Entering Ex mode. Type 'visual' to go to Normal mode.'
map Q <Nop>

" Vim split navigation
nnoremap <C-J> <C-W><C-J>
nnoremap <C-K> <C-W><C-K>
nnoremap <C-L> <C-W><C-L>
nnoremap <C-H> <C-W><C-H>

" Tab navigation
nnoremap <leader>n :tabn<cr>
nnoremap <leader>p :tabp<cr>

" Remap stupid shift letters
command! Q q
command! W w
command! Wq wq

" PLUGIN CONFIG

" ALE
let g:ale_fix_on_save = 1
let g:ale_lint_on_text_changed = 'never'
let g:ale_linters_explicit = 1
let g:ale_linter_aliases = {'vue': ['vue', 'javascript']}
let g:ale_ruby_standardrb_executable = 'bundle'
let g:ale_linters = {
  \ 'vue':        ['eslint'],
  \ 'javascript': ['prettier'],
  \ 'typescript': ['prettier', 'eslint'],
  \ 'vim':        ['vint'],
  \ 'css':        ['prettier'],
  \ 'crystal':    ['ameba'],
  \ 'scss':       ['prettier'],
  \ 'yaml':       ['prettier'],
  \ 'markdown':   ['mdl'],
  \ 'ruby':       ['standardrb'],
  \ 'tex':        ['chktex', 'lacheck', 'latexindent'],
\ }
let g:ale_fixers_explicit = 1
let g:ale_fixers = {
  \ 'javascript': ['prettier'],
  \ 'typescript': ['prettier', 'eslint'],
  \ 'vue':        ['prettier'],
  \ 'css':        ['prettier'],
  \ 'scss':       ['prettier'],
  \ 'yaml':       ['prettier'],
  \ 'json':       ['prettier'],
  \ 'markdown':   ['prettier'],
  \ 'ruby':       ['standardrb'],
  \ 'tex':        ['latexindent'],
\ }
