#!/usr/bin/env bash
set -euo pipefail

staging_project="${STAGING_FIREBASE_PROJECT_ID:-patriotic-virtual-dev}"
production_project="${PRODUCTION_FIREBASE_PROJECT_ID:-patriotic-virtual-prod}"
staging_landing_site="${STAGING_LANDING_SITE_ID:-patriotic-virtual-dev}"
staging_emr_site="${STAGING_EMR_SITE_ID:-patriotic-virtual-dev-emr}"
production_landing_site="${PRODUCTION_LANDING_SITE_ID:-patriotic-virtual-prod}"
production_emr_site="${PRODUCTION_EMR_SITE_ID:-patriotic-virtual-emr}"

cat <<EOF
Recommended Firebase Hosting bootstrap plan:

Prerequisites:
- firebase login
- access to ${staging_project} and ${production_project}

Create the staging Hosting sites if they do not exist:

firebase hosting:sites:create ${staging_landing_site} --project ${staging_project}
firebase hosting:sites:create ${staging_emr_site} --project ${staging_project}

Create the production Hosting sites if they do not exist:

firebase hosting:sites:create ${production_landing_site} --project ${production_project}
firebase hosting:sites:create ${production_emr_site} --project ${production_project}

Current repo target mapping already expects:

- ${staging_project}/landing -> ${staging_landing_site}
- ${staging_project}/emr -> ${staging_emr_site}
- ${production_project}/landing -> ${production_landing_site}
- ${production_project}/emr -> ${production_emr_site}

If you need to re-apply those target mappings locally:

firebase target:apply hosting landing ${staging_landing_site} --project ${staging_project}
firebase target:apply hosting emr ${staging_emr_site} --project ${staging_project}
firebase target:apply hosting landing ${production_landing_site} --project ${production_project}
firebase target:apply hosting emr ${production_emr_site} --project ${production_project}

After the sites exist, verify them with:

npm run verify:firebase-hosting-setup

Next step after Hosting sites are ready:
- run npm run plan:cloudflare-dns-bootstrap
- add the custom domains in Firebase Hosting
- copy the exact verification and DNS records into Cloudflare

Notes:
- This helper prints the plan only. It does not call Firebase APIs.
- If a site already exists, firebase hosting:sites:create will fail for that site; that is expected and means you can move on to verification.
EOF
