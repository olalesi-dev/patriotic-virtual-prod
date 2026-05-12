#!/usr/bin/env bash
set -euo pipefail

default_repo="$(
  git remote get-url origin 2>/dev/null \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##' \
    || true
)"
repo="${GITHUB_REPO:-${default_repo}}"

usage() {
  cat <<EOF
Usage:
  npm run verify:github-deployment-setup

Optional overrides:
  GITHUB_REPO=${default_repo:-OWNER/REPO}

Requirements:
  - gh CLI installed
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

check_branch() {
  local branch="$1"
  if gh api "repos/${repo}/branches/${branch}" >/dev/null 2>&1; then
    pass "GitHub branch exists: ${branch}"
  else
    fail "GitHub branch missing: ${branch}"
  fi
}

check_environment() {
  local environment="$1"
  if gh api "repos/${repo}/environments/${environment}" >/dev/null 2>&1; then
    pass "GitHub environment exists: ${environment}"
  else
    fail "GitHub environment missing: ${environment}"
  fi
}

check_variable_exists() {
  local environment="$1"
  local variable="$2"
  if gh api "repos/${repo}/environments/${environment}/variables/${variable}" >/dev/null 2>&1; then
    pass "GitHub variable exists: ${environment}/${variable}"
  else
    fail "GitHub variable missing: ${environment}/${variable}"
  fi
}

check_variable_value() {
  local environment="$1"
  local variable="$2"
  local expected="$3"
  local actual

  if ! actual="$(gh api "repos/${repo}/environments/${environment}/variables/${variable}" --jq '.value' 2>/dev/null)"; then
    fail "GitHub variable missing: ${environment}/${variable}"
    return
  fi

  if [[ "${actual}" == "${expected}" ]]; then
    pass "GitHub variable value matches: ${environment}/${variable}"
  else
    fail "GitHub variable value mismatch: ${environment}/${variable} (expected ${expected}, got ${actual})"
  fi
}

check_secret() {
  local environment="$1"
  local secret="$2"
  if gh secret list --env "${environment}" --repo "${repo}" 2>/dev/null | awk '{print $1}' | grep -Fx "${secret}" >/dev/null; then
    pass "GitHub secret exists: ${environment}/${secret}"
  else
    fail "GitHub secret missing: ${environment}/${secret}"
  fi
}

echo "Verifying GitHub deployment setup for ${repo}"
echo

check_branch "staging"
check_branch "production"

check_environment "staging"
check_environment "production"

check_variable_value "staging" "FIREBASE_PROJECT_ID" "patriotic-virtual-dev"
check_variable_value "staging" "GCP_PROJECT_ID" "patriotic-virtual-dev"
check_variable_value "staging" "NEXT_PUBLIC_APP_ENV" "staging"
check_variable_value "staging" "EMR_PORTAL_ENV_SECRET_NAME" "emr-portal-env-staging"
check_variable_value "staging" "PUBLIC_URL" "https://dev.patriotictelehealth.com"
check_variable_value "staging" "EMR_URL" "https://emr-dev.patriotictelehealth.com"
check_variable_value "staging" "API_URL" "https://api.patriotictelehealth.com"
check_variable_exists "staging" "ENABLE_STAGING_FIRESTORE"

check_variable_value "production" "FIREBASE_PROJECT_ID" "patriotic-virtual-prod"
check_variable_value "production" "GCP_PROJECT_ID" "patriotic-virtual-prod"
check_variable_value "production" "NEXT_PUBLIC_APP_ENV" "production"
check_variable_value "production" "EMR_PORTAL_ENV_SECRET_NAME" "emr-portal-env-production"
check_variable_value "production" "BACKEND_ENV_SECRET_NAME" "emr-backend-env-production"
check_variable_value "production" "GCP_REGION" "us-central1"
check_variable_value "production" "CLOUD_RUN_SERVICE" "patriotic-virtual-backend"
check_variable_value "production" "PUBLIC_URL" "https://patriotictelehealth.com"
check_variable_value "production" "EMR_URL" "https://emr.patriotictelehealth.com"
check_variable_value "production" "API_URL" "https://api.patriotictelehealth.com"

for secret in GCP_WORKLOAD_IDENTITY_PROVIDER GCP_DEPLOY_SERVICE_ACCOUNT; do
  check_secret "staging" "${secret}"
  check_secret "production" "${secret}"
done

echo
if (( failures > 0 )); then
  printf 'GitHub deployment setup verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "GitHub deployment setup verification passed"
