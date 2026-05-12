#!/usr/bin/env bash
set -euo pipefail

readarray -t history_refs < <(
  git for-each-ref --format='%(refname)' refs/heads refs/remotes refs/tags
)

readarray -t tracked_env_paths < <(
  {
    git ls-files
    if (( ${#history_refs[@]} > 0 )); then
      git log "${history_refs[@]}" --name-only --pretty=format:
    fi
  } \
    | grep -E '(^|/)\.env($|(\.[^/]+)$)' \
    | grep -vE '(^|/)\.env\.example$' \
    | sed '/^$/d' \
    | sort -u
)

failures=0

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

echo "Verifying env cleanup across current index and Git history"
echo

if bash ./scripts/check-tracked-envs.sh > /tmp/verify-env-history-index.txt 2>&1; then
  pass "Current index contains no tracked non-example env files"
else
  fail "Current index still contains tracked non-example env files"
  cat /tmp/verify-env-history-index.txt
fi

if (( ${#tracked_env_paths[@]} == 0 )); then
  pass "Git history contains no tracked non-example env files"
fi

for path in "${tracked_env_paths[@]}"; do
  if (( ${#history_refs[@]} > 0 )) && [[ -n "$(git rev-list -n 1 "${history_refs[@]}" -- "${path}")" ]]; then
    fail "Git history still contains ${path}"
  else
    pass "Git history no longer contains ${path}"
  fi
done

echo
if (( failures > 0 )); then
  printf 'Env history cleanup verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Env history cleanup verification passed"
