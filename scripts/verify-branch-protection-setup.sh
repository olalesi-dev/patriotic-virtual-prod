#!/usr/bin/env bash
set -euo pipefail

default_repo="$(
  git remote get-url origin 2>/dev/null \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##' \
    || true
)"
repo="${GITHUB_REPO:-${default_repo}}"

required_checks=(
  "tracked-env-guard"
  "changes"
  "validate-public"
  "build-emr-portal"
  "build-emr-backend"
)

usage() {
  cat <<EOF
Usage:
  npm run verify:branch-protection-setup

Optional overrides:
  GITHUB_REPO=${default_repo:-OWNER/REPO}

Requirements:
  - gh CLI installed
  - jq installed
  - gh auth login completed
  - access to the target repository
EOF
}

if [[ -z "${repo}" ]]; then
  usage
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  usage
  echo
  echo "gh auth is invalid or missing for github.com; run: gh auth login -h github.com" >&2
  exit 1
fi

failures=0

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

fetch_protection() {
  local branch="$1"
  gh api "repos/${repo}/branches/${branch}/protection" 2>/dev/null
}

check_required_checks() {
  local branch="$1"
  local json="$2"
  local check
  for check in "${required_checks[@]}"; do
    if printf '%s' "${json}" | jq -e --arg check "${check}" '.required_status_checks.contexts | index($check)' >/dev/null; then
      pass "Branch protection includes required check: ${branch}/${check}"
    else
      fail "Branch protection missing required check: ${branch}/${check}"
    fi
  done
}

check_branch_protection() {
  local branch="$1"
  local minimum_reviews="$2"
  local json

  if ! json="$(fetch_protection "${branch}")"; then
    fail "Branch protection missing or inaccessible: ${branch}"
    return
  fi

  pass "Branch protection exists: ${branch}"

  if printf '%s' "${json}" | jq -e '.required_status_checks.strict == true' >/dev/null; then
    pass "Branch protection requires up-to-date branches: ${branch}"
  else
    fail "Branch protection does not require up-to-date branches: ${branch}"
  fi

  check_required_checks "${branch}" "${json}"

  if printf '%s' "${json}" | jq -e '.required_pull_request_reviews != null' >/dev/null; then
    pass "Branch protection requires pull request reviews: ${branch}"
  else
    fail "Branch protection missing pull request review requirement: ${branch}"
  fi

  if printf '%s' "${json}" | jq -e '.required_pull_request_reviews.dismiss_stale_reviews == true' >/dev/null; then
    pass "Branch protection dismisses stale reviews: ${branch}"
  else
    fail "Branch protection does not dismiss stale reviews: ${branch}"
  fi

  if printf '%s' "${json}" | jq -e --argjson count "${minimum_reviews}" '.required_pull_request_reviews.required_approving_review_count >= $count' >/dev/null; then
    pass "Branch protection has sufficient approving review count: ${branch}"
  else
    fail "Branch protection approving review count is below ${minimum_reviews}: ${branch}"
  fi

  if printf '%s' "${json}" | jq -e '.enforce_admins.enabled == true' >/dev/null; then
    pass "Branch protection enforces rules for admins: ${branch}"
  else
    fail "Branch protection does not enforce rules for admins: ${branch}"
  fi
}

echo "Verifying branch protection setup for ${repo}"
echo

check_branch_protection "staging" 0
check_branch_protection "production" 1

echo
if (( failures > 0 )); then
  printf 'Branch protection verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Branch protection verification passed"
