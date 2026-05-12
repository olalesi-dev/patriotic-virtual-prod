#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
default_repo="$(
  git -C "${repo_root}" remote get-url origin 2>/dev/null \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##' \
    || true
)"
repo="${GITHUB_REPO:-${default_repo}}"
staging_gcp_project="${STAGING_GCP_PROJECT_ID:-patriotic-virtual-dev}"
production_gcp_project="${PRODUCTION_GCP_PROJECT_ID:-patriotic-virtual-prod}"
staging_firebase_project="${STAGING_FIREBASE_PROJECT_ID:-patriotic-virtual-dev}"
production_firebase_project="${PRODUCTION_FIREBASE_PROJECT_ID:-patriotic-virtual-prod}"

run_dns="${VERIFY_DNS:-1}"
run_targets="${VERIFY_DEPLOYED_TARGETS:-0}"
run_cloudflare="${VERIFY_CLOUDFLARE:-0}"

usage() {
  cat <<EOF
Usage:
  npm run verify:deployment-handoff

Optional:
  GITHUB_REPO=${default_repo:-OWNER/REPO}
  STAGING_GCP_PROJECT_ID=patriotic-virtual-dev
  PRODUCTION_GCP_PROJECT_ID=patriotic-virtual-prod
  STAGING_FIREBASE_PROJECT_ID=patriotic-virtual-dev
  PRODUCTION_FIREBASE_PROJECT_ID=patriotic-virtual-prod
  PRODUCTION_API_DOMAIN=api.patriotictelehealth.com
  VERIFY_DNS=1
  VERIFY_DEPLOYED_TARGETS=0
  VERIFY_CLOUDFLARE=0
  CLOUDFLARE_API_TOKEN=...
  CLOUDFLARE_ZONE_NAME=patriotictelehealth.com
  WWW_HANDLING_MODE=redirect|record|skip

To also verify deployed HTTP targets:
  PUBLIC_URL=https://patriotictelehealth.com
  EMR_URL=https://emr.patriotictelehealth.com
  API_URL=https://api.patriotictelehealth.com
  VERIFY_DEPLOYED_TARGETS=1

Notes:
  - This wrapper runs the existing operator-auth, env-history, GitHub, branch-protection, GCP, Firebase Hosting, and Firebase custom-domain verifiers in order.
  - DNS verification is attempted by default. If the shell blocks outbound DNS, that step is reported as skipped instead of failing the whole wrapper.
  - Cloudflare API verification is optional because it requires CLOUDFLARE_API_TOKEN access to the target zone.
  - When VERIFY_CLOUDFLARE=1, set WWW_HANDLING_MODE to match whether www is handled by a redirect rule, a real DNS record, or should be skipped.
EOF
}

if [[ -z "${repo}" ]]; then
  usage
  exit 1
fi

if [[ "${run_targets}" == "1" ]] && [[ -z "${PUBLIC_URL:-}" || -z "${EMR_URL:-}" || -z "${API_URL:-}" ]]; then
  echo "PUBLIC_URL, EMR_URL, and API_URL are required when VERIFY_DEPLOYED_TARGETS=1" >&2
  exit 1
fi

failures=0

section() {
  printf '\n============================================================\n'
  printf '%s\n' "$1"
  printf '============================================================\n'
}

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

run_step() {
  local label="$1"
  shift

  section "${label}"
  if (cd "${repo_root}" && "$@"); then
    pass "${label}"
  else
    fail "${label}"
  fi
}

run_dns_step() {
  section "DNS resolution verification"
  if (cd "${repo_root}" && bash ./scripts/verify-dns-resolution.sh); then
    pass "DNS resolution verification"
    return
  fi

  local status=$?
  if [[ ${status} -eq 2 ]]; then
    printf 'SKIP %s\n' "DNS resolution verification could not run from this shell"
    return
  fi

  fail "DNS resolution verification"
}

echo "Verifying deployment handoff state"
echo
echo "GITHUB_REPO=${repo}"
echo "STAGING_GCP_PROJECT_ID=${staging_gcp_project}"
echo "PRODUCTION_GCP_PROJECT_ID=${production_gcp_project}"
echo "STAGING_FIREBASE_PROJECT_ID=${staging_firebase_project}"
echo "PRODUCTION_FIREBASE_PROJECT_ID=${production_firebase_project}"

run_step "Operator auth prerequisite verification" bash ./scripts/verify-operator-auth.sh
run_step "Env history cleanup verification" bash ./scripts/verify-env-history-cleanup.sh
run_step "GitHub deployment setup verification" env GITHUB_REPO="${repo}" bash ./scripts/verify-github-deployment-setup.sh
run_step "Branch protection verification" env GITHUB_REPO="${repo}" bash ./scripts/verify-branch-protection-setup.sh
run_step "GCP deployment setup verification" env STAGING_GCP_PROJECT_ID="${staging_gcp_project}" PRODUCTION_GCP_PROJECT_ID="${production_gcp_project}" bash ./scripts/verify-gcp-deployment-setup.sh
run_step "Firebase Hosting setup verification" env STAGING_FIREBASE_PROJECT_ID="${staging_firebase_project}" PRODUCTION_FIREBASE_PROJECT_ID="${production_firebase_project}" bash ./scripts/verify-firebase-hosting-setup.sh
run_step "Firebase custom domain verification" env STAGING_FIREBASE_PROJECT_ID="${staging_firebase_project}" PRODUCTION_FIREBASE_PROJECT_ID="${production_firebase_project}" bash ./scripts/verify-firebase-custom-domains.sh

if [[ "${run_cloudflare}" == "1" ]]; then
  run_step "Cloudflare zone setup verification" bash ./scripts/verify-cloudflare-zone-setup.sh
fi

if [[ "${run_dns}" == "1" ]]; then
  run_dns_step
fi

if [[ "${run_targets}" == "1" ]]; then
  run_step "Deployed target verification" bash ./scripts/verify-deployment-targets.sh
fi

echo
if (( failures > 0 )); then
  printf 'Deployment handoff verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Deployment handoff verification passed"
