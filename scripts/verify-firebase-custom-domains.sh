#!/usr/bin/env bash
set -euo pipefail

staging_project="${STAGING_FIREBASE_PROJECT_ID:-patriotic-virtual-dev}"
production_project="${PRODUCTION_FIREBASE_PROJECT_ID:-patriotic-virtual-prod}"
staging_landing_site="${STAGING_LANDING_SITE_ID:-patriotic-virtual-dev}"
staging_emr_site="${STAGING_EMR_SITE_ID:-patriotic-virtual-dev-emr}"
production_landing_site="${PRODUCTION_LANDING_SITE_ID:-patriotic-virtual-prod}"
production_emr_site="${PRODUCTION_EMR_SITE_ID:-patriotic-virtual-emr}"

staging_public_domain="${STAGING_PUBLIC_DOMAIN:-dev.patriotictelehealth.com}"
staging_emr_domain="${STAGING_EMR_DOMAIN:-emr-dev.patriotictelehealth.com}"
production_public_domain="${PRODUCTION_PUBLIC_DOMAIN:-patriotictelehealth.com}"
production_emr_domain="${PRODUCTION_EMR_DOMAIN:-emr.patriotictelehealth.com}"

usage() {
  cat <<'EOF'
Usage:
  npm run verify:firebase-custom-domains

Optional overrides:
  STAGING_FIREBASE_PROJECT_ID
  PRODUCTION_FIREBASE_PROJECT_ID
  STAGING_LANDING_SITE_ID
  STAGING_EMR_SITE_ID
  PRODUCTION_LANDING_SITE_ID
  PRODUCTION_EMR_SITE_ID
  STAGING_PUBLIC_DOMAIN
  STAGING_EMR_DOMAIN
  PRODUCTION_PUBLIC_DOMAIN
  PRODUCTION_EMR_DOMAIN

Requirements:
  - gcloud CLI installed
  - curl installed
  - jq installed
  - gcloud auth login or equivalent completed
  - access to the target Firebase projects
EOF
}

for command_name in gcloud curl jq; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    usage
    echo
    echo "${command_name} is required" >&2
    exit 1
  fi
done

if ! gcloud auth print-access-token >/dev/null 2>&1; then
  usage
  echo
  echo "gcloud auth/config is invalid or unusable in this shell; run: gcloud auth login" >&2
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

fetch_custom_domains() {
  local project="$1"
  local site="$2"
  local token

  token="$(gcloud auth print-access-token 2>/dev/null)" || return 1

  curl -fsS \
    -H "Authorization: Bearer ${token}" \
    "https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/${site}/customDomains"
}

check_custom_domain() {
  local project="$1"
  local site="$2"
  local domain="$3"
  local payload
  local item
  local host_state
  local ownership_state

  if ! payload="$(fetch_custom_domains "${project}" "${site}")"; then
    fail "Unable to list Firebase custom domains for ${project}/${site}"
    return
  fi

  item="$(
    printf '%s' "${payload}" \
      | jq -c --arg domain "${domain}" '
          (.customDomains // [])
          | map(select((.name // "") | endswith("/customDomains/" + $domain)))
          | .[0] // empty
        '
  )"

  if [[ -z "${item}" ]]; then
    fail "Firebase custom domain missing: ${project}/${site}/${domain}"
    return
  fi

  pass "Firebase custom domain exists: ${project}/${site}/${domain}"

  host_state="$(printf '%s' "${item}" | jq -r '.hostState // "HOST_STATE_UNSPECIFIED"')"
  ownership_state="$(printf '%s' "${item}" | jq -r '.ownershipState // "OWNERSHIP_STATE_UNSPECIFIED"')"

  if [[ "${host_state}" == "HOST_ACTIVE" ]]; then
    pass "Firebase custom domain host state is active: ${domain}"
  else
    fail "Firebase custom domain host state is ${host_state}: ${domain}"
  fi

  if [[ "${ownership_state}" == "OWNERSHIP_ACTIVE" ]]; then
    pass "Firebase custom domain ownership state is active: ${domain}"
  else
    fail "Firebase custom domain ownership state is ${ownership_state}: ${domain}"
  fi
}

echo "Verifying Firebase custom domains"
echo "STAGING_FIREBASE_PROJECT_ID=${staging_project}"
echo "PRODUCTION_FIREBASE_PROJECT_ID=${production_project}"
echo

check_custom_domain "${staging_project}" "${staging_landing_site}" "${staging_public_domain}"
check_custom_domain "${staging_project}" "${staging_emr_site}" "${staging_emr_domain}"
check_custom_domain "${production_project}" "${production_landing_site}" "${production_public_domain}"
check_custom_domain "${production_project}" "${production_emr_site}" "${production_emr_domain}"

echo
if (( failures > 0 )); then
  printf 'Firebase custom domain verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Firebase custom domain verification passed"
