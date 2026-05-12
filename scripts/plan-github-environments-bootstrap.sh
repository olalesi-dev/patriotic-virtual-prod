#!/usr/bin/env bash
set -euo pipefail

origin_url="$(git remote get-url origin 2>/dev/null || true)"
repo_slug="$(
  printf '%s\n' "${origin_url}" \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##'
)"
if [[ -z "${repo_slug}" ]]; then
  repo_slug="OWNER/REPO"
fi

cat <<EOF
Recommended GitHub bootstrap flow using GitHub CLI:

Prerequisites:
- gh auth login
- gh repo set-default ${repo_slug}

1. Create the environments:

   gh api --method PUT repos/${repo_slug}/environments/staging
   gh api --method PUT repos/${repo_slug}/environments/production

2. Set staging environment variables:

   gh variable set FIREBASE_PROJECT_ID --env staging --body patriotic-virtual-dev
   gh variable set GCP_PROJECT_ID --env staging --body patriotic-virtual-dev
   gh variable set NEXT_PUBLIC_APP_ENV --env staging --body staging
   gh variable set EMR_PORTAL_ENV_SECRET_NAME --env staging --body emr-portal-env-staging
   gh variable set PUBLIC_URL --env staging --body https://dev.patriotictelehealth.com
   gh variable set EMR_URL --env staging --body https://emr-dev.patriotictelehealth.com
   gh variable set API_URL --env staging --body https://api.patriotictelehealth.com
   gh variable set ENABLE_STAGING_FIRESTORE --env staging --body false

3. Set production environment variables:

   gh variable set FIREBASE_PROJECT_ID --env production --body patriotic-virtual-prod
   gh variable set GCP_PROJECT_ID --env production --body patriotic-virtual-prod
   gh variable set NEXT_PUBLIC_APP_ENV --env production --body production
   gh variable set EMR_PORTAL_ENV_SECRET_NAME --env production --body emr-portal-env-production
   gh variable set BACKEND_ENV_SECRET_NAME --env production --body emr-backend-env-production
   gh variable set GCP_REGION --env production --body us-central1
   gh variable set CLOUD_RUN_SERVICE --env production --body patriotic-virtual-backend
   gh variable set PUBLIC_URL --env production --body https://patriotictelehealth.com
   gh variable set EMR_URL --env production --body https://emr.patriotictelehealth.com
   gh variable set API_URL --env production --body https://api.patriotictelehealth.com

4. Set deploy identity secrets after GCP bootstrap:

   gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --env staging --body 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER'
   gh secret set GCP_DEPLOY_SERVICE_ACCOUNT --env staging --body 'SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com'

   gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --env production --body 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER'
   gh secret set GCP_DEPLOY_SERVICE_ACCOUNT --env production --body 'SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com'

5. Production environment protection:

   Configure required reviewers and deployment approval in the GitHub UI:
   Settings -> Environments -> production

6. Branch protection:

   Configure in GitHub UI or with gh api:
   - staging: require pull requests and ci.yml
   - production: require pull requests, reviewers, ci.yml, and block direct pushes

Notes:
- This helper does not execute any GitHub changes. It only prints the plan.
- If staging gets its own backend later, add the backend env secret name and API URL there too.
EOF
