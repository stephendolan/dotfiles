#!/bin/bash

if ! command -v opencode &> /dev/null; then
  exit 0
fi

if ! command -v npx &> /dev/null; then
  echo "npx not found, skipping oh-my-opencode plugin install"
  exit 0
fi

npx -y oh-my-opencode install --no-tui --claude=yes --chatgpt=no --gemini=no
