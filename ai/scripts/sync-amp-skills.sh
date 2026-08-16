#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
SOURCE_REF="${1:-HEAD}"
AMP_SKILLS_REPOSITORY="https://x-amp-user@ampcode.com/git/@stephendolan/-/skills"

if ! command -v amp >/dev/null 2>&1; then
    echo "Amp CLI is required to publish personal skills." >&2
    exit 1
fi

SKILLS_COMMIT="$(git -C "${REPO_DIR}" subtree split --quiet --prefix=ai/skills "${SOURCE_REF}")"

git -C "${REPO_DIR}" \
    -c credential.https://ampcode.com.helper='!amp git-credential-helper' \
    push "${AMP_SKILLS_REPOSITORY}" "${SKILLS_COMMIT}:refs/heads/main"
