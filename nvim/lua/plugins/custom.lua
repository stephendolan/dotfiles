-- Custom plugin configurations

return {
  -- Add any custom plugins or overrides here
  
  -- Override colorscheme
  {
    "folke/tokyonight.nvim",
    lazy = true,
    opts = { style = "moon" },
  },

  -- Make completion less intrusive but still functional
  {
    "saghen/blink.cmp",
    opts = {
      completion = {
        trigger = {
          show_in_snippet = false, -- Don't show completions while in snippets
        },
        menu = {
          auto_show = true, -- Show completions
          max_items = 5, -- Show fewer items
          auto_show_delay_ms = 250, -- Add small delay before showing
        },
        documentation = {
          auto_show = false, -- Don't auto-show large doc popups
        },
        ghost_text = {
          enabled = false, -- Disable to avoid conflicts with Copilot inline
        },
      },
      signature = {
        enabled = false, -- Disable signature popup (often redundant)
      },
      sources = {
        -- Only keep useful completion sources
        default = { "lsp", "path" }, -- Remove snippets, buffer, and copilot from dropdown
        providers = {
          buffer = {
            enabled = false, -- Disable random word suggestions from file
          },
          snippets = {
            enabled = false, -- Disable snippets entirely
          },
          copilot = {
            enabled = false, -- Keep copilot inline only, not in dropdown
          },
        },
      },
    },
  },

  -- Add Copilot status indicator
  {
    "zbirenbaum/copilot.lua",
    opts = {
      suggestion = {
        enabled = true,
        auto_trigger = true,
        keymap = {
          accept = "<Tab>",
          accept_word = "<C-Right>",
          accept_line = "<C-l>",
          next = "<C-]>",
          prev = "<C-[>",
          dismiss = "<C-e>",
        },
      },
      panel = {
        enabled = true,
        auto_refresh = false,
        keymap = {
          jump_prev = "<C-p>",
          jump_next = "<C-n>",
          accept = "<CR>",
          refresh = "gr",
          open = "<M-CR>",
        },
      },
    },
  },

  -- Enhance statusline to show Copilot status
  {
    "nvim-lualine/lualine.nvim",
    opts = function(_, opts)
      -- Add Copilot status to the statusline
      table.insert(opts.sections.lualine_x, 1, {
        function()
          local copilot_status = require("copilot.api").status.data.status
          if copilot_status == "InProgress" then
            return "󰚩 Thinking..." -- Loading icon
          elseif copilot_status == "Warning" then
            return "󰚩 Warning"
          elseif copilot_status == "Normal" then
            return "󰚩 Ready"
          else
            return "󰚩 Off"
          end
        end,
        color = function()
          local copilot_status = require("copilot.api").status.data.status
          if copilot_status == "InProgress" then
            return { fg = "#e7c547" } -- Yellow when thinking
          elseif copilot_status == "Warning" then
            return { fg = "#f7768e" } -- Red for warnings
          elseif copilot_status == "Normal" then
            return { fg = "#9ece6a" } -- Green when ready
          else
            return { fg = "#565f89" } -- Gray when off
          end
        end,
      })
      return opts
    end,
  },

  -- Example: Additional useful plugins
  {
    "folke/trouble.nvim",
    opts = {}, -- for default options, refer to the configuration section for custom setup.
    cmd = "Trouble",
    keys = {
      {
        "<leader>xx",
        "<cmd>Trouble diagnostics toggle<cr>",
        desc = "Diagnostics (Trouble)",
      },
      {
        "<leader>xX",
        "<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
        desc = "Buffer Diagnostics (Trouble)",
      },
      {
        "<leader>cs",
        "<cmd>Trouble symbols toggle focus=false<cr>",
        desc = "Symbols (Trouble)",
      },
      {
        "<leader>cl",
        "<cmd>Trouble lsp toggle focus=false win.position=right<cr>",
        desc = "LSP Definitions / references / ... (Trouble)",
      },
      {
        "<leader>xL",
        "<cmd>Trouble loclist toggle<cr>",
        desc = "Location List (Trouble)",
      },
      {
        "<leader>xQ",
        "<cmd>Trouble qflist toggle<cr>",
        desc = "Quickfix List (Trouble)",
      },
    },
  },
}