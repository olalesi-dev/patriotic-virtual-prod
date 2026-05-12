#!/usr/bin/env bash
set -euo pipefail

api_token="${CLOUDFLARE_API_TOKEN:-}"
zone_name="${CLOUDFLARE_ZONE_NAME:-patriotictelehealth.com}"
staging_public_domain="${STAGING_PUBLIC_DOMAIN:-dev.patriotictelehealth.com}"
staging_emr_domain="${STAGING_EMR_DOMAIN:-emr-dev.patriotictelehealth.com}"
production_public_domain="${PRODUCTION_PUBLIC_DOMAIN:-patriotictelehealth.com}"
production_www_domain="${PRODUCTION_WWW_DOMAIN:-www.patriotictelehealth.com}"
production_emr_domain="${PRODUCTION_EMR_DOMAIN:-emr.patriotictelehealth.com}"
production_api_domain="${PRODUCTION_API_DOMAIN:-api.patriotictelehealth.com}"
www_handling_mode="${WWW_HANDLING_MODE:-redirect}"

usage() {
  cat <<'EOF'
Usage:
  CLOUDFLARE_API_TOKEN=... \
  CLOUDFLARE_ZONE_NAME=patriotictelehealth.com \
  npm run verify:cloudflare-zone-setup

Optional overrides:
  STAGING_PUBLIC_DOMAIN
  STAGING_EMR_DOMAIN
  PRODUCTION_PUBLIC_DOMAIN
  PRODUCTION_WWW_DOMAIN
  PRODUCTION_EMR_DOMAIN
  PRODUCTION_API_DOMAIN
  WWW_HANDLING_MODE=redirect|record|skip

Requirements:
  - curl installed
  - jq installed
  - Cloudflare API token with access to the target zone and DNS records
EOF
}

if [[ -z "${api_token}" ]]; then
  usage
  exit 1
fi

for command_name in curl jq; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    usage
    echo
    echo "${command_name} is required" >&2
    exit 1
  fi
done

failures=0

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

cf_get() {
  local path="$1"
  curl -fsS \
    -H "Authorization: Bearer ${api_token}" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4${path}"
}

zone_payload="$(cf_get "/zones?name=${zone_name}&per_page=50")"
zone_id="$(printf '%s' "${zone_payload}" | jq -r '.result[0].id // empty')"

if [[ -z "${zone_id}" ]]; then
  fail "Cloudflare zone not found or inaccessible: ${zone_name}"
  echo
  printf '%s\n' "${zone_payload}" | jq .
  exit 1
fi

pass "Cloudflare zone is accessible: ${zone_name}"

records_payload="$(cf_get "/zones/${zone_id}/dns_records?per_page=1000")"

check_record_name() {
  local record_name="$1"
  local found
  local types

  found="$(printf '%s' "${records_payload}" | jq -r --arg name "${record_name}" '.result | map(select(.name == $name)) | length')"

  if [[ "${found}" == "0" ]]; then
    fail "Cloudflare DNS record missing: ${record_name}"
    return
  fi

  types="$(printf '%s' "${records_payload}" | jq -r --arg name "${record_name}" '.result | map(select(.name == $name) | .type) | unique | join(", ")')"
  pass "Cloudflare DNS record exists: ${record_name} (${types})"
}

echo "Verifying Cloudflare zone setup"
echo "CLOUDFLARE_ZONE_NAME=${zone_name}"
echo "WWW_HANDLING_MODE=${www_handling_mode}"
echo

check_record_name "${staging_public_domain}"
check_record_name "${staging_emr_domain}"
check_record_name "${production_public_domain}"

case "${www_handling_mode}" in
  record)
    check_record_name "${production_www_domain}"
    ;;
  redirect)
    pass "WWW handling mode is redirect; ${production_www_domain} is expected to be handled by a redirect rule"
    ;;
  skip)
    pass "WWW handling mode verification skipped for ${production_www_domain}"
    ;;
  *)
    fail "Invalid WWW_HANDLING_MODE: ${www_handling_mode} (expected redirect, record, or skip)"
    ;;
esac

check_record_name "${production_emr_domain}"
check_record_name "${production_api_domain}"

echo
if (( failures > 0 )); then
  printf 'Cloudflare zone setup verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Cloudflare zone setup verification passed"
