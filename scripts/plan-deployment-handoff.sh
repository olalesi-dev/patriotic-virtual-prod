#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

staging_gcp_project="patriotic-virtual-dev"
production_gcp_project="patriotic-virtual-prod"
staging_firebase_project="patriotic-virtual-dev"
production_firebase_project="patriotic-virtual-prod"
staging_public_url="https://dev.patriotictelehealth.com"
staging_emr_url="https://emr-dev.patriotictelehealth.com"
staging_api_url="https://api.patriotictelehealth.com"
production_public_url="https://patriotictelehealth.com"
production_emr_url="https://emr.patriotictelehealth.com"
production_api_url="https://api.patriotictelehealth.com"
production_api_domain="${production_api_url#https://}"

cat <<'EOF' | sed \
  -e "s#__STAGING_GCP_PROJECT__#${staging_gcp_project}#g" \
  -e "s#__PRODUCTION_GCP_PROJECT__#${production_gcp_project}#g" \
  -e "s#__STAGING_FIREBASE_PROJECT__#${staging_firebase_project}#g" \
  -e "s#__PRODUCTION_FIREBASE_PROJECT__#${production_firebase_project}#g" \
  -e "s#__STAGING_PUBLIC_URL__#${staging_public_url}#g" \
  -e "s#__STAGING_EMR_URL__#${staging_emr_url}#g" \
  -e "s#__STAGING_API_URL__#${staging_api_url}#g" \
  -e "s#__PRODUCTION_API_DOMAIN__#${production_api_domain}#g" \
  -e "s#__PRODUCTION_PUBLIC_URL__#${production_public_url}#g" \
  -e "s#__PRODUCTION_EMR_URL__#${production_emr_url}#g" \
  -e "s#__PRODUCTION_API_URL__#${production_api_url}#g"
Deployment handoff command sequence:

0. Confirm scope:
   - confirm `backend/` is legacy-only and out of deploy scope
   - the current Cloudflare session does not include the `patriotictelehealth.com` zone
   - if you want the unresolved manual decisions listed explicitly:
     npm run plan:operator-decisions

1. Check current-shell blockers:
   npm run report:deployment-blockers

2. Check operator auth prerequisites:
   npm run verify:operator-auth

   If it fails:
   npm run plan:operator-auth-repair

3. Check tracked env exposure:
   npm run check:tracked-envs

4. Print env history cleanup plan:
   npm run plan:env-history-cleanup

   After the rewrite and force-push:
   npm run verify:env-history-cleanup

5. Commit and push the repo-side deployment changes:
   - commit the local workflow, helper, and documentation changes
   - push them so GitHub has the split `ci`, `deploy-staging`, and `deploy-production` workflows before remote bootstrap

6. Print branch creation plan:
   npm run plan:branch-bootstrap

7. Print GitHub environments bootstrap plan:
   npm run plan:github-environments-bootstrap

   After applying it:
   npm run verify:github-deployment-setup

8. Print branch protection bootstrap plan:
   npm run plan:branch-protection-bootstrap

   After applying it:
   npm run verify:branch-protection-setup

9. Print Workload Identity bootstrap plan:
   npm run plan:workload-identity-bootstrap

   After applying it:
   npm run verify:gcp-deployment-setup

10. Print Secret Manager bootstrap plan:
   npm run plan:secret-manager-bootstrap

11. Print Firebase Hosting bootstrap plan:
   npm run plan:firebase-hosting-bootstrap

   After applying it:
   npm run verify:firebase-hosting-setup

12. Print Firebase Hosting custom-domain bootstrap plan:
   npm run plan:firebase-custom-domain-bootstrap

   After applying it:
   npm run verify:firebase-custom-domains

13. Print Cloud Run domain mapping bootstrap plan:
   npm run plan:cloud-run-domain-mapping-bootstrap

   After applying it:
   PRODUCTION_API_DOMAIN=__PRODUCTION_API_DOMAIN__ npm run verify:gcp-deployment-setup

14. Print Cloudflare DNS bootstrap plan:
   npm run plan:cloudflare-dns-bootstrap

   Optional API-side verification when you have Cloudflare token access:
   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_NAME=patriotictelehealth.com WWW_HANDLING_MODE=redirect npm run verify:cloudflare-zone-setup

   After DNS records are created, from a shell with outbound DNS access:
   npm run verify:dns-resolution

15. After remote setup, run the combined verification wrapper:
   npm run verify:deployment-handoff

16. After staging setup and DNS cutover, verify the staging targets:
   PUBLIC_URL=__STAGING_PUBLIC_URL__ EMR_URL=__STAGING_EMR_URL__ API_URL=__STAGING_API_URL__ EXPECT_STAGING_BANNER=1 npm run verify:deployment-targets

17. After production setup and DNS cutover, verify the production targets:
   PUBLIC_URL=__PRODUCTION_PUBLIC_URL__ EMR_URL=__PRODUCTION_EMR_URL__ API_URL=__PRODUCTION_API_URL__ EXPECT_STAGING_BANNER=0 npm run verify:deployment-targets

Read alongside:
- docs/DEPLOYMENT_HANDOFF.md
- docs/DEPLOYMENT_OPERATOR_RUNBOOK.md
- docs/DEPLOYMENT_SETUP_CHECKLIST.md
- docs/DEPLOYMENT_REQUIREMENTS_AUDIT.md
- docs/DEPLOYMENT_PROMPT_ARTIFACT_CHECKLIST.md
EOF

for helper in \
  report:deployment-blockers \
  plan:operator-decisions \
  verify:operator-auth \
  plan:operator-auth-repair \
  check:tracked-envs \
  plan:env-history-cleanup \
  plan:branch-bootstrap \
  plan:github-environments-bootstrap \
  plan:branch-protection-bootstrap \
  plan:workload-identity-bootstrap \
  plan:secret-manager-bootstrap \
  plan:firebase-hosting-bootstrap \
  plan:firebase-custom-domain-bootstrap \
  plan:cloud-run-domain-mapping-bootstrap \
  plan:cloudflare-dns-bootstrap
do
  echo
  echo "============================================================"
  echo "npm run ${helper}"
  echo "============================================================"
  (cd "${repo_root}" && npm run "${helper}") || true
done
