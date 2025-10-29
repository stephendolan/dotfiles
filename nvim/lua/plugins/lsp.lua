return {
  {
    "williamboman/mason.nvim",
    config = true,
  },
  {
    "williamboman/mason-lspconfig.nvim",
    dependencies = { "williamboman/mason.nvim" },
    opts = {
      ensure_installed = {
        "lua_ls",
        "ts_ls",
        "ruby_lsp",
        "pyright",
        "rust_analyzer",
      },
      automatic_installation = true,
    },
  },
  {
    "neovim/nvim-lspconfig",
    dependencies = {
      "williamboman/mason.nvim",
      "williamboman/mason-lspconfig.nvim",
    },
    event = { "BufReadPre", "BufNewFile" },
    config = function()
      local on_attach = function(_, bufnr)
        local map = function(lhs, rhs)
          vim.keymap.set("n", lhs, rhs, { buffer = bufnr })
        end

        map("gD", vim.lsp.buf.declaration)
        map("gd", vim.lsp.buf.definition)
        map("K", vim.lsp.buf.hover)
        map("gi", vim.lsp.buf.implementation)
        map("<C-k>", vim.lsp.buf.signature_help)
        map("<leader>D", vim.lsp.buf.type_definition)
        map("<leader>rn", vim.lsp.buf.rename)
        map("<leader>ca", vim.lsp.buf.code_action)
        map("gr", vim.lsp.buf.references)
        map("<leader>f", function()
          vim.lsp.buf.format({ async = true })
        end)
      end

      local servers = {
        lua_ls = {
          settings = {
            Lua = {
              diagnostics = { globals = { "vim" } },
              workspace = {
                library = vim.api.nvim_get_runtime_file("", true),
                checkThirdParty = false,
              },
            },
          },
        },
        ts_ls = {},
        ruby_lsp = {},
        pyright = {},
        rust_analyzer = {},
      }

      for name, config in pairs(servers) do
        config.name = name
        config.on_attach = on_attach
        config.capabilities = vim.lsp.protocol.make_client_capabilities()
        vim.lsp.config[name] = config
        vim.lsp.enable(name)
      end
    end,
  },
}
