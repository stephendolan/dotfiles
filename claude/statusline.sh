#!/bin/bash

# Claude Code statusline script
# Displays: project_name git_branch model_name (style)
# Colors: cyan for project, magenta for branch, yellow for dirty indicator, blue for model

input=$(cat)

# Extract values from JSON input
dir=$(echo "$input" | jq -r '.workspace.current_dir')
model=$(echo "$input" | jq -r '.model.display_name')
style=$(echo "$input" | jq -r '.output_style.name // "default"')

basename=$(basename "$dir")
git_info=""

# Check if directory is a git repository
if git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$dir" branch --show-current 2>/dev/null || echo "HEAD")
  status=$(git -C "$dir" status --porcelain 2>/dev/null)

  if [ -n "$status" ]; then
    # Dirty: show yellow bullet
    git_info=$(printf "\\033[1;35m%s\\033[0m \\033[1;33m●\\033[0m " "$branch")
  else
    # Clean: show green checkmark
    git_info=$(printf "\\033[1;35m%s\\033[0m \\033[1;32m✓\\033[0m " "$branch")
  fi
fi

# Print status line: project git_info model
printf "\\033[1;36m%s\\033[0m %s\\033[1;34m%s\\033[0m" "$basename" "$git_info" "$model"

# Add style indicator if not default
if [ "$style" != "default" ] && [ "$style" != "null" ]; then
  printf " \\033[1;33m(%s)\\033[0m" "$style"
fi
