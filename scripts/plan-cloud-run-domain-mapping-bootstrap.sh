#!/usr/bin/env bash
set -euo pipefail

production_project="${PRODUCTION_GCP_PROJECT_ID:-patriotic-virtual-prod}"
production_region="${PRODUCTION_GCP_REGION:-us-central1}"
cloud_run_service="${CLOUD_RUN_SERVICE_NAME:-patriotic-virtual-backend}"
api_domain="${PRODUCTION_API_DOMAIN:-api.patriotictelehealth.com}"

cat <<EOF
Recommended Cloud Run custom domain bootstrap plan:

Prerequisites:
- gcloud auth login
- access to ${production_project}
- the Cloud Run service ${cloud_run_service} already exists in ${production_region}

Create the production API domain mapping:

gcloud beta run domain-mappings create \\
  --service=${cloud_run_service} \\
  --domain=${api_domain} \\
  --project=${production_project} \\
  --region=${production_region}

After the mapping is created, inspect the generated DNS records:

gcloud beta run domain-mappings describe \\
  --domain=${api_domain} \\
  --project=${production_project} \\
  --region=${production_region}

Use the DNS records shown in the domain mapping status as the source of truth for Cloudflare.
Do not guess them.

After the mapping exists, verify it with:

PRODUCTION_API_DOMAIN=${api_domain} \\
npm run verify:gcp-deployment-setup

Next step after the mapping exists:
- run npm run plan:cloudflare-dns-bootstrap
- copy the exact domain verification and routing records into Cloudflare
- run npm run verify:dns-resolution from a shell with outbound DNS access

Notes:
- This helper prints the plan only. It does not call gcloud.
- Cloud Run domain mapping commands are currently under gcloud beta in this environment.
EOF
