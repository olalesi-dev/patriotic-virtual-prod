#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
Operator decisions still required before remote deployment bootstrap:

1. Confirm backend scope
   - confirm `backend/` is legacy-only and out of deploy scope
   - if `backend/` is still active, stop and define its deployment lifecycle separately before using the new pipeline

2. Confirm staging backend mode
   Choose one:
   - frontend-only staging now
     - `public` -> https://dev.patriotictelehealth.com
     - `emr-portal` -> https://emr-dev.patriotictelehealth.com
     - `emr-backend` stays production-only at https://api.patriotictelehealth.com
   - full-stack staging later
     - create separate backend runtime and separate Firebase/GCP resources in `patriotic-virtual-dev`
     - only then allow a true staging backend deploy path

3. Confirm the chosen staging hostname convention
   - use `staging`, not `development`, for the non-production branch
   - use `emr-dev.patriotictelehealth.com`, not `dev.emr.patriotictelehealth.com`, for the staging EMR host

4. Confirm apex/www behavior
   Choose one:
   - redirect `www.patriotictelehealth.com` -> `patriotictelehealth.com`
   - serve both hosts from the same production landing target

5. Confirm Cloudflare access owner
   - identify who controls the live `patriotictelehealth.com` Cloudflare zone
   - get edit access or a token with zone/DNS read+write for the bootstrap and verification steps

6. Confirm secret-rotation approval
   - approve rotation for every value that ever lived in the tracked env files after the history rewrite/force-push

After these decisions are explicit, continue with:
- npm run report:deployment-blockers
- npm run plan:deployment-handoff
EOF
