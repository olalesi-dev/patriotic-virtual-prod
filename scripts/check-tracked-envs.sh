#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

tracked_env_files="$(
  git ls-files \
    | grep -E '(^|/)\.env($|(\.[^/]+)$)' \
    | grep -vE '(^|/)\.env\.example$' \
    || true
)"

if [[ -n "${tracked_env_files}" ]]; then
  echo "Tracked env files are not allowed:"
  echo "${tracked_env_files}"
  exit 1
fi

echo "No tracked non-example .env files found."
