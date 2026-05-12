#!/usr/bin/env bash
set -euo pipefail

domains=(
  "${STAGING_PUBLIC_DOMAIN:-dev.patriotictelehealth.com}"
  "${STAGING_EMR_DOMAIN:-emr-dev.patriotictelehealth.com}"
  "${PRODUCTION_PUBLIC_DOMAIN:-patriotictelehealth.com}"
  "${PRODUCTION_WWW_DOMAIN:-www.patriotictelehealth.com}"
  "${PRODUCTION_EMR_DOMAIN:-emr.patriotictelehealth.com}"
  "${PRODUCTION_API_DOMAIN:-api.patriotictelehealth.com}"
)

usage() {
  cat <<'EOF'
Usage:
  npm run verify:dns-resolution

Optional overrides:
  STAGING_PUBLIC_DOMAIN
  STAGING_EMR_DOMAIN
  PRODUCTION_PUBLIC_DOMAIN
  PRODUCTION_WWW_DOMAIN
  PRODUCTION_EMR_DOMAIN
  PRODUCTION_API_DOMAIN

Requirements:
  - one of: dig, nslookup, host, getent
  - outbound DNS/network access from the shell running the check
EOF
}

available_resolvers=()
for candidate in dig nslookup host getent; do
  if command -v "${candidate}" >/dev/null 2>&1; then
    available_resolvers+=("${candidate}")
  fi
done

if (( ${#available_resolvers[@]} == 0 )); then
  usage
  echo
  echo "dig, nslookup, host, or getent is required" >&2
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

is_dns_blocked_output() {
  local output="$1"
  [[ "${output}" == *"Operation not permitted"* ]] || \
    [[ "${output}" == *"can't find either v4 or v6 networking"* ]] || \
    [[ "${output}" == *"No network"* ]] || \
    [[ "${output}" == *"network is unreachable"* ]] || \
    [[ "${output}" == *"Temporary failure in name resolution"* ]]
}

resolve_with() {
  local resolver="$1"
  local domain="$2"
  case "${resolver}" in
    dig)
      dig +short "${domain}" A "${domain}" AAAA 2>&1
      ;;
    nslookup)
      nslookup "${domain}" 2>&1
      ;;
    host)
      host "${domain}" 2>&1
      ;;
    getent)
      getent ahosts "${domain}" 2>&1
      ;;
  esac
}

extract_answers() {
  local resolver="$1"
  local raw="$2"
  case "${resolver}" in
    dig)
      printf '%s\n' "${raw}" | awk '/^([0-9]{1,3}\.){3}[0-9]{1,3}$/ || /^[0-9a-fA-F:]+$/'
      ;;
    nslookup)
      printf '%s\n' "${raw}" | awk '
        /^Name:/ { in_answer=1; next }
        in_answer && /^Address: / { print $2 }
      '
      ;;
    host)
      printf '%s\n' "${raw}" | awk '/ has address / { print $4 } / has IPv6 address / { print $5 }'
      ;;
    getent)
      printf '%s\n' "${raw}" | awk '/^([0-9]{1,3}\.){3}[0-9]{1,3}[[:space:]]/ || /^[0-9a-fA-F:]+[[:space:]]/ { print $1 }' | sort -u
      ;;
  esac | sed '/^$/d'
}

resolve_domain() {
  local domain="$1"
  local resolver
  local raw
  local filtered
  local blocked=0

  for resolver in "${available_resolvers[@]}"; do
    raw="$(resolve_with "${resolver}" "${domain}" || true)"
    filtered="$(extract_answers "${resolver}" "${raw}")"

    if [[ -n "${filtered}" ]]; then
      printf '%s\n' "${filtered}"
      return 0
    fi

    if is_dns_blocked_output "${raw}"; then
      blocked=1
    fi
  done

  if (( blocked > 0 )); then
    return 2
  fi

  return 1
}

echo "Verifying DNS resolution"
echo

blocked_domains=0

for domain in "${domains[@]}"; do
  if answers="$(resolve_domain "${domain}")"; then
    status=0
  else
    status=$?
  fi
  if [[ ${status} -eq 0 && -n "${answers}" ]]; then
    pass "${domain} resolves"
    printf '%s\n' "${answers}" | sed 's/^/  /'
  elif [[ ${status} -eq 2 ]]; then
    printf 'SKIP %s\n' "${domain} could not be verified from this shell (DNS/network access blocked)"
    blocked_domains=$((blocked_domains + 1))
  else
    fail "${domain} does not resolve"
  fi
done

echo
if (( blocked_domains == ${#domains[@]} )); then
  echo "DNS resolution verification could not run from this shell because outbound DNS access is blocked"
  exit 2
fi

if (( failures > 0 )); then
  printf 'DNS resolution verification failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "DNS resolution verification passed"
