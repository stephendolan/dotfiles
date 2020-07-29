call plug#begin( '$HOME/.local/share/nvim/plugged' )

function! DoRemote(arg)
  UpdateRemotePlugins
endfunction

" GENERAL PLUGINS
Plug 'airblade/vim-gitgutter'          " Show Git statuses in left gutter
Plug 'christoomey/vim-tmux-navigator'  " Make vim and Tmux navigation consistent
Plug 'christoomey/vim-tmux-runner'     " Run commands in Tmux splits
Plug 'EinfachToll/DidYouMean'          " Open multiple matching files intelligently
Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'junegunn/fzf.vim'                " Add FZF vim stuff
Plug 'junegunn/vim-easy-align'         " Make alignment easy
Plug 'ntpeters/vim-better-whitespace'  " Better whitespace
Plug 'tpope/vim-commentary'            " Make commenting easier
Plug 'tpope/vim-endwise'               " Ruby / Vimscript Smart Endings
Plug 'tpope/vim-fugitive'              " Git
Plug 'tpope/vim-repeat'                " Allow more repeats
Plug 'tpope/vim-surround'              " Change surrounding characters
Plug 'tpope/vim-abolish'               " Advanced subsitution functionality
Plug 'morhetz/gruvbox'                 " Nice dark colorscheme
Plug 'itchyny/lightline.vim'           " Simple status bar
Plug 'shinchu/lightline-gruvbox.vim'   " Add gruvbox to lightling
Plug 'w0rp/ale'                        " Asynchronous linting/fixing
Plug 'preservim/nerdtree'              " Pretty file explorer

" Auto-completion and Snippets
Plug 'ncm2/ncm2'
Plug 'roxma/nvim-yarp'
Plug 'ncm2/ncm2-ultisnips'
Plug 'SirVer/ultisnips'
Plug 'ncm2/ncm2-bufword'

" LANGUAGE-SPECIFIC PLUGINS
Plug 'sheerun/vim-polyglot'
Plug 'alexbel/vim-rubygems',         { 'for': 'gemfile.ruby' }                   " Gemfile helpers
Plug 'mattn/webapi-vim',             { 'for': 'gemfile.ruby' }                   " Required for Vim-Rubygems
Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app & yarn install'  }          " Preview Markdown
Plug 'HerringtonDarkholme/yats.vim'
Plug 'mhartington/nvim-typescript',  { 'do': './install.sh' }
Plug 'tpope/vim-bundler',            { 'for': ['gemfile.ruby', 'ruby'] }         " Helpers for ruby Gemfiles
Plug 'vim-syntastic/syntastic',      { 'for': 'crystal' }                        " Crystal linting/fixing support, since Ale doesn't
Plug 'vim-crystal/vim-crystal',      { 'for': 'crystal' }                        " Crystal syntax and helpers
Plug 'donRaphaco/neotex',            { 'for': 'tex' }
Plug 'mattn/emmet-vim',              { 'for': ['html', 'eruby', 'vue' , 'css'] } " HTML autocompletion
Plug 'alvan/vim-closetag',           { 'for': ['html', 'eruby', 'vue'] }         " HTML tag autoclose
Plug 'tpope/vim-rails'                                                      " File identification and Rails helpers

call plug#end()

" END PLUGINS

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

" Use semicolon for commands in visual/normal mode
nnoremap ; :
vnoremap ; :

" Toggle gutter junk with F4
noremap <F4> :set invnumber invrelativenumber<CR>
      \ :GitGutterToggle<CR>
      \ :ALEHover<CR>

" Set leader
let mapleader = ' '
let localleader = '\\'

" Persist undos across sessions
if has('persistent_undo')
  set undodir=~/.config/nvim/_undo/
  set undofile
endif

augroup custom
  " Set the theme
  autocmd vimenter * colorscheme gruvbox

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

" Wrapper function for deleting whitespace while saving cursor position
function! Delete_whitespace()
  let save_pos = getpos('.')
  :StripWhitespace
  call setpos('.', save_pos)
endfunction

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

augroup custom_plugins
  " Autocomplete & UltiSnips
  autocmd BufEnter * call ncm2#enable_for_buffer()

  " Press enter key to trigger expansion
  autocmd BufNewFile,BufRead * inoremap <silent> <buffer> <expr> <cr> ncm2_ultisnips#expand_or("\<CR>", 'n')

  " Remove bad whitespace on write
  autocmd BufWritePre * call Delete_whitespace()

  " Auto-start NerdTree if no files are specified
  autocmd StdinReadPre * let s:std_in=1
  autocmd VimEnter * if argc() == 0 && !exists("s:std_in") | NERDTree | endif

  " Auto-start NerdTree if a directory is specified
  autocmd StdinReadPre * let s:std_in=1
  autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists("s:std_in") | exe 'NERDTree' argv()[0] | wincmd p | ene | exe 'cd '.argv()[0] | endif

  " Close NERDTree if it's the only window left
  autocmd BufEnter * if (winnr("$") == 1 && exists("b:NERDTree") && b:NERDTree.isTabTree()) | q | endif

  " Sync NERDTree with current file
  autocmd BufEnter * silent! call s:syncTree()
augroup END

" NERDTree
map <leader>t :NERDTreeToggle<CR>

" Check if NERDTree is open
function! s:isNERDTreeOpen()
  return exists('t:NERDTreeBufName') && (bufwinnr(t:NERDTreeBufName) != -1)
endfunction

" Sync NerdTree with currently open file
" Exclude diff files and NERDTree files
function! s:syncTree()
  if &modifiable && s:isNERDTreeOpen() && strlen(expand('%')) > 0 && !&diff && bufname('%') !~# 'NERD_tree'
    try
      NERDTree
      wincmd p
      NERDTreeFind
      if bufname('%') =~# 'NERD_tree'
        setlocal cursorline
        wincmd p
      endif
    endtry
  endif
endfunction

" LightLine
let g:lightline = {
  \ 'colorscheme': 'gruvbox',
  \ 'active': {
  \   'left': [ [ 'mode', 'paste' ],
  \             [ 'gitbranch', 'readonly', 'filename', 'modified' ] ],
  \   'right': [ [ 'lineinfo' ],
  \              [ 'percent' ],
  \              [ 'fileformat', 'fileencoding', 'filetype', 'charvaluehex' ] ]
  \ },
  \ 'component_function': {
  \   'gitbranch': 'FugitiveHead'
  \ },
\ }

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
\ }

" CTRL-C doesn't trigger the InsertLeave autocmd . map to <ESC> instead.
inoremap <c-c> <ESC>

" When the <Enter> key is pressed while the popup menu is visible, it only
" hides the menu. Use this mapping to close the menu and also start a new line.
inoremap <expr> <CR> (pumvisible() ? "\<c-y>\<cr>" : "\<CR>")

" Use <TAB> to select the popup menu:
inoremap <expr> <Tab> pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"

let g:UltiSnipsUsePythonVersion         = 3
let g:UltiSnipsSnippetDirectories       = [$HOME . '/.config/nvim/UltiSnips']
let g:UltiSnipsExpandTrigger            = '<Plug>(ultisnips_expand)'
let g:UltiSnipsJumpForwardTrigger       = '<c-k>'
let g:UltiSnipsJumpBackwardTrigger      = '<c-j>'
let g:UltiSnipsEditSplit                = 'tabdo'
let g:UltiSnipsRemoveSelectModeMappings = 0
nnoremap <leader>ue :UltiSnipsEdit <CR>

" GitGutter
let g:gitgutter_grep = 'rg'

" Vim JSON
let g:vim_json_syntax_conceal = 0

" Vim RubyGems
nnoremap <leader><leader>g :RubygemsAppendVersion<cr>

" Markdown Preview
nnoremap <leader><leader>mp :MarkdownPreview<cr>

" Vim RSpec
let g:rspec_command = "call VtrSendCommand('rspec {spec}', 1)"
nnoremap <leader>vr :call RunCurrentSpecFile()<cr>
nnoremap <leader>vn :call RunNearestSpec()<cr>
nnoremap <leader>vc :VtrOpenRunner<cr>:call VtrSendCommand('bundle exec rails console')<cr>

" Vim Tmux Runner
nnoremap <leader>va :VtrAttachToPane<cr>
nnoremap <leader>vo :VtrOpenRunner<cr>
nnoremap <leader>vf :VtrFocusRunner<cr>
nnoremap <leader>vk :VtrKillRunner<cr>
nnoremap <leader>vs :VtrSendLinesToRunner<cr>
nnoremap <leader>vd :VtrSendCtrlD<cr>

" Vim Easy Align
vmap <Enter> <Plug>(EasyAlign)

" Git Gutter
set updatetime=100

" Vim Crystal, for some reason not working at the moment
let g:crystal_auto_format = 1

" FZF
let $BAT_THEME = 'TwoDark'
command! -bang -nargs=* Rg
      \ call fzf#vim#grep('rg --column --no-heading --line-number --color=always '.shellescape(<q-args>),
      \ 1,
      \ fzf#vim#with_preview({'options': ['--color', $FZF_COLORS]}),
      \ <bang>0)

command! -bang -nargs=? -complete=dir Files
      \ call fzf#vim#files(<q-args>,
      \ fzf#vim#with_preview({'options': ['--color', $FZF_COLORS]}),
      \ <bang>0)

nnoremap <silent> <expr> <leader>f (expand('%') =~ 'NERD_tree' ? "\<c-w>\<c-w>" : '').":GFiles\<CR>"
nnoremap <silent> <expr> <leader>r (expand('%') =~ 'NERD_tree' ? "\<c-w>\<c-w>" : '').":Rg\<CR>"
nnoremap <silent> <expr> <leader>h (expand('%') =~ 'NERD_tree' ? "\<c-w>\<c-w>" : '').":History\<CR>"
nnoremap <silent> <expr> <leader>l (expand('%') =~ 'NERD_tree' ? "\<c-w>\<c-w>" : '').":Lines\<CR>"
let g:fzf_action = { 'return': 'e', 'ctrl-t': 'tabe' }

" NeoTex
let g:neotex_enabled = 2

" Crystal
let g:crystal_define_mappings = 0
