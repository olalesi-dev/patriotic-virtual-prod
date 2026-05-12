#!/usr/bin/env bash
set -euo pipefail

staging_project="${STAGING_FIREBASE_PROJECT_ID:-patriotic-virtual-dev}"
production_project="${PRODUCTION_FIREBASE_PROJECT_ID:-patriotic-virtual-prod}"
staging_landing_site="${STAGING_LANDING_SITE_ID:-patriotic-virtual-dev}"
staging_emr_site="${STAGING_EMR_SITE_ID:-patriotic-virtual-dev-emr}"
production_landing_site="${PRODUCTION_LANDING_SITE_ID:-patriotic-virtual-prod}"
production_emr_site="${PRODUCTION_EMR_SITE_ID:-patriotic-virtual-emr}"

staging_public_domain="${STAGING_PUBLIC_DOMAIN:-dev.patriotictelehealth.com}"
staging_emr_domain="${STAGING_EMR_DOMAIN:-emr-dev.patriotictelehealth.com}"
production_public_domain="${PRODUCTION_PUBLIC_DOMAIN:-patriotictelehealth.com}"
production_www_domain="${PRODUCTION_WWW_DOMAIN:-www.patriotictelehealth.com}"
production_emr_domain="${PRODUCTION_EMR_DOMAIN:-emr.patriotictelehealth.com}"

cat <<EOF
Recommended Firebase Hosting custom-domain binding plan:

Prerequisites:
- the Hosting sites already exist
- run npm run plan:firebase-hosting-bootstrap first if needed
- Firebase console access to ${staging_project} and ${production_project}

Bind these custom domains in Firebase Hosting:

Staging:
- site ${staging_landing_site} in ${staging_project} -> ${staging_public_domain}
- site ${staging_emr_site} in ${staging_project} -> ${staging_emr_domain}

Production:
- site ${production_landing_site} in ${production_project} -> ${production_public_domain}
- site ${production_emr_site} in ${production_project} -> ${production_emr_domain}

Optional:
- configure ${production_www_domain} as either:
  - an additional Firebase Hosting domain on ${production_landing_site}, or
  - a Cloudflare redirect to ${production_public_domain}

Recommended operator flow in Firebase Hosting console:

1. Open Hosting site ${staging_landing_site} in project ${staging_project}
2. Add custom domain ${staging_public_domain}
3. Open Hosting site ${staging_emr_site} in project ${staging_project}
4. Add custom domain ${staging_emr_domain}
5. Open Hosting site ${production_landing_site} in project ${production_project}
6. Add custom domain ${production_public_domain}
7. Decide how ${production_www_domain} should be handled
8. Open Hosting site ${production_emr_site} in project ${production_project}
9. Add custom domain ${production_emr_domain}

For each binding:
- copy the exact TXT/CNAME/A/AAAA records shown by Firebase Hosting
- treat those records as the source of truth for Cloudflare
- do not guess the values

After all domain bindings are created:
- run npm run verify:firebase-custom-domains
- run npm run plan:cloudflare-dns-bootstrap
- copy the exact DNS records from Firebase Hosting and Cloud Run into Cloudflare
- run npm run verify:dns-resolution from a shell with outbound DNS access
- run PUBLIC_URL=https://dev.patriotictelehealth.com EMR_URL=https://emr-dev.patriotictelehealth.com API_URL=https://api.patriotictelehealth.com EXPECT_STAGING_BANNER=1 npm run verify:deployment-targets after staging cutover
- run PUBLIC_URL=https://patriotictelehealth.com EMR_URL=https://emr.patriotictelehealth.com API_URL=https://api.patriotictelehealth.com EXPECT_STAGING_BANNER=0 npm run verify:deployment-targets after production cutover

Notes:
- This helper prints the plan only. Firebase Hosting custom-domain binding is still primarily a console-driven step in this environment.
- If you bind ${production_www_domain} directly in Firebase Hosting, verify whether you want it to serve the landing site or redirect to the apex in Cloudflare.
EOF
