-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua

-- Ensure asdf shims are available for Mason
vim.env.PATH = vim.env.HOME .. "/.asdf/shims:" .. vim.env.PATH

local opt = vim.opt

-- General
opt.clipboard = "unnamedplus" -- Sync with system clipboard
opt.mouse = "a" -- Enable mouse mode
opt.undofile = true
opt.undolevels = 10000

-- Appearance  
opt.termguicolors = true
opt.signcolumn = "yes"
opt.cmdheight = 0
opt.scrolloff = 8
opt.sidescrolloff = 8

-- Search
opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = false
opt.incsearch = true

-- Indentation
opt.expandtab = true
opt.shiftwidth = 2
opt.softtabstop = 2
opt.tabstop = 2
opt.smartindent = true

-- Line numbers
opt.number = true
opt.relativenumber = true

-- Splits
opt.splitbelow = true
opt.splitright = true

-- Performance
opt.updatetime = 250
opt.timeoutlen = 300

-- File handling
opt.confirm = true
opt.formatoptions = "jcroqlnt"
opt.grepformat = "%f:%l:%c:%m"
opt.grepprg = "rg --vimgrep"

-- Spelling
opt.spelllang = { "en" }
opt.spelloptions:append("noplainbuffer")