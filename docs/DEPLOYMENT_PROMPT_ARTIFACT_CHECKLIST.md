# Deployment Prompt-To-Artifact Checklist

Date: 2026-05-12

This file maps the original deployment objective to concrete repository artifacts, verification evidence, and remaining gaps.

Status legend:

- `done-repo`: implemented and verified in this repo checkout
- `partial`: repo work exists, but external or remote follow-through is still required
- `needs-user`: can only be completed in GitHub, GCP, Cloudflare, or by team sign-off

## Success Criteria

The deployment objective is only fully complete when all of the following are true:

1. No tracked non-example `.env*` files remain in Git history or the current index.
2. `public`, `emr-portal`, and `emr-backend` each have correct path-aware CI/deploy routing.
3. `staging` and `production` branches, protections, and environments exist remotely.
4. `emr-portal` and `emr-backend` deploy with environment data sourced from Secret Manager, not repo env files.
5. Homepage-to-EMR redirects and related app/share links use centralized environment-aware config.
6. Production and staging domain targets are documented and ready to be mapped in Cloudflare.
7. The expected Firebase Hosting sites, Firebase custom-domain bindings, and Cloud Run API domain mapping exist remotely.
8. Build and smoke-check evidence exists for the repo-side artifacts.

## Requirement Mapping

### 1. Remove pushed `.env.*` files except `.env.example`

- Status: `partial`
- Artifacts:
- [scripts/check-tracked-envs.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/check-tracked-envs.sh:1)
- [scripts/env-history-cleanup-plan.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/env-history-cleanup-plan.sh:1)
- [ci.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/ci.yml:1)
- [DEPLOYMENT_OPERATOR_RUNBOOK.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_OPERATOR_RUNBOOK.md:1)
- [DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1)
- Evidence:
- `npm run check:tracked-envs` now passes because the current index no longer contains tracked non-example env files.
- `npm run plan:env-history-cleanup` auto-discovers tracked non-example `.env*` paths and prints the safer mirror-clone rewrite flow plus the exact `git filter-repo` command.
- `npm run verify:env-history-cleanup` auto-discovers tracked non-example `.env*` paths and verifies both current-index cleanup and Git-history cleanup after the rewrite.
- Remaining gap:
- history rewrite not yet executed
- remote force-push not yet executed
- secret rotation not yet executed

### 2. Support three main working folders

- Status: `done-repo`
- Artifacts:
- [firebase.json](/home/zeus/Projects/patriotic-virtual-prod/firebase.json:1)
- [ci.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/ci.yml:1)
- [deploy-staging.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-staging.yml:1)
- [deploy-production.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-production.yml:1)
- Evidence:
- `public` is deployed as Firebase Hosting target `landing`
- `emr-portal` is deployed as Firebase Hosting target `emr`
- `emr-backend` is routed to Cloud Run deploy jobs

### 3. Preserve folder purposes

- Status: `done-repo`
- Artifacts:
- [DEPLOYMENT_PIPELINE_PLAN.md](/home/zeus/Projects/patriotic-virtual-prod/DEPLOYMENT_PIPELINE_PLAN.md:1)
- [EMR_ARCHITECTURE.md](/home/zeus/Projects/patriotic-virtual-prod/EMR_ARCHITECTURE.md:1)
- Evidence:
- `public` remains the marketing site
- `emr-portal` remains the providers/patients portal
- `emr-backend` remains the active backend in the current architecture

### 4. Configure GitHub workflow to build/deploy only when relevant folders change

- Status: `done-repo`
- Artifacts:
- [ci.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/ci.yml:1)
- [deploy-staging.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-staging.yml:1)
- [deploy-production.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-production.yml:1)
- Evidence:
- `dorny/paths-filter@v3` gates `public`, `emr_portal`, `emr_backend`, and `infra`
- staging deploy excludes backend
- production deploy includes backend

### 5. Create a staging pipeline and choose branch/domain strategy

- Status: `partial`
- Decision captured:
- Use `staging`, not `development`
- Use `emr-dev.patriotictelehealth.com`, not `dev.emr.patriotictelehealth.com`
- Artifacts:
- [deploy-staging.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-staging.yml:1)
- [scripts/plan-github-environments-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-github-environments-bootstrap.sh:1)
- [scripts/plan-branch-protection-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-branch-protection-bootstrap.sh:1)
- [app-config.js](/home/zeus/Projects/patriotic-virtual-prod/public/assets/js/app-config.js:1)
- [GlobalBanner.tsx](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/src/components/common/GlobalBanner.tsx:1)
- [DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1)
- Evidence:
- staging workflow deploys `landing` and `emr`
- staging workflow fetches EMR env from Secret Manager
- staging workflow has smoke checks for `PUBLIC_URL` and `EMR_URL`
- staging workflow now smoke-checks landing runtime config against `${{ vars.API_URL }}` instead of a hardcoded production API literal
- staging environment flag is passed as `NEXT_PUBLIC_APP_ENV`
- `npm run plan:github-environments-bootstrap` prints the GitHub environment creation and variable commands
- `npm run plan:github-environments-bootstrap` now includes `API_URL=https://api.patriotictelehealth.com` for `staging`
- `npm run verify:github-deployment-setup` now also requires the staging `API_URL` variable and checks concrete staging/production GitHub environment variable values instead of only variable presence
- the handoff doc, runbook, setup checklist, and `npm run plan:deployment-handoff` now all call out both staging and production `npm run verify:deployment-targets` commands explicitly
- `npm run plan:cloudflare-dns-bootstrap` and `npm run plan:firebase-custom-domain-bootstrap` now also print those banner-aware staging and production `npm run verify:deployment-targets` commands
- `npm run verify:cloudflare-zone-setup` now supports `WWW_HANDLING_MODE=redirect|record|skip`, and `npm run verify:deployment-handoff` now exposes that same mode in its usage, so the optional Cloudflare API verification can match the chosen `www.patriotictelehealth.com` strategy
- `npm run verify:deployment-targets` now supports `EXPECT_STAGING_BANNER=1|0|auto` and checks that staging EMR shows the warning banner while production EMR does not
- `npm run plan:branch-protection-bootstrap` prints the branch protection CLI examples
- Remaining gap:
- `staging` branch still requires operator creation, and live GitHub verification from this shell is currently blocked by invalid `gh` auth
- GitHub `staging` environment still requires operator setup, and live GitHub verification from this shell is currently blocked by invalid `gh` auth
- staging DNS still requires operator mapping
- `npm run plan:branch-bootstrap` now prints the exact branch-creation sequence to create `staging` from `main`
- the EMR UI reads `NEXT_PUBLIC_APP_ENV` in `GlobalBanner` and renders a visible staging/test warning bar for non-production environments

### 6. Create a protected production pipeline and production domains

- Status: `partial`
- Artifacts:
- [deploy-production.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-production.yml:1)
- [scripts/plan-github-environments-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-github-environments-bootstrap.sh:1)
- [scripts/plan-branch-protection-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-branch-protection-bootstrap.sh:1)
- [scripts/verify-branch-protection-setup.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/verify-branch-protection-setup.sh:1)
- [deploy-backend.sh](/home/zeus/Projects/patriotic-virtual-prod/deploy-backend.sh:1)
- [scripts/plan-cloud-run-domain-mapping-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-cloud-run-domain-mapping-bootstrap.sh:1)
- [DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1)
- Evidence:
- production workflow deploys Firestore, backend, landing, and EMR
- backend deploy now uses the repo’s env-aware deploy script
- production workflow has smoke checks for landing, landing runtime config, EMR login, and `/health`
- `npm run plan:github-environments-bootstrap` prints the GitHub environment variable and secret placeholder commands
- `npm run plan:branch-protection-bootstrap` prints the branch protection CLI examples with the current CI job names:
  - `tracked-env-guard`
  - `changes`
  - `validate-public`
  - `build-emr-portal`
  - `build-emr-backend`
- `npm run verify:branch-protection-setup` is prepared to verify the remote branch protection state after it is applied
- Remaining gap:
- `production` branch still requires operator creation, and live GitHub verification from this shell is currently blocked by invalid `gh` auth
- GitHub `production` environment and approval rules still require operator setup, and live GitHub verification from this shell is currently blocked by invalid `gh` auth
- production DNS still requires operator mapping
- `npm run plan:branch-bootstrap` now prints the exact branch-creation sequence to create `production` from `main`

### 7. Use Secret Manager and separate secrets by environment

- Status: `partial`
- Artifacts:
- [deploy-staging.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-staging.yml:1)
- [deploy-production.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-production.yml:1)
- [scripts/plan-secret-manager-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-secret-manager-bootstrap.sh:1)
- [scripts/plan-workload-identity-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-workload-identity-bootstrap.sh:1)
- [emr-portal/.env.example](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/.env.example:1)
- [emr-backend/.env.example](/home/zeus/Projects/patriotic-virtual-prod/emr-backend/.env.example:1)
- Evidence:
- EMR deploys fetch env payload from Secret Manager via `EMR_PORTAL_ENV_SECRET_NAME`
- production backend deploy fetches env payload from Secret Manager via `BACKEND_ENV_SECRET_NAME`
- checklist/runbook specify per-environment secret names and source templates
- `npm run plan:secret-manager-bootstrap` prints the recommended secret names, preferred project split, exact `gcloud secrets create` / `versions add` commands, and the follow-up `npm run verify:gcp-deployment-setup`
- `npm run plan:workload-identity-bootstrap` prints the recommended OIDC pool/provider/service-account naming and the `gcloud` IAM bootstrap commands
- `npm run plan:operator-decisions` now prints the remaining manual decisions the repo cannot auto-verify yet: `backend/` scope, frontend-only vs full-stack staging backend mode, staging host convention, apex/www behavior, Cloudflare zone ownership, and secret-rotation approval
- `npm run audit:deployment-readiness` now explicitly checks that `scripts/plan-operator-decisions.sh` exists as part of the prepared operator helper surface
- `npm run audit:deployment-readiness` now also verifies that the documented `npm run` deployment helper/verifier entrypoints are actually wired in `package.json`
- `npm run plan:deployment-handoff` now explicitly includes the required commit/push step before remote GitHub/GCP/Firebase/Cloudflare bootstrap
- `npm run report:deployment-blockers` now includes that same commit/push step in the ordered operator to-do list
- [docs/DEPLOYMENT_HANDOFF.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_HANDOFF.md:1), [docs/DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1), and [docs/DEPLOYMENT_OPERATOR_RUNBOOK.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_OPERATOR_RUNBOOK.md:1) now use the same safe order: env cleanup first, then commit/push the cleaned repo-side changes, then remote bootstrap
- Remaining gap:
- actual secrets and values not created
- Workload Identity / deploy SA not configured

### 8. Review code for homepage -> EMR redirect behavior

- Status: `done-repo`
- Artifacts:
- [public/index.html](/home/zeus/Projects/patriotic-virtual-prod/public/index.html:1)
- [public/assets/js/app-config.js](/home/zeus/Projects/patriotic-virtual-prod/public/assets/js/app-config.js:1)
- [public/assets/js/dashboard.js](/home/zeus/Projects/patriotic-virtual-prod/public/assets/js/dashboard.js:1)
- [public/assets/js/auth-state.js](/home/zeus/Projects/patriotic-virtual-prod/public/assets/js/auth-state.js:1)
- [public/assets/js/ui-helpers.js](/home/zeus/Projects/patriotic-virtual-prod/public/assets/js/ui-helpers.js:1)
- Evidence:
- landing dashboard CTA still exists and calls `showDashboard()`
- dashboard redirect derives the target from `getEmrOrigin()`
- auth-driven EMR portal links derive the target from `getEmrLoginUrl()`
- SSO-aware cross-domain anchor interception only bridges links that start with the centralized EMR origin
- runtime config selects the EMR origin by environment

### 9. Remove static/hard-coded redirection

- Status: `partial`
- Artifacts:
- [public/assets/js/app-config.js](/home/zeus/Projects/patriotic-virtual-prod/public/assets/js/app-config.js:1)
- [emr-portal/src/lib/app-origins.ts](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/src/lib/app-origins.ts:1)
- [emr-backend/src/config/app-origins.ts](/home/zeus/Projects/patriotic-virtual-prod/emr-backend/src/config/app-origins.ts:1)
- [emr-backend/src/modules/notifications/links.ts](/home/zeus/Projects/patriotic-virtual-prod/emr-backend/src/modules/notifications/links.ts:1)
- [ReferralsClient.tsx](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/src/app/%28patient%29/patient/referrals/ReferralsClient.tsx:1)
- [GlobalBanner.tsx](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/src/components/common/GlobalBanner.tsx:1)
- [public/assets/js/provider-admin.js](/home/zeus/Projects/patriotic-virtual-prod/public/assets/js/provider-admin.js:1)
- [PageClient.tsx](/home/zeus/Projects/patriotic-virtual-prod/emr-portal/src/app/%28provider%29/orders/pacs/PageClient.tsx:1)
- Evidence:
- old `patriotic-virtual-emr.web.app` and `run.app` fallbacks are removed from the main runtime path
- notification portal links now default to `emr.patriotictelehealth.com`, not the marketing site
- backend notification smoke fixtures now derive portal URLs through the shared link helper instead of hardcoding `https://patriotictelehealth.com/...`
- referral/share links now build from the marketing-origin helper
- PACS viewer links now build from centralized PACS origin helpers on both the public admin surface and the EMR provider PACS surface
- `npm run audit:deployment-readiness` now enforces that canonical production hosts are limited to the centralized runtime helper/config files instead of being scattered through runtime source
- `npm run audit:deployment-readiness` now also enforces that the chosen staging hosts `dev.patriotictelehealth.com` and `emr-dev.patriotictelehealth.com` stay confined to the centralized runtime config
- the remaining `patriotictelehealth.cloudflareaccess.com` reference is only in `emr-portal/next.config.js` within the CSP `frame-src` allowlist, not in redirect or navigation logic
- [DEPLOYMENT_PIPELINE_PLAN.md](/home/zeus/Projects/patriotic-virtual-prod/DEPLOYMENT_PIPELINE_PLAN.md:1) now reflects the actual repo status: the split `ci` / `deploy-staging` / `deploy-production` workflows are already in place, while tracked env cleanup is still explicitly open
- Remaining gap:
- some domain strings remain intentionally for contact data, central defaults, and third-party product endpoints

### 10. `emr-portal` and `emr-backend` use Cloud Run / Firebase Hosting

- Status: `partial`
- Artifacts:
- [firebase.json](/home/zeus/Projects/patriotic-virtual-prod/firebase.json:1)
- [deploy-production.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-production.yml:1)
- [deploy-backend.sh](/home/zeus/Projects/patriotic-virtual-prod/deploy-backend.sh:1)
- Evidence:
- EMR hosting target uses Firebase webframeworks hosting
- backend deploy path points to Cloud Run source deploy from `emr-backend`
- staging workflow smoke-checks the deployed landing runtime config and EMR login target
- production workflow smoke-checks landing, landing runtime config, EMR login, and backend `/health`
- `npm run audit:deployment-readiness` now enforces that deploy surfaces reference `emr-backend` and do not target literal legacy `backend/` paths
- `npm run audit:deployment-readiness` now enforces that the EMR UI reads `NEXT_PUBLIC_APP_ENV` and renders a staging/test warning banner
- Remaining gap:
- live GCP service wiring still needs to be created/verified
- production Cloud Run domain mapping for `api.patriotictelehealth.com` still requires operator setup, and live verification from this shell is currently blocked by `gcloud` auth/config

### 11. `public` is directly deployed to Firebase Hosting

- Status: `done-repo`
- Artifacts:
- [firebase.json](/home/zeus/Projects/patriotic-virtual-prod/firebase.json:1)
- [deploy-staging.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-staging.yml:1)
- [deploy-production.yml](/home/zeus/Projects/patriotic-virtual-prod/.github/workflows/deploy-production.yml:1)
- [scripts/verify-firebase-hosting-setup.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/verify-firebase-hosting-setup.sh:1)
- [scripts/plan-firebase-hosting-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-firebase-hosting-bootstrap.sh:1)
- [scripts/plan-firebase-custom-domain-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-firebase-custom-domain-bootstrap.sh:1)
- [scripts/verify-firebase-custom-domains.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/verify-firebase-custom-domains.sh:1)
- [.firebaserc](/home/zeus/Projects/patriotic-virtual-prod/.firebaserc:1)
- Evidence:
- staging and production workflows both deploy `hosting:landing`
- local `.firebaserc` maps:
  - `patriotic-virtual-dev/landing -> patriotic-virtual-dev`
  - `patriotic-virtual-prod/landing -> patriotic-virtual-prod`
- `npm run plan:firebase-hosting-bootstrap` prints the exact `firebase hosting:sites:create` commands for all four expected staging/production Hosting sites
- `npm run plan:firebase-custom-domain-bootstrap` prints the exact staging/production Firebase Hosting site-to-domain bindings that should exist before Cloudflare cutover
- `npm run verify:firebase-custom-domains` is now available to verify Firebase custom-domain bindings and their `HOST_ACTIVE` / `OWNERSHIP_ACTIVE` states after they are created
- `npm run plan:cloud-run-domain-mapping-bootstrap` prints the exact `gcloud beta run domain-mappings create` command for `api.patriotictelehealth.com`
- Note:
- repo-side hosting configuration is correct, but remote Hosting sites still need to exist for deploys to work

### 12. Find the best deployment model and map domains from Cloudflare

- Status: `partial`
- Artifacts:
- [DEPLOYMENT_PIPELINE_PLAN.md](/home/zeus/Projects/patriotic-virtual-prod/DEPLOYMENT_PIPELINE_PLAN.md:1)
- [DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1)
- [DEPLOYMENT_OPERATOR_RUNBOOK.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_OPERATOR_RUNBOOK.md:1)
- [scripts/plan-cloudflare-dns-bootstrap.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/plan-cloudflare-dns-bootstrap.sh:1)
- [scripts/verify-cloudflare-zone-setup.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/verify-cloudflare-zone-setup.sh:1)
- [scripts/verify-dns-resolution.sh](/home/zeus/Projects/patriotic-virtual-prod/scripts/verify-dns-resolution.sh:1)
- Evidence:
- target domain map is documented for staging and production
- Cloudflare edge settings are documented
- `npm run plan:cloudflare-dns-bootstrap` prints the exact cutover order, host mapping plan, and the post-cutover verification commands for Cloudflare API, DNS resolution, and deployed target smoke checks
- `npm run verify:cloudflare-zone-setup` is now available to verify zone access and the presence of the expected DNS record names through the Cloudflare API when the operator has token access
- Cloudflare API `GET /zones?name=patriotictelehealth.com` returned zero matches from the currently connected account
- the currently connected Cloudflare account lists only:
  - `omshreegauri.com.np`
  - `rajeevshrestha.info.np`
  - `samirshrestha.name.np`
- `npm run verify:dns-resolution` is prepared for post-cutover DNS verification, but cannot complete from the current sandbox because outbound DNS is blocked here
- Remaining gap:
- current session does not have access to the `patriotictelehealth.com` Cloudflare zone
- Firebase Hosting custom domains and the production Cloud Run API domain mapping still need to be created remotely before DNS cutover can be completed

## Verification Commands Run

- `git pull --rebase --autostash origin main`
- `npx tsc --noEmit` in `emr-portal`
- `npm run build` in `emr-portal`
- `npm run build` in `emr-backend`
- `npm run check:tracked-envs`
- `npm run plan:env-history-cleanup`
- `npm run plan:branch-bootstrap`
- `bash -n scripts/verify-env-history-cleanup.sh`
- `npm run verify:env-history-cleanup`
- `npm run plan:secret-manager-bootstrap`
- `npm run plan:firebase-hosting-bootstrap`
- `npm run plan:firebase-custom-domain-bootstrap`
- `npm run plan:cloud-run-domain-mapping-bootstrap`
- `npm run plan:workload-identity-bootstrap`
- `npm run plan:github-environments-bootstrap`
- `npm run plan:branch-protection-bootstrap`
- `npm run plan:cloudflare-dns-bootstrap`
- `npm run plan:deployment-handoff`
- `npm run report:deployment-blockers`
- `npm run audit:deployment-readiness`
- `bash -n scripts/verify-github-deployment-setup.sh`
- `npm run verify:github-deployment-setup`
- `gh auth status`
- `npm run verify:github-deployment-setup`
- `bash -n scripts/verify-branch-protection-setup.sh`
- `npm run verify:branch-protection-setup`
- `npm run verify:branch-protection-setup`
- `bash -n scripts/verify-gcp-deployment-setup.sh`
- `npm run verify:gcp-deployment-setup`
- `bash -n scripts/verify-firebase-hosting-setup.sh`
- `npm run verify:firebase-hosting-setup`
- `bash -n scripts/verify-firebase-custom-domains.sh`
- `bash -n scripts/verify-cloudflare-zone-setup.sh`
- `bash -n scripts/verify-dns-resolution.sh`
- `npm run verify:dns-resolution`
- `bash -n scripts/verify-operator-auth.sh`
- `npm run verify:operator-auth`
- `bash -n scripts/verify-deployment-handoff.sh`
- `VERIFY_DNS=0 npm run verify:deployment-handoff`
- `bash -n scripts/verify-deployment-targets.sh`
- `npm run verify:deployment-targets`
- Cloudflare API `GET /zones?name=patriotictelehealth.com`
- `node --check public/assets/js/app-config.js`
- `node --check public/assets/js/provider-admin.js`
- `npm run plan:operator-auth-repair`

## Current Non-Repo Blockers

- local repo-side implementation is effectively complete except for the env-history cleanup; `npm run audit:deployment-readiness` currently fails only because Git history still contains `emr-portal/.env.dev`, `.env.production`, and `.env.test`
- Local operator auth/runtime verification now has a dedicated preflight:
  - `npm run verify:operator-auth`
  - `npm run plan:operator-auth-repair`
  - `npm run report:deployment-blockers` now summarizes the current-shell blocker set in one command: operator auth/runtime failures, env-history cleanup failures, repo-side readiness status, Cloudflare zone access still needing a token-backed check, and explicit `backend/` scope confirmation still being required
  - current verified failures in this shell:
    - `gh` token is invalid and requires `gh auth login -h github.com`
    - `gcloud` auth/config is unusable because the local config directory is not writable in this shell
    - Firebase CLI runtime/auth is unusable and currently errors with `firepit-log.txt`
- GitHub branch, environment, secret, and branch-protection verification from this shell is blocked until `gh auth login`, because the configured token is currently invalid
- GCP project, Secret Manager, Workload Identity, Cloud Run service, and Cloud Run domain-mapping verification from this shell is blocked until `gcloud auth login` runs in a writable/unrestricted shell
- Firebase Hosting site and custom-domain verification from this shell is blocked until Firebase CLI auth/runtime is usable in an unrestricted shell
- Cloudflare zone access is not available in the current session
  - verified by Cloudflare API: `patriotictelehealth.com` returned zero zones in the connected account
- Secret Manager payloads and Workload Identity still require operator setup, but remote verification from this shell is currently blocked by `gcloud` auth/config
- Git history rewrite and secret rotation are still pending
