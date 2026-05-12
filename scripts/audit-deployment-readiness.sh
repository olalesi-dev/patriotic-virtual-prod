#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

failures=0

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

check_file_exists() {
  local path="$1"
  local label="$2"
  if [[ -f "${path}" ]]; then
    pass "${label}"
  else
    fail "${label} (missing ${path})"
  fi
}

check_file_absent() {
  local path="$1"
  local label="$2"
  if [[ ! -e "${path}" ]]; then
    pass "${label}"
  else
    fail "${label} (${path} still exists)"
  fi
}

check_file_contains() {
  local path="$1"
  local pattern="$2"
  local label="$3"
  if rg -q --fixed-strings -- "${pattern}" "${path}"; then
    pass "${label}"
  else
    fail "${label} (${pattern} missing from ${path})"
  fi
}

check_search_absent() {
  local pattern="$1"
  local label="$2"
  shift 2
  if rg -n "${pattern}" "$@" > /tmp/deployment-audit-rg.txt; then
    fail "${label}"
    cat /tmp/deployment-audit-rg.txt
  else
    pass "${label}"
  fi
}

echo "Deployment readiness audit"
echo

check_file_exists ".github/workflows/ci.yml" "CI workflow exists"
check_file_exists ".github/workflows/deploy-staging.yml" "Staging deploy workflow exists"
check_file_exists ".github/workflows/deploy-production.yml" "Production deploy workflow exists"
check_file_absent ".github/workflows/deploy.yml" "Legacy single deploy workflow removed"

check_file_exists "scripts/check-tracked-envs.sh" "Tracked env guard helper exists"
check_file_exists "scripts/env-history-cleanup-plan.sh" "Env history cleanup helper exists"
check_file_exists "scripts/plan-branch-bootstrap.sh" "Branch bootstrap helper exists"
check_file_exists "scripts/verify-env-history-cleanup.sh" "Env history cleanup verifier exists"
check_file_exists "scripts/plan-secret-manager-bootstrap.sh" "Secret Manager bootstrap helper exists"
check_file_exists "scripts/plan-workload-identity-bootstrap.sh" "Workload Identity bootstrap helper exists"
check_file_exists "scripts/plan-github-environments-bootstrap.sh" "GitHub environment bootstrap helper exists"
check_file_exists "scripts/plan-branch-protection-bootstrap.sh" "Branch protection bootstrap helper exists"
check_file_exists "scripts/plan-firebase-hosting-bootstrap.sh" "Firebase Hosting bootstrap helper exists"
check_file_exists "scripts/plan-firebase-custom-domain-bootstrap.sh" "Firebase Hosting custom-domain bootstrap helper exists"
check_file_exists "scripts/plan-cloud-run-domain-mapping-bootstrap.sh" "Cloud Run domain mapping bootstrap helper exists"
check_file_exists "scripts/plan-cloudflare-dns-bootstrap.sh" "Cloudflare DNS bootstrap helper exists"
check_file_exists "scripts/plan-deployment-handoff.sh" "Deployment handoff helper exists"
check_file_exists "scripts/report-deployment-blockers.sh" "Deployment blocker report helper exists"
check_file_exists "scripts/plan-operator-decisions.sh" "Operator decision helper exists"
check_file_exists "scripts/plan-operator-auth-repair.sh" "Operator auth repair helper exists"
check_file_exists "scripts/verify-operator-auth.sh" "Operator auth verifier exists"
check_file_exists "scripts/verify-deployment-handoff.sh" "Deployment handoff verifier exists"
check_file_exists "scripts/verify-dns-resolution.sh" "DNS resolution verifier exists"
check_file_exists "scripts/verify-deployment-targets.sh" "Deployment target verifier exists"
check_file_exists "scripts/verify-github-deployment-setup.sh" "GitHub deployment setup verifier exists"
check_file_exists "scripts/verify-branch-protection-setup.sh" "Branch protection verifier exists"
check_file_exists "scripts/verify-gcp-deployment-setup.sh" "GCP deployment setup verifier exists"
check_file_exists "scripts/verify-firebase-hosting-setup.sh" "Firebase Hosting setup verifier exists"
check_file_exists "scripts/verify-firebase-custom-domains.sh" "Firebase custom-domain verifier exists"
check_file_exists "scripts/verify-cloudflare-zone-setup.sh" "Cloudflare zone setup verifier exists"

check_file_contains "package.json" "\"check:tracked-envs\": \"bash ./scripts/check-tracked-envs.sh\"" "Package exposes tracked env guard command"
check_file_contains "package.json" "\"plan:env-history-cleanup\": \"bash ./scripts/env-history-cleanup-plan.sh\"" "Package exposes env cleanup planner command"
check_file_contains "package.json" "\"plan:branch-bootstrap\": \"bash ./scripts/plan-branch-bootstrap.sh\"" "Package exposes branch bootstrap command"
check_file_contains "package.json" "\"plan:github-environments-bootstrap\": \"bash ./scripts/plan-github-environments-bootstrap.sh\"" "Package exposes GitHub environment bootstrap command"
check_file_contains "package.json" "\"plan:branch-protection-bootstrap\": \"bash ./scripts/plan-branch-protection-bootstrap.sh\"" "Package exposes branch protection bootstrap command"
check_file_contains "package.json" "\"plan:workload-identity-bootstrap\": \"bash ./scripts/plan-workload-identity-bootstrap.sh\"" "Package exposes Workload Identity bootstrap command"
check_file_contains "package.json" "\"plan:secret-manager-bootstrap\": \"bash ./scripts/plan-secret-manager-bootstrap.sh\"" "Package exposes Secret Manager bootstrap command"
check_file_contains "package.json" "\"plan:firebase-hosting-bootstrap\": \"bash ./scripts/plan-firebase-hosting-bootstrap.sh\"" "Package exposes Firebase Hosting bootstrap command"
check_file_contains "package.json" "\"plan:firebase-custom-domain-bootstrap\": \"bash ./scripts/plan-firebase-custom-domain-bootstrap.sh\"" "Package exposes Firebase custom-domain bootstrap command"
check_file_contains "package.json" "\"plan:cloud-run-domain-mapping-bootstrap\": \"bash ./scripts/plan-cloud-run-domain-mapping-bootstrap.sh\"" "Package exposes Cloud Run domain mapping bootstrap command"
check_file_contains "package.json" "\"plan:cloudflare-dns-bootstrap\": \"bash ./scripts/plan-cloudflare-dns-bootstrap.sh\"" "Package exposes Cloudflare DNS bootstrap command"
check_file_contains "package.json" "\"plan:operator-decisions\": \"bash ./scripts/plan-operator-decisions.sh\"" "Package exposes operator decision planner command"
check_file_contains "package.json" "\"plan:operator-auth-repair\": \"bash ./scripts/plan-operator-auth-repair.sh\"" "Package exposes operator auth repair command"
check_file_contains "package.json" "\"report:deployment-blockers\": \"bash ./scripts/report-deployment-blockers.sh\"" "Package exposes deployment blocker report command"
check_file_contains "package.json" "\"plan:deployment-handoff\": \"bash ./scripts/plan-deployment-handoff.sh\"" "Package exposes deployment handoff planner command"
check_file_contains "package.json" "\"verify:operator-auth\": \"bash ./scripts/verify-operator-auth.sh\"" "Package exposes operator auth verifier command"
check_file_contains "package.json" "\"verify:env-history-cleanup\": \"bash ./scripts/verify-env-history-cleanup.sh\"" "Package exposes env cleanup verifier command"
check_file_contains "package.json" "\"verify:github-deployment-setup\": \"bash ./scripts/verify-github-deployment-setup.sh\"" "Package exposes GitHub deployment verifier command"
check_file_contains "package.json" "\"verify:branch-protection-setup\": \"bash ./scripts/verify-branch-protection-setup.sh\"" "Package exposes branch protection verifier command"
check_file_contains "package.json" "\"verify:gcp-deployment-setup\": \"bash ./scripts/verify-gcp-deployment-setup.sh\"" "Package exposes GCP deployment verifier command"
check_file_contains "package.json" "\"verify:firebase-hosting-setup\": \"bash ./scripts/verify-firebase-hosting-setup.sh\"" "Package exposes Firebase Hosting verifier command"
check_file_contains "package.json" "\"verify:firebase-custom-domains\": \"bash ./scripts/verify-firebase-custom-domains.sh\"" "Package exposes Firebase custom-domain verifier command"
check_file_contains "package.json" "\"verify:cloudflare-zone-setup\": \"bash ./scripts/verify-cloudflare-zone-setup.sh\"" "Package exposes Cloudflare zone verifier command"
check_file_contains "package.json" "\"verify:dns-resolution\": \"bash ./scripts/verify-dns-resolution.sh\"" "Package exposes DNS resolution verifier command"
check_file_contains "package.json" "\"verify:deployment-handoff\": \"bash ./scripts/verify-deployment-handoff.sh\"" "Package exposes aggregate deployment verifier command"
check_file_contains "package.json" "\"verify:deployment-targets\": \"bash ./scripts/verify-deployment-targets.sh\"" "Package exposes deployed target verifier command"

check_file_contains "emr-portal/.env.example" "NEXT_PUBLIC_APP_URL=" "EMR example defines app URL"
check_file_contains "emr-portal/.env.example" "NEXT_PUBLIC_MARKETING_URL=" "EMR example defines marketing URL"
check_file_contains "emr-portal/.env.example" "NEXT_PUBLIC_API_URL=" "EMR example defines API URL"
check_file_contains "emr-portal/.env.example" "NEXT_PUBLIC_PACS_URL=" "EMR example defines PACS URL"

check_file_contains ".github/workflows/ci.yml" "pull_request:" "CI workflow uses pull request trigger"
check_file_contains ".github/workflows/ci.yml" "- staging" "CI workflow targets staging branch"
check_file_contains ".github/workflows/ci.yml" "- production" "CI workflow targets production branch"
check_file_contains ".github/workflows/ci.yml" "dorny/paths-filter@v3" "CI workflow uses path filters"
check_file_contains ".github/workflows/ci.yml" "- 'public/**'" "CI workflow watches public changes"
check_file_contains ".github/workflows/ci.yml" "- 'emr-portal/**'" "CI workflow watches EMR portal changes"
check_file_contains ".github/workflows/ci.yml" "- 'emr-backend/**'" "CI workflow watches EMR backend changes"
check_file_contains ".github/workflows/deploy-staging.yml" "- staging" "Staging deploy workflow targets staging branch"
check_file_contains ".github/workflows/deploy-staging.yml" "vars.ENABLE_STAGING_FIRESTORE == 'true'" "Staging workflow gates Firestore deploy behind explicit flag"
check_file_contains ".github/workflows/deploy-staging.yml" "EMR_PORTAL_ENV_SECRET_NAME" "Staging workflow fetches EMR env from Secret Manager"
check_file_contains ".github/workflows/deploy-staging.yml" "hosting:landing" "Staging workflow deploys landing hosting target"
check_file_contains ".github/workflows/deploy-staging.yml" "hosting:emr" "Staging workflow deploys EMR hosting target"
check_file_contains ".github/workflows/deploy-staging.yml" "\"\${{ vars.API_URL }}\"" "Staging workflow smoke-tests runtime config against staging API_URL variable"
check_file_contains "scripts/verify-github-deployment-setup.sh" "check_variable_value \"staging\" \"API_URL\" \"https://api.patriotictelehealth.com\"" "GitHub deployment verifier requires staging API_URL variable"
check_file_contains "scripts/verify-github-deployment-setup.sh" "check_variable_value \"staging\" \"PUBLIC_URL\" \"https://dev.patriotictelehealth.com\"" "GitHub deployment verifier checks staging PUBLIC_URL value"
check_file_contains "scripts/verify-github-deployment-setup.sh" "check_variable_value \"production\" \"PUBLIC_URL\" \"https://patriotictelehealth.com\"" "GitHub deployment verifier checks production PUBLIC_URL value"
check_file_contains "scripts/verify-branch-protection-setup.sh" "dismiss_stale_reviews == true" "Branch protection verifier requires stale review dismissal"
check_file_contains ".github/workflows/deploy-production.yml" "- production" "Production deploy workflow targets production branch"
check_file_contains ".github/workflows/deploy-production.yml" "deploy-backend:" "Production workflow includes backend deploy job"
check_file_contains ".github/workflows/deploy-production.yml" "BACKEND_ENV_SECRET_NAME" "Production workflow fetches backend env from Secret Manager"
check_file_contains ".github/workflows/deploy-production.yml" "EMR_PORTAL_ENV_SECRET_NAME" "Production workflow fetches EMR env from Secret Manager"
check_file_contains ".github/workflows/deploy-production.yml" "deploy-backend.sh" "Production workflow uses repo backend deploy script"
check_file_contains ".github/workflows/deploy-production.yml" "\"\${{ vars.API_URL }}/health\"" "Production workflow smoke-tests backend health"
check_file_contains "scripts/plan-github-environments-bootstrap.sh" "gh variable set API_URL --env staging --body https://api.patriotictelehealth.com" "GitHub bootstrap helper defines staging API_URL variable"
check_file_contains "scripts/verify-firebase-hosting-setup.sh" "const sites = (((config.targets || {})[project] || {}).hosting || {})[target] || [];" "Firebase Hosting verifier parses exact .firebaserc target mappings"
check_file_contains "scripts/verify-cloudflare-zone-setup.sh" "WWW_HANDLING_MODE=redirect|record|skip" "Cloudflare verifier exposes WWW handling mode"
check_file_contains "scripts/env-history-cleanup-plan.sh" "git clone --mirror" "Env cleanup planner recommends mirror-clone rewrite flow"
check_file_contains "firebase.json" "\"target\": \"landing\"" "Firebase config defines landing hosting target"
check_file_contains "firebase.json" "\"target\": \"emr\"" "Firebase config defines EMR hosting target"
check_file_contains "deploy-backend.sh" 'SOURCE_DIR="${BACKEND_SOURCE_DIR:-emr-backend}"' "Backend deploy script defaults to emr-backend source"

check_file_contains "public/assets/js/app-config.js" "pacsOrigin" "Public runtime config centralizes PACS origin"
check_file_contains "public/index.html" "id=\"dashBtn\"" "Landing includes the dashboard CTA hook"
check_file_contains "public/assets/js/dashboard.js" "const EMR_BASE = getEmrOrigin();" "Dashboard redirect uses centralized EMR origin"
check_file_contains "public/assets/js/auth-state.js" "const emrHref = getEmrLoginUrl();" "Auth nav uses centralized EMR login URL"
check_file_contains "emr-portal/src/lib/app-origins.ts" "getPacsOrigin" "EMR origin helper exposes PACS origin"
check_file_contains "emr-backend/src/config/app-origins.ts" "getBackendPublicOrigin" "Backend origin helper exposes backend public origin"
check_file_contains "emr-portal/next.config.js" "const defaultBackendUrl = 'https://api.patriotictelehealth.com';" "Next.js config centralizes backend default origin"
check_file_contains "emr-portal/next.config.js" "'https://pacs.patriotictelehealth.com'" "Next.js config centralizes PACS allowlist origin"
check_file_contains "emr-portal/next.config.js" "'https://patriotictelehealth.cloudflareaccess.com'" "Next.js CSP retains the documented Cloudflare Access frame allowlist"
check_file_contains "emr-portal/src/components/common/GlobalBanner.tsx" "process.env.NEXT_PUBLIC_APP_ENV" "EMR UI reads deployment environment flag"
check_file_contains "emr-portal/src/components/common/GlobalBanner.tsx" "THIS IS A TEST/STAGING ENVIRONMENT. NOT FOR PRODUCTION USE." "EMR UI renders a staging/test warning banner"
check_file_contains "scripts/verify-deployment-targets.sh" "EMR login shows staging warning banner" "Deployed target verifier checks staging banner presence"
check_file_contains "scripts/verify-deployment-targets.sh" "EMR login does not show staging warning banner" "Deployed target verifier checks production banner absence"
check_file_contains ".github/workflows/deploy-staging.yml" "Smoke test landing runtime config" "Staging workflow verifies landing runtime config"
check_file_contains ".github/workflows/deploy-staging.yml" "Smoke test EMR login" "Staging workflow verifies EMR login"
check_file_contains ".github/workflows/deploy-production.yml" "Smoke test landing runtime config" "Production workflow verifies landing runtime config"
check_file_contains ".github/workflows/deploy-production.yml" "Smoke test EMR login" "Production workflow verifies EMR login"

check_search_absent 'web\.app|run\.app' \
  "Legacy web.app and run.app hosts are absent from runtime code" \
  public/assets/js emr-portal/src emr-backend/src \
  --glob '!**/*.test.*' --glob '!**/*.spec.*'

check_search_absent 'cloudflareaccess|136\.111\.99\.153' \
  "Embedded Cloudflare Access login URLs and raw PACS IPs are absent from runtime code" \
  public/assets/js emr-portal/src \
  --glob '!**/*.test.*' --glob '!**/*.spec.*'

check_search_absent 'patriotictelehealth\.cloudflareaccess\.com' \
  "Cloudflare Access hostname is confined to the documented CSP allowlist" \
  public emr-portal emr-backend \
  --glob '!emr-portal/next.config.js' \
  --glob '!**/*.test.*' --glob '!**/*.spec.*'

check_search_absent '^  deploy-backend:' \
  "Staging workflow does not deploy backend" \
  .github/workflows/deploy-staging.yml

check_search_absent 'https://patriotictelehealth\.com/(login|waitlist|patient/scheduled|calendar|book)' \
  "Notification smoke fixtures do not hardcode production portal URLs" \
  emr-backend/src/scripts/sendgrid-notification-smoke.ts

check_search_absent '(^|[^[:alnum:]_-])backend/' \
  "Deployment surfaces do not target legacy backend/ paths" \
  .github/workflows firebase.json .firebaserc package.json deploy-backend.sh

check_search_absent 'https://(emr|api|pacs)\.patriotictelehealth\.com|https://patriotictelehealth\.com' \
  "Canonical hosts are limited to centralized helper/config files in runtime code" \
  public/assets/js emr-portal/src emr-backend/src \
  --glob '!public/assets/js/app-config.js' \
  --glob '!emr-portal/src/lib/app-origins.ts' \
  --glob '!emr-backend/src/config/app-origins.ts' \
  --glob '!**/*.test.*' --glob '!**/*.spec.*'

check_search_absent 'dev\.patriotictelehealth\.com|emr-dev\.patriotictelehealth\.com' \
  "Chosen staging hosts are limited to centralized runtime config" \
  public/assets/js emr-portal/src emr-backend/src \
  --glob '!public/assets/js/app-config.js' \
  --glob '!**/*.test.*' --glob '!**/*.spec.*'

if bash ./scripts/verify-env-history-cleanup.sh > /tmp/deployment-audit-env.txt 2>&1; then
  pass "Env history cleanup is clean"
else
  fail "Env history cleanup is still failing"
  cat /tmp/deployment-audit-env.txt
fi

echo
if (( failures > 0 )); then
  printf 'Deployment readiness audit failed with %d issue(s)\n' "${failures}"
  exit 1
fi

echo "Deployment readiness audit passed"
