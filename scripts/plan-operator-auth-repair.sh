#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
Operator auth repair plan

1. Repair GitHub CLI auth:

   gh auth login -h github.com

2. Repair gcloud auth/config in a writable shell:

   export CLOUDSDK_CONFIG=/tmp/patriotic-gcloud-config
   mkdir -p "${CLOUDSDK_CONFIG}"
   gcloud auth login

   Optional validation:

   gcloud auth print-access-token >/dev/null

3. Repair Firebase CLI runtime/auth in an unrestricted shell:

   export XDG_CACHE_HOME=/tmp/patriotic-firebase-cache
   mkdir -p "${XDG_CACHE_HOME}"
   firebase login

   Optional validation:

   firebase projects:list --json

4. Re-run the repo preflight:

   npm run verify:operator-auth
EOF
