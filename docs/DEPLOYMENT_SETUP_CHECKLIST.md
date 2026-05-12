# Deployment Setup Checklist

Use this checklist before enabling the new staging and production workflows.

If you want the quickest current-shell summary before using the checklist, run:

```bash
npm run report:deployment-blockers
```

If you want the unresolved manual decisions listed before the checklist, run:

```bash
npm run plan:operator-decisions
```

## 0. Local Operator Auth

- [ ] Run `npm run verify:operator-auth`
- [ ] If it fails, run `npm run plan:operator-auth-repair`
- [ ] Fix `gh` auth before running GitHub remote verification
- [ ] Fix `gcloud` auth/config in a writable shell before running GCP or Firebase custom-domain verification
- [ ] Fix Firebase CLI runtime/auth before running Firebase Hosting verification

## 0.5. Env Cleanup And Push

- [ ] Run `npm run check:tracked-envs`
- [ ] Run `npm run plan:env-history-cleanup`
- [ ] Rewrite Git history to purge previously committed non-example env files
- [ ] Force-push the rewritten refs
- [ ] Rotate any secret that was ever committed
- [ ] Run `npm run verify:env-history-cleanup`
- [ ] Commit the repo-side deployment workflow/helper/doc changes after the cleanup rewrite is complete
- [ ] Push the cleaned repo-side deployment changes before starting remote GitHub/GCP/Firebase/Cloudflare bootstrap

## 1. Branches

- [ ] Run `npm run plan:branch-bootstrap`
- [ ] Create `staging`
- [ ] Create `production`
- [ ] Stop using `main` as the deployment branch for this repo
- [ ] Use `emr-dev.patriotictelehealth.com`, not `dev.emr.patriotictelehealth.com`, for the staging EMR host

## 2. Branch Protection

### `staging`

- [ ] Require pull request before merge
- [ ] Require CI checks from `.github/workflows/ci.yml`:
  - `tracked-env-guard`
  - `changes`
  - `validate-public`
  - `build-emr-portal`
  - `build-emr-backend`

### `production`

- [ ] Require pull request before merge
- [ ] Require at least 1-2 reviewers
- [ ] Require CI checks from `.github/workflows/ci.yml`:
  - `tracked-env-guard`
  - `changes`
  - `validate-public`
  - `build-emr-portal`
  - `build-emr-backend`
- [ ] Restrict direct pushes

## 3. GitHub Environments

Create two GitHub Environments:

- [ ] `staging`
- [ ] `production`

### `production` environment protection

- [ ] Require manual approval before deployment

GitHub verification:

- [ ] Run `npm run verify:github-deployment-setup`
- [ ] Run `npm run verify:branch-protection-setup`

## 4. GitHub Environment Secrets

Set these secrets in both `staging` and `production` unless marked otherwise.

- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER`
- [ ] `GCP_DEPLOY_SERVICE_ACCOUNT`

## 5. GitHub Environment Variables

### `staging`

- [ ] `FIREBASE_PROJECT_ID=patriotic-virtual-dev`
- [ ] `GCP_PROJECT_ID=patriotic-virtual-dev`
- [ ] `NEXT_PUBLIC_APP_ENV=staging`
- [ ] `EMR_PORTAL_ENV_SECRET_NAME=<staging portal env secret name>`
- [ ] `PUBLIC_URL=https://dev.patriotictelehealth.com`
- [ ] `EMR_URL=https://emr-dev.patriotictelehealth.com`
- [ ] `API_URL=https://api.patriotictelehealth.com`
- [ ] `ENABLE_STAGING_FIRESTORE=true` only if staging has its own Firebase/Firestore resources

### `production`

- [ ] `FIREBASE_PROJECT_ID=patriotic-virtual-prod`
- [ ] `NEXT_PUBLIC_APP_ENV=production`
- [ ] `EMR_PORTAL_ENV_SECRET_NAME=<production portal env secret name>`
- [ ] `BACKEND_ENV_SECRET_NAME=<production backend env secret name>`
- [ ] `GCP_PROJECT_ID=patriotic-virtual-prod`
- [ ] `GCP_REGION=us-central1`
- [ ] `CLOUD_RUN_SERVICE=patriotic-virtual-backend`
- [ ] `PUBLIC_URL=https://patriotictelehealth.com`
- [ ] `EMR_URL=https://emr.patriotictelehealth.com`
- [ ] `API_URL=https://api.patriotictelehealth.com`

## 6. GCP / Firebase

Folder roles:

- `public` is the marketing homepage
- `emr-portal` is the shared Next.js EMR portal for providers and patients
- `emr-backend` is the shared Node.js backend used by both `public` and `emr-portal`

Current deploy topology:

- `public` -> Firebase Hosting target `landing`
- `emr-portal` -> Firebase Hosting target `emr`, with Firebase frameworks hosting/backend integration for the Next.js runtime
- `emr-backend` -> standalone Cloud Run service

### Staging

- [ ] Decide whether staging is frontend-only or full-stack
- [ ] If full-stack, create separate backend runtime and separate Firebase/GCP resources
- [ ] If frontend-only, keep `NEXT_PUBLIC_API_URL` pointing to production API temporarily and label the UI as staging

### Production

- [ ] Confirm Firebase Hosting targets exist for `landing` and `emr`
- [ ] Confirm Cloud Run service exists for backend
- [ ] Confirm Firestore rules and indexes are safe to deploy from GitHub Actions

GCP verification:

- [ ] Run `npm run verify:gcp-deployment-setup`

## 7. Secret Manager

- [ ] Store the EMR portal environment file in GCP Secret Manager for each environment
- [ ] Store the backend environment file in GCP Secret Manager for production
- [ ] Separate staging and production secrets by project or by secret naming convention
- [ ] Make sure Cloud Run and Firebase-hosted SSR runtime are wired to the correct environment secrets
- [ ] Preferred: keep staging secrets in `patriotic-virtual-dev` and production secrets in `patriotic-virtual-prod`
- [ ] Acceptable fallback: if you must use one project, enforce strict secret name prefixes such as `staging-*` and `production-*`
- [ ] Re-run `npm run verify:gcp-deployment-setup` after creating the secrets

Use these repo files as the source templates for the secret payloads:

- EMR portal env secret: `emr-portal/.env.example`
- backend env secret: `emr-backend/.env.example`

Required EMR portal URL values in the secret payloads:

- [ ] `NEXT_PUBLIC_APP_URL` points at the environment EMR host
- [ ] `NEXT_PUBLIC_MARKETING_URL` points at the environment marketing host
- [ ] `NEXT_PUBLIC_API_URL` points at `https://api.patriotictelehealth.com`
- [ ] `NEXT_PUBLIC_PACS_URL` points at the intended PACS host

## 8. Cloudflare / DNS

### Staging

- [ ] Point `dev.patriotictelehealth.com` to staging Firebase Hosting landing target
- [ ] Point `emr-dev.patriotictelehealth.com` to staging Firebase Hosting EMR target

### Production

- [ ] Point `patriotictelehealth.com` to production Firebase Hosting landing target
- [ ] Point `www.patriotictelehealth.com` to redirect or same hosting target
- [ ] Point `emr.patriotictelehealth.com` to production Firebase Hosting EMR target
- [ ] Run `npm run plan:cloud-run-domain-mapping-bootstrap`
- [ ] Point `api.patriotictelehealth.com` to production Cloud Run custom domain

Firebase Hosting verification:

- [ ] Run `npm run plan:firebase-hosting-bootstrap`
- [ ] Run `npm run verify:firebase-hosting-setup`
- [ ] Run `npm run plan:firebase-custom-domain-bootstrap`
- [ ] Run `npm run verify:firebase-custom-domains`
- [ ] Optional: Run `CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_NAME=patriotictelehealth.com WWW_HANDLING_MODE=redirect npm run verify:cloudflare-zone-setup`
- [ ] Run `npm run verify:dns-resolution` from a shell with outbound DNS access

### Edge settings

- [ ] Set SSL/TLS mode to `Full (strict)`
- [ ] Disable cache on `/api/*`
- [ ] Enable managed WAF rules

Post-cutover verification:

- [ ] Run `PUBLIC_URL=https://dev.patriotictelehealth.com EMR_URL=https://emr-dev.patriotictelehealth.com API_URL=https://api.patriotictelehealth.com EXPECT_STAGING_BANNER=1 npm run verify:deployment-targets`
- [ ] Run `PUBLIC_URL=https://patriotictelehealth.com EMR_URL=https://emr.patriotictelehealth.com API_URL=https://api.patriotictelehealth.com EXPECT_STAGING_BANNER=0 npm run verify:deployment-targets`

## 9. Repo Hygiene

- [ ] Keep non-example env files out of the current index after the cleanup rewrite
- [ ] Confirm `git ls-files` contains no tracked non-example `.env*` files
- [ ] Keep the split workflow/helper/docs branch committed and pushed before remote bootstrap changes continue

Local helpers already prepared in this repo:

- `npm run report:deployment-blockers`
- `npm run plan:operator-decisions`
- `npm run check:tracked-envs`
- `npm run plan:env-history-cleanup`
- `npm run plan:branch-bootstrap`
- `npm run verify:operator-auth`
- `npm run plan:operator-auth-repair`
- `npm run verify:env-history-cleanup`
- `npm run plan:secret-manager-bootstrap`
- `npm run plan:workload-identity-bootstrap`
- `npm run plan:github-environments-bootstrap`
- `npm run plan:branch-protection-bootstrap`
- `npm run plan:firebase-hosting-bootstrap`
- `npm run plan:firebase-custom-domain-bootstrap`
- `npm run plan:cloud-run-domain-mapping-bootstrap`
- `npm run plan:cloudflare-dns-bootstrap`
- `npm run plan:deployment-handoff`
- `npm run audit:deployment-readiness`
- `npm run verify:deployment-handoff`
- `npm run verify:branch-protection-setup`
- `npm run verify:cloudflare-zone-setup`
- `npm run verify:firebase-custom-domains`
- `npm run verify:dns-resolution`

## 10. Open Decision

- [ ] Confirm whether `backend/` is legacy-only or still active
