#!/usr/bin/env bash
set -euo pipefail

production_project="patriotic-virtual-prod"
staging_project="patriotic-virtual-dev"
pool_id="github-actions"
provider_id="github-oidc"
service_account_name="github-actions-deployer"
origin_url="$(git remote get-url origin 2>/dev/null || true)"
repo_slug="$(
  printf '%s\n' "${origin_url}" \
    | sed -E 's#^git@github\.com:##; s#^https://github\.com/##; s#\.git$##'
)"
if [[ -z "${repo_slug}" ]]; then
  repo_slug="OWNER/REPO"
fi

cat <<EOF
Recommended GCP bootstrap plan for GitHub Actions OIDC:

Shared naming:
  workload identity pool: ${pool_id}
  workload identity provider: ${provider_id}
  deploy service account: ${service_account_name}

Production project commands:

1. Create the deploy service account:

   gcloud iam service-accounts create ${service_account_name} \\
     --project=${production_project} \\
     --display-name="GitHub Actions Deployer"

2. Create the workload identity pool:

   gcloud iam workload-identity-pools create ${pool_id} \\
     --project=${production_project} \\
     --location=global \\
     --display-name="GitHub Actions Pool"

3. Create the GitHub OIDC provider:

   gcloud iam workload-identity-pools providers create-oidc ${provider_id} \\
     --project=${production_project} \\
     --location=global \\
     --workload-identity-pool=${pool_id} \\
     --display-name="GitHub OIDC Provider" \\
     --issuer-uri="https://token.actions.githubusercontent.com" \\
     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref"

4. Allow the GitHub repo to impersonate the deploy service account:

   gcloud iam service-accounts add-iam-policy-binding \\
     ${service_account_name}@${production_project}.iam.gserviceaccount.com \\
     --project=${production_project} \\
     --role=roles/iam.workloadIdentityUser \\
     --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/${pool_id}/attribute.repository/${repo_slug}"

5. Grant deploy roles to the service account:

   gcloud projects add-iam-policy-binding ${production_project} \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com" \\
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding ${production_project} \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com" \\
     --role="roles/firebase.admin"

   gcloud projects add-iam-policy-binding ${production_project} \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com" \\
     --role="roles/datastore.indexAdmin"

   gcloud projects add-iam-policy-binding ${production_project} \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com" \\
     --role="roles/secretmanager.secretAccessor"

   gcloud projects add-iam-policy-binding ${production_project} \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com" \\
     --role="roles/logging.viewer"

6. Allow Cloud Build / source deploy support:

   gcloud projects add-iam-policy-binding ${production_project} \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com" \\
     --role="roles/cloudbuild.builds.editor"

   gcloud projects add-iam-policy-binding ${production_project} \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com" \\
     --role="roles/storage.admin"

7. If Cloud Run deploys use a runtime service account, also grant:

   gcloud iam service-accounts add-iam-policy-binding \\
     RUNTIME_SERVICE_ACCOUNT@${production_project}.iam.gserviceaccount.com \\
     --project=${production_project} \\
     --role=roles/iam.serviceAccountUser \\
     --member="serviceAccount:${service_account_name}@${production_project}.iam.gserviceaccount.com"

Recommended GitHub environment values after bootstrap:

production:
  GCP_WORKLOAD_IDENTITY_PROVIDER=projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/${pool_id}/providers/${provider_id}
  GCP_DEPLOY_SERVICE_ACCOUNT=${service_account_name}@${production_project}.iam.gserviceaccount.com

staging:
  Either repeat the same pattern in ${staging_project}
  or create a separate deploy service account and pool/provider there.

Important placeholders you must replace:
  PROJECT_NUMBER
  RUNTIME_SERVICE_ACCOUNT

Notes:
- This script does not execute any GCP changes. It only prints the plan.
- If you restrict deploys by branch, add an attribute condition at provider creation time for refs like refs/heads/staging or refs/heads/production.
EOF
