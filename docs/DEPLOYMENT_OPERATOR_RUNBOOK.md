# Deployment Operator Runbook

Use this in order. Do not skip ahead.

If you want a one-command summary of the current local blockers before starting, run:

```bash
npm run report:deployment-blockers
```

If you want the unresolved manual decisions listed separately before the technical bootstrap, run:

```bash
npm run plan:operator-decisions
```

## 0. Verify Local Operator Auth

Run:

```bash
npm run verify:operator-auth
```

This must pass before you rely on the GitHub, GCP, or Firebase remote verifiers. In the current shell, it is expected to fail on invalid `gh` auth, unwritable `gcloud` config, and Firebase CLI runtime/auth problems.

If it fails, print the recommended recovery commands:

```bash
npm run plan:operator-auth-repair
```

## 1. Decide The Live Topology

- Folder roles in this repo:
  - `public` is the marketing homepage
  - `emr-portal` is the shared Next.js EMR portal for providers and patients
  - `emr-backend` is the shared Node.js backend used by both `public` and `emr-portal`
- Confirm `backend/` is legacy-only or out of scope.
- Current evidence points to `emr-backend/` as the active backend and `backend/` as an older standalone app that is excluded from the current deploy workflows.
- Actual deploy topology in this repo:
  - `public` deploys directly to Firebase Hosting target `landing`
  - `emr-portal` deploys to Firebase Hosting target `emr`, with Firebase frameworks hosting/backend integration handling the Next.js runtime
  - `emr-backend` deploys to a standalone Cloud Run service
- Use `staging` as the non-production branch.
- Use `production` as the live branch.
- Use `emr-dev.patriotictelehealth.com` for staging EMR.
- Keep `api.patriotictelehealth.com` production-only until you have a separate backend runtime and separate Firestore project for staging.

## 2. Purge Tracked Env Files From Git History

The repo-side deletion is already prepared, but history cleanup still needs to happen.

Recommended tool: `git filter-repo`, but run it in a fresh mirror clone rather than this working checkout.

Helper commands prepared in this repo:

```bash
npm run report:deployment-blockers
npm run plan:operator-decisions
npm run check:tracked-envs
npm run plan:env-history-cleanup
npm run plan:branch-bootstrap
npm run verify:operator-auth
npm run plan:operator-auth-repair
npm run verify:env-history-cleanup
npm run plan:secret-manager-bootstrap
npm run plan:workload-identity-bootstrap
npm run plan:github-environments-bootstrap
npm run plan:branch-protection-bootstrap
npm run plan:firebase-hosting-bootstrap
npm run plan:firebase-custom-domain-bootstrap
npm run plan:cloud-run-domain-mapping-bootstrap
npm run plan:cloudflare-dns-bootstrap
npm run plan:deployment-handoff
npm run audit:deployment-readiness
npm run verify:deployment-handoff
```

Recommended safe rewrite flow:

```bash
git clone --mirror git@github.com:olalesi-dev/patriotic-virtual-prod.git patriotic-virtual-prod-history-cleanup.git
cd patriotic-virtual-prod-history-cleanup.git
```

Inside that mirror clone, run:

```bash
git filter-repo \
  --path emr-portal/.env.dev \
  --path emr-portal/.env.production \
  --path emr-portal/.env.test \
  --invert-paths
```

Then force-push the rewritten mirror:

```bash
git push --force --mirror origin
```

After that:

- rotate every secret that ever lived in those files
- verify `git ls-files | grep -E '(^|/)\.env($|(\.[^/]+)$)' | grep -vE '(^|/)\.env\.example$'` returns nothing
- re-run `npm run audit:deployment-readiness` and expect it to pass this check
- run `npm run verify:env-history-cleanup` and expect it to pass both the current-index and Git-history checks

## 3. Commit And Push The Cleaned Repo Changes

- Commit the repo-side workflow, helper, and documentation changes after the env cleanup rewrite is complete.
- Push the cleaned branch state so GitHub has the split `ci`, `deploy-staging`, and `deploy-production` workflows before remote bootstrap begins.

## 4. Create Branches

Run:

```bash
npm run plan:branch-bootstrap
```

Then execute the printed commands.

## 5. Create GitHub Environments

Create:

- `staging`
- `production`

Set environment variables:

- `staging`
- `FIREBASE_PROJECT_ID=patriotic-virtual-dev`
- `NEXT_PUBLIC_APP_ENV=staging`
- `API_URL=https://api.patriotictelehealth.com`
- `ENABLE_STAGING_FIRESTORE=true` only if staging has its own Firebase resources

- `production`
- `FIREBASE_PROJECT_ID=patriotic-virtual-prod`
- `NEXT_PUBLIC_APP_ENV=production`
- `GCP_PROJECT_ID=patriotic-virtual-prod`
- `GCP_REGION=us-central1`
- `CLOUD_RUN_SERVICE=patriotic-virtual-backend`
- `PUBLIC_URL=https://patriotictelehealth.com`
- `EMR_URL=https://emr.patriotictelehealth.com`
- `API_URL=https://api.patriotictelehealth.com`

Set the secrets listed in [DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1).

Exact GitHub CLI commands are printed by:

```bash
npm run plan:github-environments-bootstrap
```

After applying them, verify the remote state with:

```bash
npm run verify:github-deployment-setup
```

## 6. Protect Branches In GitHub

- `staging`
- Require pull request merges
- Require these CI checks from `.github/workflows/ci.yml`:
  - `tracked-env-guard`
  - `changes`
  - `validate-public`
  - `build-emr-portal`
  - `build-emr-backend`

- `production`
- Require pull request merges
- Require reviewer approval
- Require these CI checks from `.github/workflows/ci.yml`:
  - `tracked-env-guard`
  - `changes`
  - `validate-public`
  - `build-emr-portal`
  - `build-emr-backend`
- Block direct pushes
- Require GitHub Environment approval for `production`

Exact GitHub CLI examples are printed by:

```bash
npm run plan:branch-protection-bootstrap
```

After applying them, verify the remote branch protection state with:

```bash
npm run verify:branch-protection-setup
```

## 7. Configure GCP Authentication

- Create or choose the deploy service account
- Grant it the minimum roles needed for:
- Firebase Hosting deploy
- Firestore rules/index deploy
- Cloud Run deploy
- Artifact build if required by your Cloud Run source deploy path

- Configure Workload Identity Federation for GitHub Actions
- Put these values into both GitHub Environments:
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`

Exact bootstrap commands are printed by:

```bash
npm run plan:workload-identity-bootstrap
```

After applying them, verify the remote GCP state with:

```bash
npm run verify:gcp-deployment-setup
```

## 8. Configure Secret Manager

Preferred:

- `patriotic-virtual-dev` holds staging secrets
- `patriotic-virtual-prod` holds production secrets

Acceptable fallback:

- one project with strict secret name prefixes such as `staging-*` and `production-*`

Do not put server-side credentials back into repo env files.

Build the secret payloads from the repo examples:

- staging EMR portal secret payload -> start from [emr-portal/.env.example](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/.env.example:1)
- production EMR portal secret payload -> start from [emr-portal/.env.example](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/.env.example:1)
- production backend secret payload -> start from [emr-backend/.env.example](/home/zeus/Projects/patriotic-virtual-prod/emr-backend/.env.example:1)

Exact bootstrap commands are printed by:

```bash
npm run plan:secret-manager-bootstrap
```

Minimum production backend values that must be valid for deploy plus smoke checks:

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `FRONTEND_URL=https://emr.patriotictelehealth.com`
- `MARKETING_URL=https://patriotictelehealth.com`
- `BACKEND_PUBLIC_URL=https://api.patriotictelehealth.com`
- Firebase admin credentials

Minimum EMR portal URL values that must be valid in the stored env payloads:

- staging:
  - `NEXT_PUBLIC_APP_URL=https://emr-dev.patriotictelehealth.com`
  - `NEXT_PUBLIC_MARKETING_URL=https://dev.patriotictelehealth.com`
  - `NEXT_PUBLIC_API_URL=https://api.patriotictelehealth.com`
  - `NEXT_PUBLIC_PACS_URL=https://pacs.patriotictelehealth.com`

- production:
  - `NEXT_PUBLIC_APP_URL=https://emr.patriotictelehealth.com`
  - `NEXT_PUBLIC_MARKETING_URL=https://patriotictelehealth.com`
  - `NEXT_PUBLIC_API_URL=https://api.patriotictelehealth.com`
  - `NEXT_PUBLIC_PACS_URL=https://pacs.patriotictelehealth.com`

## 9. Create Firebase Hosting Sites

Create or confirm these Hosting sites:

- `patriotic-virtual-dev`
- `patriotic-virtual-dev-emr`
- `patriotic-virtual-prod`
- `patriotic-virtual-emr`

Exact bootstrap commands are printed by:

```bash
npm run plan:firebase-hosting-bootstrap
```

After the sites are created or confirmed, verify them with:

```bash
npm run verify:firebase-hosting-setup
```

## 10. Bind Firebase Hosting Custom Domains

Bind these domains in Firebase Hosting:

- `dev.patriotictelehealth.com` -> `patriotic-virtual-dev`
- `emr-dev.patriotictelehealth.com` -> `patriotic-virtual-dev-emr`
- `patriotictelehealth.com` -> `patriotic-virtual-prod`
- `emr.patriotictelehealth.com` -> `patriotic-virtual-emr`

Exact operator guidance is printed by:

```bash
npm run plan:firebase-custom-domain-bootstrap
```

Use the exact TXT/CNAME/A/AAAA records shown by Firebase Hosting as the source of truth for Cloudflare.

After the bindings are created, verify them with:

```bash
npm run verify:firebase-custom-domains
```

## 11. Create Cloud Run API Domain Mapping

Create or confirm the production API custom domain mapping:

- `api.patriotictelehealth.com` -> `patriotic-virtual-backend`

Exact bootstrap commands are printed by:

```bash
npm run plan:cloud-run-domain-mapping-bootstrap
```

After the mapping is created, verify it through the GCP verifier:

```bash
PRODUCTION_API_DOMAIN=api.patriotictelehealth.com \
npm run verify:gcp-deployment-setup
```

## 12. Configure DNS In Cloudflare

Create or verify:

- `dev.patriotictelehealth.com` -> staging Firebase Hosting `landing`
- `emr-dev.patriotictelehealth.com` -> staging Firebase Hosting `emr`
- `patriotictelehealth.com` -> production Firebase Hosting `landing`
- `www.patriotictelehealth.com` -> redirect to apex or same hosting target
- `emr.patriotictelehealth.com` -> production Firebase Hosting `emr`
- `api.patriotictelehealth.com` -> production Cloud Run custom domain

Edge settings:

- SSL/TLS `Full (strict)`
- cache bypass for `/api/*`
- managed WAF enabled

Exact DNS cutover guidance is printed by:

```bash
npm run plan:cloudflare-dns-bootstrap
```

If you have Cloudflare API token access to the live zone, verify the expected DNS record names through the API too:

```bash
CLOUDFLARE_API_TOKEN=... \
CLOUDFLARE_ZONE_NAME=patriotictelehealth.com \
WWW_HANDLING_MODE=redirect \
npm run verify:cloudflare-zone-setup
```

Then verify DNS resolution from a shell with outbound DNS access:

```bash
npm run verify:dns-resolution
```

## 13. Enable Deployments

- Merge the repo changes to `staging`
- Validate `public` and `emr-portal` staging deploys
- If staging is frontend-only, confirm the UI clearly shows it is staging
- Merge from `staging` to `production`
- Approve the production environment deployment

## 14. Post-Cutover Checks

- `https://patriotictelehealth.com`
- `https://emr.patriotictelehealth.com/login`
- `https://api.patriotictelehealth.com/health`
- DNS resolves for the staging and production public, EMR, and API hosts
- landing dashboard button routes to EMR
- staging landing routes to staging EMR
- notification links open EMR URLs, not the marketing site

Run the scripted verifier too:

```bash
PUBLIC_URL=https://dev.patriotictelehealth.com \
EMR_URL=https://emr-dev.patriotictelehealth.com \
API_URL=https://api.patriotictelehealth.com \
EXPECT_STAGING_BANNER=1 \
npm run verify:deployment-targets

PUBLIC_URL=https://patriotictelehealth.com \
EMR_URL=https://emr.patriotictelehealth.com \
API_URL=https://api.patriotictelehealth.com \
EXPECT_STAGING_BANNER=0 \
npm run verify:deployment-targets
```

For one combined remote-state verification pass after the bootstrap steps, run:

```bash
npm run verify:deployment-handoff
```
