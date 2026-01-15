return {
  "lewis6991/gitsigns.nvim",
  event = { "BufReadPre", "BufNewFile" },
  config = function()
    local gs = require("gitsigns")

    local function navigate_hunk(direction)
      return function()
        if vim.wo.diff then
          return direction
        end
        vim.schedule(function()
          gs[direction == "]c" and "next_hunk" or "prev_hunk"]()
        end)
        return "<Ignore>"
      end
    end

    gs.setup({
      signs = {
        add = { text = "+" },
        change = { text = "~" },
        delete = { text = "_" },
        topdelete = { text = "‾" },
        changedelete = { text = "~" },
      },
      on_attach = function(bufnr)
        local map = function(mode, lhs, rhs, opts)
          opts = vim.tbl_extend("force", { buffer = bufnr }, opts or {})
          vim.keymap.set(mode, lhs, rhs, opts)
        end

        map("n", "]c", navigate_hunk("]c"), { expr = true, desc = "Next hunk" })
        map("n", "[c", navigate_hunk("[c"), { expr = true, desc = "Previous hunk" })
        map("n", "<leader>gb", gs.blame_line, { desc = "Blame line" })
        map("n", "<leader>gd", gs.diffthis, { desc = "Diff this" })
        map("n", "<leader>gp", gs.preview_hunk, { desc = "Preview hunk" })
      end,
    })
  end,
}
