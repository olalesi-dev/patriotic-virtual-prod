#!/usr/bin/env bash
set -euo pipefail

staging_project="${STAGING_FIREBASE_PROJECT_ID:-patriotic-virtual-dev}"
production_project="${PRODUCTION_FIREBASE_PROJECT_ID:-patriotic-virtual-prod}"
staging_landing_site="${STAGING_LANDING_SITE_ID:-patriotic-virtual-dev}"
staging_emr_site="${STAGING_EMR_SITE_ID:-patriotic-virtual-dev-emr}"
production_landing_site="${PRODUCTION_LANDING_SITE_ID:-patriotic-virtual-prod}"
production_emr_site="${PRODUCTION_EMR_SITE_ID:-patriotic-virtual-emr}"

usage() {
  cat <<'EOF'
Usage:
  npm run verify:firebase-hosting-setup

Optional overrides:
  STAGING_FIREBASE_PROJECT_ID
  PRODUCTION_FIREBASE_PROJECT_ID
  STAGING_LANDING_SITE_ID
  STAGING_EMR_SITE_ID
  PRODUCTION_LANDING_SITE_ID
  PRODUCTION_EMR_SITE_ID

Requirements:
  - firebase CLI installed
  - firebase login completed
  - access to the target Firebase projects
EOF
}

if ! command -v firebase >/dev/null 2>&1; then
  usage
  echo
  echo "firebase CLI is required" >&2
  exit 1
fi

firebase_auth_probe="$(firebase projects:list --json 2>&1 || true)"
if [[ "${firebase_auth_probe}" == *"Please file a bug on Github"* ]] || [[ "${firebase_auth_probe}" == *"firepit-log.txt"* ]] || [[ "${firebase_auth_probe}" == *"Not logged in"* ]]; then
  usage
  echo
  echo "firebase CLI auth/runtime is invalid or unusable in this shell; run: firebase login or use an unrestricted shell" >&2
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

check_local_target_mapping() {
  local project="$1"
  local target="$2"
  local site="$3"
  if node -e '
    const fs = require("fs");
    const [project, target, site] = process.argv.slice(1);
    const config = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
    const sites = (((config.targets || {})[project] || {}).hosting || {})[target] || [];
    process.exit(Array.isArray(sites) && sites.includes(site) ? 0 : 1);
  ' "${project}" "${target}" "${site}"; then
    pass "Local .firebaserc maps ${project}/${target} to ${site}"
  else
    fail "Local .firebaserc mapping missing for ${project}/${target} -> ${site}"
  fi
}

check_remote_site() {
  local project="$1"
  local site="$2"
  local output

  if ! output="$(firebase hosting:sites:list --project "${project}" 2>/dev/null)"; then
    fail "Unable to list Firebase Hosting sites for ${project}"
    return
  fi

  if printf '%s' "${output}" | grep -F "${site}" >/dev/null; then
    pass "Remote Firebase Hosting site exists: ${project}/${site}"
  else
    fail "Remote Firebase Hosting site missing: ${project}/${site}"
  fi
}

echo "Verifying Firebase Hosting setup"
echo "STAGING_FIREBASE_PROJECT_ID=${staging_project}"
echo "PRODUCTION_FIREBASE_PROJECT_ID=${production_project}"
echo

check_local_target_mapping "${staging_project}" "landing" "${staging_landing_site}"
check_local_target_mapping "${staging_project}" "emr" "${staging_emr_site}"
check_local_target_mapping "${production_project}" "landing" "${production_landing_site}"
check_local_target_mapping "${production_project}" "emr" "${production_emr_site}"

check_remote_site "${staging_project}" "${staging_landing_site}"
check_remote_site "${staging_project}" "${staging_emr_site}"
check_remote_site "${production_project}" "${production_landing_site}"
check_remote_site "${production_project}" "${production_emr_site}"

echo
if (( failures > 0 )); then
  printf 'Firebase Hosting setup verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Firebase Hosting setup verification passed"
