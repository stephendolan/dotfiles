return {
  "folke/tokyonight.nvim",
  priority = 1000,
  config = function()
    require("tokyonight").setup({
      style = "moon",
      transparent = false,
      terminal_colors = true,
      styles = {
        sidebars = "dark",
        floats = "dark",
      },
    })
    vim.cmd([[colorscheme tokyonight]])
  end,
}
