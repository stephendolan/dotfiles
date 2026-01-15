vim.env.PATH = vim.env.HOME .. "/.asdf/shims:" .. vim.env.PATH

local opt = vim.opt

opt.clipboard = "unnamedplus"
opt.mouse = "a"
opt.undofile = true
opt.undolevels = 10000

opt.termguicolors = true
opt.signcolumn = "yes"
opt.cmdheight = 0
opt.scrolloff = 8
opt.sidescrolloff = 8

opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = false
opt.incsearch = true

opt.expandtab = true
opt.shiftwidth = 2
opt.softtabstop = 2
opt.tabstop = 2
opt.smartindent = true

opt.number = true
opt.relativenumber = true

opt.splitbelow = true
opt.splitright = true

opt.updatetime = 250
opt.timeoutlen = 300

opt.confirm = true
opt.formatoptions = "jcroqlnt"
opt.grepformat = "%f:%l:%c:%m"
opt.grepprg = "rg --vimgrep"

opt.spelllang = { "en" }
opt.spelloptions:append("noplainbuffer")