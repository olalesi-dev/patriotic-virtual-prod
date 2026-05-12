#!/usr/bin/env bash
set -euo pipefail

failures=0
gh_failed=0
gcloud_failed=0
firebase_failed=0

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

check_command() {
  local cmd="$1"
  local label="$2"
  if command -v "${cmd}" >/dev/null 2>&1; then
    pass "${label}"
  else
    fail "${label} (${cmd} not installed)"
  fi
}

echo "Verifying operator auth prerequisites"
echo

check_command "gh" "GitHub CLI is installed"
check_command "gcloud" "gcloud CLI is installed"
check_command "firebase" "Firebase CLI is installed"

if command -v gh >/dev/null 2>&1; then
  if gh auth status -h github.com >/tmp/deployment-auth-gh.txt 2>&1; then
    pass "GitHub CLI auth is usable"
  else
    fail "GitHub CLI auth is unusable"
    gh_failed=1
    cat /tmp/deployment-auth-gh.txt
  fi
fi

if command -v gcloud >/dev/null 2>&1; then
  if gcloud auth print-access-token >/tmp/deployment-auth-gcloud.txt 2>/tmp/deployment-auth-gcloud.err; then
    pass "gcloud auth/config is usable"
  else
    fail "gcloud auth/config is unusable"
    gcloud_failed=1
    cat /tmp/deployment-auth-gcloud.err
  fi
fi

if command -v firebase >/dev/null 2>&1; then
  firebase_probe="$(firebase projects:list --json 2>&1 || true)"
  if [[ "${firebase_probe}" == *"Please file a bug on Github"* ]] || [[ "${firebase_probe}" == *"firepit-log.txt"* ]] || [[ "${firebase_probe}" == *"Not logged in"* ]]; then
    fail "Firebase CLI auth/runtime is unusable"
    firebase_failed=1
    printf '%s\n' "${firebase_probe}"
  elif firebase projects:list --json >/tmp/deployment-auth-firebase.txt 2>/tmp/deployment-auth-firebase.err; then
    pass "Firebase CLI auth/runtime is usable"
  else
    fail "Firebase CLI auth/runtime is unusable"
    firebase_failed=1
    cat /tmp/deployment-auth-firebase.err
  fi
fi

echo
if (( failures > 0 )); then
  echo "Recommended next steps:"
  if (( gh_failed > 0 )); then
    echo "  - Repair GitHub auth: gh auth login -h github.com"
  fi
  if (( gcloud_failed > 0 )); then
    echo "  - Run gcloud auth in a writable shell, or set CLOUDSDK_CONFIG to a writable directory before: gcloud auth login"
  fi
  if (( firebase_failed > 0 )); then
    echo "  - Run Firebase CLI in an unrestricted shell and repair auth/runtime with: firebase login"
  fi
  echo
  printf 'Operator auth prerequisite verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Operator auth prerequisite verification passed"
