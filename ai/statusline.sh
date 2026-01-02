#!/bin/bash

input=$(cat)

dir=$(echo "$input" | jq -r '.workspace.current_dir')
model=$(echo "$input" | jq -r '.model.display_name')
style=$(echo "$input" | jq -r '.output_style.name // "default"')

basename=$(basename "$dir")
git_info=""

if git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git -C "$dir" branch --show-current 2>/dev/null || echo "HEAD")
  status=$(git -C "$dir" status --porcelain 2>/dev/null)

  if [ -n "$status" ]; then
    git_info=$(printf "\\033[1;35m%s\\033[0m \\033[1;33m●\\033[0m " "$branch")
  else
    git_info=$(printf "\\033[1;35m%s\\033[0m \\033[1;32m✓\\033[0m " "$branch")
  fi
fi

# Context window bar graph
context_bar=""
context_size=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
current_usage=$(echo "$input" | jq '.context_window.current_usage')

if [ "$current_usage" != "null" ]; then
  total_tokens=$(echo "$current_usage" | jq '.input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens')
  percent=$((total_tokens * 100 / context_size))

  # Build bar graph (8 chars wide)
  bar_width=8
  filled=$((percent * bar_width / 100))
  [ $filled -gt $bar_width ] && filled=$bar_width

  # Color based on usage: green < 50%, yellow 50-80%, red > 80%
  if [ $percent -lt 50 ]; then
    color="32"  # green
  elif [ $percent -lt 80 ]; then
    color="33"  # yellow
  else
    color="31"  # red
  fi

  bar=""
  for ((i=0; i<bar_width; i++)); do
    if [ $i -lt $filled ]; then
      bar+="█"
    else
      bar+="░"
    fi
  done

  context_bar=$(printf " \\033[1;${color}m%s\\033[0m \\033[2m%d%%\\033[0m" "$bar" "$percent")
fi

printf "\\033[1;36m%s\\033[0m %s\\033[1;34m%s\\033[0m" "$basename" "$git_info" "$model"

if [ "$style" != "default" ] && [ "$style" != "null" ]; then
  printf " \\033[1;33m(%s)\\033[0m" "$style"
fi

if [ -n "$context_bar" ]; then
  printf " \\033[2m—\\033[0m%s" "$context_bar"
fi
