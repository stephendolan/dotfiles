#!/bin/bash

input=$(cat)

dir=$(echo "$input" | jq -r '.workspace.current_dir')
model=$(echo "$input" | jq -r '.model.display_name')
style=$(echo "$input" | jq -r '.output_style.name // "default"')

starship_dir=$(starship module directory --path "$dir" 2>/dev/null)
starship_git=$(cd "$dir" && starship module git_branch 2>/dev/null)
starship_status=$(cd "$dir" && starship module git_status 2>/dev/null)

# Context window bar graph
context_bar=""
percent=$(echo "$input" | jq -r '.context_window.used_percentage // empty | floor')

if [ -n "$percent" ]; then

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

# Claude.ai rate limits (new in Claude Code v2.1.80)
rate_limits=""
rate_5h=$(echo "$input" | jq -r '(.rate_limits | if type == "array" then .[0].used_percentage else .primary.used_percentage end) // empty | floor')
rate_7d=$(echo "$input" | jq -r '(.rate_limits | if type == "array" then .[1].used_percentage else .secondary.used_percentage end) // empty | floor')
spend_used=$(echo "$input" | jq -r '(.rate_limits | if type == "object" then .spend_limit.used_usd else null end) // empty')
spend_limit=$(echo "$input" | jq -r '(.rate_limits | if type == "object" then .spend_limit.limit_usd else null end) // empty')

if [ -n "$rate_5h" ] || [ -n "$rate_7d" ] || { [ -n "$spend_used" ] && [ -n "$spend_limit" ]; }; then
  rate_parts=()
  [ -n "$rate_5h" ] && rate_parts+=("5h:${rate_5h}%")
  [ -n "$rate_7d" ] && rate_parts+=("7d:${rate_7d}%")
  if [ -n "$spend_used" ] && [ -n "$spend_limit" ]; then
    printf -v spend 'spend:$%.2f/$%.2f' "$spend_used" "$spend_limit"
    rate_parts+=("$spend")
  fi
  rate_limits=$(printf " \\033[2m—\\033[0m \\033[1;35m%s\\033[0m" "${rate_parts[*]}")
fi

printf "%s %s%s\\033[1;34m%s\\033[0m" "$starship_dir" "$starship_git" "$starship_status" "$model"

if [ "$style" != "default" ] && [ "$style" != "null" ]; then
  printf " \\033[1;33m(%s)\\033[0m" "$style"
fi

if [ -n "$context_bar" ]; then
  printf " \\033[2m—\\033[0m%s" "$context_bar"
fi

if [ -n "$rate_limits" ]; then
  printf "%s" "$rate_limits"
fi
