#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

staging_project="patriotic-virtual-dev"
production_project="patriotic-virtual-prod"

staging_emr_secret="emr-portal-env-staging"
production_emr_secret="emr-portal-env-production"
production_backend_secret="emr-backend-env-production"

cat <<EOF
Recommended Secret Manager bootstrap plan:

Preferred secret separation:
- staging secrets in ${staging_project}
- production secrets in ${production_project}

Acceptable fallback if you cannot separate by project:
- use one project, but enforce strict secret name prefixes such as staging-* and production-*

Recommended GitHub Environment variable values:

staging:
  GCP_PROJECT_ID=${staging_project}
  FIREBASE_PROJECT_ID=${staging_project}
  EMR_PORTAL_ENV_SECRET_NAME=${staging_emr_secret}

production:
  GCP_PROJECT_ID=${production_project}
  FIREBASE_PROJECT_ID=${production_project}
  EMR_PORTAL_ENV_SECRET_NAME=${production_emr_secret}
  BACKEND_ENV_SECRET_NAME=${production_backend_secret}

Suggested bootstrap flow:

1. Copy the example env files and fill in the real values:

   cp emr-portal/.env.example /tmp/${staging_emr_secret}.env
   cp emr-portal/.env.example /tmp/${production_emr_secret}.env
   cp emr-backend/.env.example /tmp/${production_backend_secret}.env

2. Edit those three files with real environment values.

   Important EMR portal values to set explicitly in each payload:
   - NEXT_PUBLIC_APP_URL
   - NEXT_PUBLIC_MARKETING_URL
   - NEXT_PUBLIC_API_URL
   - NEXT_PUBLIC_PACS_URL

3. Create the secrets if they do not exist:

   gcloud secrets create ${staging_emr_secret} --replication-policy=automatic --project=${staging_project}
   gcloud secrets create ${production_emr_secret} --replication-policy=automatic --project=${production_project}
   gcloud secrets create ${production_backend_secret} --replication-policy=automatic --project=${production_project}

4. Upload the secret payloads:

   gcloud secrets versions add ${staging_emr_secret} --data-file=/tmp/${staging_emr_secret}.env --project=${staging_project}
   gcloud secrets versions add ${production_emr_secret} --data-file=/tmp/${production_emr_secret}.env --project=${production_project}
   gcloud secrets versions add ${production_backend_secret} --data-file=/tmp/${production_backend_secret}.env --project=${production_project}

5. Verify the expected GCP-side resources:

   npm run verify:gcp-deployment-setup

Notes:

- There is intentionally no staging backend env secret in the current deployment model.
- Staging backend deploy is disabled until a separate backend runtime and separate Firestore resources exist.
- The workflow appends NEXT_PUBLIC_APP_ENV at deploy time, so that line does not need to live in the stored secret payload unless you want it there explicitly.
EOF
