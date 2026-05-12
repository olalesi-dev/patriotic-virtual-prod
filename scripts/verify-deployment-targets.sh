#!/usr/bin/env bash
set -euo pipefail

public_url="${PUBLIC_URL:-}"
emr_url="${EMR_URL:-}"
api_url="${API_URL:-}"
expected_pacs_url="${PACS_URL:-https://pacs.patriotictelehealth.com}"
expected_staging_banner="${EXPECT_STAGING_BANNER:-auto}"
staging_banner_text="THIS IS A TEST/STAGING ENVIRONMENT. NOT FOR PRODUCTION USE."

usage() {
  cat <<'EOF'
Usage:
  PUBLIC_URL=https://... EMR_URL=https://... API_URL=https://... [PACS_URL=https://...] [EXPECT_STAGING_BANNER=auto|1|0] npm run verify:deployment-targets

Examples:
  PUBLIC_URL=https://dev.patriotictelehealth.com \
  EMR_URL=https://emr-dev.patriotictelehealth.com \
  API_URL=https://api.patriotictelehealth.com \
  EXPECT_STAGING_BANNER=1 \
  npm run verify:deployment-targets

  PUBLIC_URL=https://patriotictelehealth.com \
  EMR_URL=https://emr.patriotictelehealth.com \
  API_URL=https://api.patriotictelehealth.com \
  EXPECT_STAGING_BANNER=0 \
  npm run verify:deployment-targets
EOF
}

if [[ -z "${public_url}" || -z "${emr_url}" || -z "${api_url}" ]]; then
  usage
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

fetch() {
  local url="$1"
  local body_file="$2"
  local headers_file="$3"
  local status

  status="$(curl -sS -L -D "${headers_file}" -o "${body_file}" -w '%{http_code}' "${url}")"
  printf '%s' "${status}"
}

check_http_ok() {
  local url="$1"
  local label="$2"
  local body_file headers_file status

  body_file="$(mktemp)"
  headers_file="$(mktemp)"
  status="$(fetch "${url}" "${body_file}" "${headers_file}")"

  if [[ "${status}" =~ ^[23] ]]; then
    pass "${label} (${status})"
  else
    fail "${label} (${status})"
    cat "${body_file}"
  fi
}

check_body_contains() {
  local url="$1"
  local pattern="$2"
  local label="$3"
  local body_file headers_file status

  body_file="$(mktemp)"
  headers_file="$(mktemp)"
  status="$(fetch "${url}" "${body_file}" "${headers_file}")"

  if [[ ! "${status}" =~ ^[23] ]]; then
    fail "${label} (${status})"
    cat "${body_file}"
    return
  fi

  if rg -q --fixed-strings "${pattern}" "${body_file}"; then
    pass "${label}"
  else
    fail "${label} (${pattern} missing)"
    cat "${body_file}"
  fi
}

check_body_absent() {
  local url="$1"
  local pattern="$2"
  local label="$3"
  local body_file headers_file status

  body_file="$(mktemp)"
  headers_file="$(mktemp)"
  status="$(fetch "${url}" "${body_file}" "${headers_file}")"

  if [[ ! "${status}" =~ ^[23] ]]; then
    fail "${label} (${status})"
    cat "${body_file}"
    return
  fi

  if rg -q --fixed-strings "${pattern}" "${body_file}"; then
    fail "${label} (${pattern} unexpectedly present)"
    cat "${body_file}"
  else
    pass "${label}"
  fi
}

infer_expect_staging_banner() {
  if [[ "${expected_staging_banner}" == "1" || "${expected_staging_banner}" == "true" ]]; then
    printf '1'
    return
  fi

  if [[ "${expected_staging_banner}" == "0" || "${expected_staging_banner}" == "false" ]]; then
    printf '0'
    return
  fi

  local public_host emr_host
  public_host="$(printf '%s\n' "${public_url}" | sed -E 's#^https?://##; s#/.*$##')"
  emr_host="$(printf '%s\n' "${emr_url}" | sed -E 's#^https?://##; s#/.*$##')"

  if [[ "${public_host}" == dev.* || "${emr_host}" == emr-dev.* || "${emr_host}" == dev.emr.* || "${public_host}" == *staging* || "${emr_host}" == *staging* ]]; then
    printf '1'
  else
    printf '0'
  fi
}

echo "Verifying deployed targets"
echo "PUBLIC_URL=${public_url}"
echo "EMR_URL=${emr_url}"
echo "API_URL=${api_url}"
echo "PACS_URL=${expected_pacs_url}"
echo "EXPECT_STAGING_BANNER=${expected_staging_banner}"
echo

check_http_ok "${public_url}" "Landing root responds"
check_http_ok "${emr_url}/login" "EMR login responds"
check_http_ok "${api_url}/health" "Backend health responds"

check_body_contains "${public_url}/assets/js/app-config.js" "${emr_url}" "Landing runtime config references expected EMR host"
check_body_contains "${public_url}/assets/js/app-config.js" "${api_url}" "Landing runtime config references expected API host"
check_body_contains "${public_url}/assets/js/app-config.js" "${expected_pacs_url}" "Landing runtime config references expected PACS host"
check_body_contains "${api_url}/health" '"status":"UP"' "Backend health payload reports UP"

case "$(infer_expect_staging_banner)" in
  1)
    check_body_contains "${emr_url}/login" "${staging_banner_text}" "EMR login shows staging warning banner"
    ;;
  0)
    check_body_absent "${emr_url}/login" "${staging_banner_text}" "EMR login does not show staging warning banner"
    ;;
esac

echo
if (( failures > 0 )); then
  printf 'Deployment target verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Deployment target verification passed"
