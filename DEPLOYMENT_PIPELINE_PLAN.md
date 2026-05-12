# Deployment Pipeline Plan

Date: 2026-05-12

## Prepared In This Branch

The repo-side preparation already completed in this branch includes:

- replacement of the old single `deploy.yml` flow with `ci.yml`, `deploy-staging.yml`, and `deploy-production.yml`
- tracked env cleanup guards, planners, and verifiers for `emr-portal/.env.dev`, `emr-portal/.env.production`, and `emr-portal/.env.test`
- centralized runtime origin helpers for `public`, `emr-portal`, and `emr-backend`
- removal of the build-time `next/font/google` dependency in `emr-portal/src/app/layout.tsx`, so local and CI builds do not depend on fetching `Inter` from Google Fonts

The remaining items in this document are the still-open operator and infrastructure tasks.

## 1. Current State

### Repo surfaces

- `public/`
  - Static marketing/landing site.
  - Deployed through Firebase Hosting target `landing`.
- `emr-portal/`
  - Next.js 14 application for providers and patients.
  - Deployed through Firebase Hosting target `emr`.
  - Uses Firebase webframeworks hosting with a generated backend.
- `emr-backend/`
  - Express + TypeScript API.
  - Intended Cloud Run backend for both `public` and `emr-portal`.
- `backend/`
  - Legacy Node app still present in the repo.
  - Not part of the current GitHub Actions deploy path.
  - Must be explicitly classified as `legacy` or `active` before pipeline work is finalized.

### Current deployment automation

- `.github/workflows/ci.yml`
  - runs on pull requests into `staging` and `production`
  - blocks tracked non-example env files
  - validates only the affected repo surfaces via path filters
- `.github/workflows/deploy-staging.yml`
  - deploys on push to `staging`
  - deploys Firebase Hosting `landing`
  - deploys Firebase Hosting `emr`
  - optionally deploys Firestore only when `ENABLE_STAGING_FIRESTORE=true`
  - intentionally does not deploy `emr-backend`
- `.github/workflows/deploy-production.yml`
  - deploys on push to `production`
  - deploys Firestore rules/indexes
  - deploys `emr-backend` to Cloud Run
  - deploys Firebase Hosting `landing`
  - deploys Firebase Hosting `emr`
  - runs post-deploy smoke checks for landing, EMR login, and backend health

These workflows are prepared in the repo, but live verification is still blocked until the remote branches, GitHub environments, auth, and cloud resources are created.

### Current secret exposure risk

Tracked env-related files currently found in Git:

- `.env.example`
- `emr-backend/.env.example`
- `emr-portal/.env.example`

Tracked non-example env files no longer remain in the current index.

The remaining env-cleanup risk is Git history contamination for:

- `emr-portal/.env.dev`
- `emr-portal/.env.production`
- `emr-portal/.env.test`

Important:

- `.gitignore` already ignores `.env.*`, but tracked files stay tracked until removed from Git history and the index.
- Removing these files from the current branch is not enough if real secrets were already pushed. Secret rotation is required.
- `npm run verify:env-history-cleanup` currently reports:
  - current index contains no tracked non-example env files
  - Git history still contains `emr-portal/.env.dev`
  - Git history still contains `emr-portal/.env.production`
  - Git history still contains `emr-portal/.env.test`

### Current redirect/runtime drift

This branch already centralized the main redirect/runtime paths:

- `public/assets/js/app-config.js`
  - now chooses `emrOrigin`, `apiOrigin`, and `pacsOrigin` by runtime environment
- `public/assets/js/dashboard.js`
  - dashboard redirect now uses the shared EMR origin helper
- `public/assets/js/provider-admin.js`
  - PACS viewer URL now derives from the shared PACS origin instead of a baked Cloudflare Access login URL or raw IP
- `emr-portal/src/lib/app-origins.ts`
  - now centralizes EMR, marketing, backend, and PACS origins
- `emr-backend/src/config/app-origins.ts`
  - now centralizes backend, EMR, and marketing origins

Remaining hard-coded domain strings are now mostly intentional defaults, contact addresses, or third-party service endpoints rather than scattered app-to-app redirect targets.

## 2. Recommended Environment Model

### Branch naming

Use `staging`, not `development`.

Reason:

- the branch represents a deployable validation environment, not day-to-day unfinished work
- `staging` matches the approval flow you want
- `development` is too ambiguous once multiple folders deploy independently

Recommended branch model:

- `staging`
  - auto deploy to non-production domains
  - used for QA and stakeholder review
- `production`
  - protected branch
  - only updated through reviewed PR/merge from `staging`
  - deploys live domains

## 3. Critical Constraint

Do not auto-deploy `emr-backend` from `staging` to `api.patriotictelehealth.com`.

Why:

- your own requirement says dev cannot use `dev.api...` because backend points to a single Firestore
- that means a staging backend deploy would overwrite the same production API used by live traffic
- that is not a safe staging pipeline

Therefore:

- `public` and `emr-portal` can have staging domains now
- `emr-backend` should deploy from `production` only until a separate backend environment exists
- if you want true staging parity, create a separate backend runtime and separate Firebase/GCP project for staging

## 4. Best-Practice Target State

### Recommended domains

Production:

- `patriotictelehealth.com` -> Firebase Hosting `landing`
- `www.patriotictelehealth.com` -> redirect to apex or same landing site
- `emr.patriotictelehealth.com` -> Firebase Hosting `emr`
- `api.patriotictelehealth.com` -> Cloud Run custom domain for `emr-backend`

Staging:

- `dev.patriotictelehealth.com` -> Firebase Hosting staging `landing`
- `emr-dev.patriotictelehealth.com` -> Firebase Hosting staging `emr`

Avoid:

- `dev.emr.patriotictelehealth.com`

Reason:

- `emr-dev...` is simpler to read and manage than nesting `dev` under `emr`

### GCP/Firebase separation

Preferred:

- staging project: `patriotic-virtual-dev`
- production project: `patriotic-virtual-prod`

This already aligns with `.firebaserc` project aliases.

### Backend environments

Preferred:

- staging backend service in staging GCP project
- production backend service in production GCP project
- separate Firestore/Auth/Cloud SQL resources per environment

If that is not possible immediately:

- keep staging as frontend-only
- point staging frontend to production API only as a temporary validation surface
- show a visible `STAGING` banner in the frontend
- never deploy backend from `staging`

## 5. Secrets Strategy

Use GCP Secret Manager, separated by environment.

Two acceptable models:

### Model A: separate GCP projects per environment

- staging secrets live in `patriotic-virtual-dev`
- production secrets live in `patriotic-virtual-prod`

This is the cleanest model.

### Model B: single GCP project with namespaced secrets

Examples:

- `staging-emr-portal-NEXT_PUBLIC_API_URL`
- `staging-emr-backend-STRIPE_SECRET_KEY`
- `production-emr-portal-NEXT_PUBLIC_API_URL`
- `production-emr-backend-STRIPE_SECRET_KEY`

### GitHub side

Use GitHub Environments:

- `staging`
- `production`

Store only:

- deploy identity configuration
- non-secret public config if needed

Avoid long-lived service account JSON in GitHub if possible.

Preferred auth:

- GitHub Actions OIDC
- GCP Workload Identity Federation

## 6. Pipeline Design

## Workflow A: `ci.yml`

Trigger:

- pull requests into `staging`
- pull requests into `production`
- optional push to feature branches

Jobs:

- `public-lint-or-validate` when `public/**` changes
- `emr-portal-build` when `emr-portal/**` changes
- `emr-backend-build-test` when `emr-backend/**` changes
- `firebase-config-validate` when `firebase.json`, `.firebaserc`, `firestore.rules`, or `firestore.indexes.json` change

Purpose:

- block broken deployments before merge

## Workflow B: `deploy-staging.yml`

Trigger:

- push to `staging`

Behavior:

- detect changed paths
- deploy only the affected surface

Jobs:

- `deploy-landing-staging`
  - if `public/**`, `firebase.json`, or shared landing assets changed
- `deploy-emr-staging`
  - if `emr-portal/**`, `firebase.json`, or shared hosting config changed
- `deploy-firestore-staging`
  - only if you actually maintain a separate staging Firebase project
- `deploy-backend-staging`
  - disabled until you have a separate staging backend

## Workflow C: `deploy-production.yml`

Trigger:

- push to `production`

Protection:

- GitHub Environment `production` requires approval
- branch protection requires PR reviews and passing CI

Jobs:

- `deploy-firestore-production`
- `deploy-backend-production`
- `deploy-emr-production`
- `deploy-landing-production`
- `post-deploy-smoke`

### Path filters

Use path-based execution so unrelated folders do not redeploy everything.

Rules:

- `public/**` -> deploy `landing`
- `emr-portal/**` -> deploy `emr`
- `emr-backend/**` -> deploy backend only
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` -> infra deploy path

### Concurrency

Add workflow concurrency to prevent overlapping deploys per environment.

Examples:

- `staging-deploy`
- `production-deploy`

## 7. Required Repo Cleanup Before Pipeline Cutover

### A. Remove env files from Git

Do this in order:

1. remove tracked env files from the Git index
2. merge updated `.gitignore`
3. rewrite Git history to purge env files if they contained real secrets
4. force push after team sign-off
5. rotate all exposed secrets

Current state:

- step 1 is already done in this checkout
- steps 3 through 5 are still pending

Do not skip step 5.

### B. Centralize URL configuration

Create one clear environment contract:

- landing app origin
- EMR app origin
- backend API origin
- webhook origin
- Stripe return origin

Do not leave fallback production domains hard-coded in feature files.

### C. Resolve `backend/` ownership

Choose one:

- archive/remove `backend/`
- explicitly exclude it from deployment scope
- or document it as a separate service with its own lifecycle

Right now it creates ambiguity.

## 8. Cloudflare Plan

I could not verify the live `patriotictelehealth.com` Cloudflare zone from the currently accessible Cloudflare account.

What I was able to verify:

- the accessible Cloudflare account contains other zones
- it does not contain `patriotictelehealth.com`

So the DNS plan below is the target mapping, not a verified current-state export.

### Desired DNS mapping

- `patriotictelehealth.com`
  - Firebase Hosting custom domain records for production landing
- `www.patriotictelehealth.com`
  - redirect to apex or same Firebase site
- `dev.patriotictelehealth.com`
  - Firebase Hosting custom domain records for staging landing
- `emr.patriotictelehealth.com`
  - Firebase Hosting custom domain records for production EMR
- `emr-dev.patriotictelehealth.com`
  - Firebase Hosting custom domain records for staging EMR
- `api.patriotictelehealth.com`
  - Cloud Run custom domain mapping records for production backend

### Cloudflare settings

- TLS mode: `Full (strict)`
- proxy:
  - `public` and `emr` can be proxied after validation
  - `api` can be proxied, but start with conservative cache bypass rules
- cache rules:
  - bypass cache for authenticated routes
  - bypass cache for `/api/*`
- WAF:
  - enable managed rules
  - add rate limiting on public form endpoints if needed

## 9. Recommended Remaining Rollout Order

1. classify `backend/` as legacy or active
2. repair local operator auth/runtime (`gh`, `gcloud`, Firebase CLI`) in a writable, unrestricted shell
3. rewrite Git history in a fresh mirror clone and force-push the cleaned refs
4. rotate any secrets that were ever committed
5. create remote `staging` and `production` branches
6. create GitHub Environments: `staging`, `production`
7. configure GCP Secret Manager and GitHub OIDC / Workload Identity Federation
8. connect staging Firebase sites and custom domains
9. connect production Firebase domains and the Cloud Run custom domain
10. enable production branch protection and approval gates
11. rerun the repo verifiers and deployed-target smoke checks

## 10. What You Need To Set Up

### From your side

If you want the unresolved manual decisions printed first, run:

```bash
npm run plan:operator-decisions
```

1. Confirm whether `backend/` is dead code or a real service.
2. Confirm whether you are willing to create a real staging GCP/Firebase project for backend resources.
3. Give access to the correct Cloudflare account/zone for `patriotictelehealth.com`.
4. Create and protect dedicated `staging` and `production` branches, and stop deploying from `main`.
5. Approve secret rotation for any values that lived in tracked env files.
6. Confirm the chosen staging EMR hostname:
   - `emr-dev.patriotictelehealth.com`
   - not `dev.emr.patriotictelehealth.com`
7. Decide whether `www.patriotictelehealth.com` should redirect to apex.

### From repo side

Already prepared in repo:

1. Hard-coded `web.app`, `run.app`, and fixed backend fallback URLs were replaced with environment-based config for the active runtime surfaces.
2. The deploy workflow is already split by environment and by folder path.
3. Backend deploy automation is already limited to production until a real staging backend exists.
4. Smoke checks already exist for:
   - landing homepage
   - landing runtime config contains the expected EMR/API hosts
   - EMR login
   - backend health endpoint
5. Tracked env cleanup is not complete yet; the verifier now passes the current-index check and still fails until Git history is rewritten and force-pushed.

## 11. Non-Negotiable Security Notes

- If any real secret was committed, assume it is compromised.
- A force push alone does not make previously exposed secrets safe.
- Staging must not auto-deploy to the same backend used by production traffic.
- `NEXT_PUBLIC_*` values are public build-time config, not secret storage.
- server-side credentials belong in Secret Manager, not in repo env files.
