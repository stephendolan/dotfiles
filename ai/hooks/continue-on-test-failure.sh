#!/usr/bin/env bash
set -euo pipefail

# Stop hook: Continue if tests failed, stop otherwise
# Exit 0 = stop, Exit 2 = continue with stdout as prompt

transcript=$(tail -c 50000)

# Test failure patterns by runner
patterns=(
  'examples?, [1-9][0-9]* failure'  # RSpec
  'Failures:'                        # RSpec summary
  '[1-9][0-9]* failing'              # Mocha/Jest
  'Tests:.*[1-9][0-9]* failed'       # Jest summary
  'FAIL  |✕'                         # Jest/Vitest markers
  'FAILED.*passed.*failed'           # pytest
  'FAILURES!'                        # pytest summary
  'npm ERR! Test failed'             # npm
  'error Command failed'             # yarn
  'AssertionError'                   # generic
)

for pattern in "${patterns[@]}"; do
  if grep -qE "$pattern" <<< "$transcript"; then
    echo "Tests are still failing. Please analyze the failures, fix the code, and run the tests again."
    exit 2
  fi
done || true
