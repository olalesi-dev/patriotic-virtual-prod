#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

operator_auth_failed=0
env_cleanup_failed=0
readiness_failed=0

echo "Current deployment blocker report"
echo

echo "1. Operator auth/runtime"
if npm run verify:operator-auth >/tmp/deployment-blockers-auth.txt 2>&1; then
  echo "PASS operator auth/runtime is ready"
else
  operator_auth_failed=1
  echo "FAIL operator auth/runtime is blocking remote verification"
  sed -n '1,120p' /tmp/deployment-blockers-auth.txt
fi

echo
echo "2. Env history cleanup"
if npm run verify:env-history-cleanup >/tmp/deployment-blockers-env.txt 2>&1; then
  echo "PASS env cleanup is complete"
else
  env_cleanup_failed=1
  echo "FAIL env cleanup is still blocking deployment readiness"
  sed -n '1,120p' /tmp/deployment-blockers-env.txt
fi

echo
echo "3. Repo readiness audit"
if npm run audit:deployment-readiness >/tmp/deployment-blockers-audit.txt 2>&1; then
  echo "PASS repo-side readiness audit is clean"
else
  readiness_failed=1
  echo "FAIL repo-side readiness audit is not clean"
  if (( env_cleanup_failed > 0 )) && rg -q -e "Env history cleanup is still failing" -e "Tracked env guard is still failing" /tmp/deployment-blockers-audit.txt; then
    echo "The current repo-side audit failure is the same env-cleanup blocker shown above."
  else
    sed -n '1,120p' /tmp/deployment-blockers-audit.txt
  fi
fi

echo
echo "Recommended next commands:"
echo "  - npm run plan:operator-decisions"
if (( operator_auth_failed > 0 )); then
  echo "  - npm run plan:operator-auth-repair"
fi
if (( env_cleanup_failed > 0 )); then
  echo "  - npm run plan:env-history-cleanup"
fi
if (( readiness_failed > 0 )) && (( env_cleanup_failed == 0 )); then
  echo "  - npm run audit:deployment-readiness"
fi
echo "  - npm run plan:deployment-handoff"

echo
echo "4. Manual external blockers not auto-verified here"
echo "WARN Cloudflare zone access still needs a real token/zone check"
echo "  - use: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_NAME=patriotictelehealth.com npm run verify:cloudflare-zone-setup"
echo "WARN backend scope still needs explicit confirmation"
echo "  - confirm that backend/ is legacy-only and out of deploy scope"

echo
echo "Ordered operator to-do:"
echo "  1. Run: npm run plan:operator-decisions"
echo "  2. Run: npm run plan:operator-auth-repair"
echo "  3. Repair gh, gcloud, and Firebase CLI access in a writable/unrestricted shell"
echo "  4. Run: npm run plan:env-history-cleanup"
echo "  5. Execute the printed git history rewrite in a fresh mirror clone, then force-push and rotate exposed secrets"
echo "  6. Commit and push the repo-side deployment changes so GitHub has the new workflows/helpers"
echo "  7. Confirm backend/ is legacy-only and out of deploy scope"
echo "  8. Get access to the real patriotictelehealth.com Cloudflare zone"
echo "  9. Run: npm run plan:deployment-handoff"

echo
if (( operator_auth_failed > 0 || env_cleanup_failed > 0 || readiness_failed > 0 )); then
  echo "Deployment blockers remain"
  exit 1
fi

echo "No local deployment blockers detected"
