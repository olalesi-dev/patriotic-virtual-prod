# Deployment Requirements Audit

Date: 2026-05-12

Status legend:

- `done-repo`: implemented in repository changes
- `needs-user`: requires GitHub/GCP/Cloudflare/operator action
- `partial`: repo work done, but external follow-through still required
- `unverified`: intended design exists, but cannot be proven from this checkout alone

## Requirement Audit

1. Remove tracked `.env.*` files except `.env.example`
   - Status: `partial`
   - Evidence:
     - deleted tracked files: `emr-portal/.env.dev`, `emr-portal/.env.production`, `emr-portal/.env.test`
     - CI guard added in `.github/workflows/ci.yml`
     - local helper added: `scripts/check-tracked-envs.sh`
     - history-cleanup plan helper added: `scripts/env-history-cleanup-plan.sh`
     - history-cleanup verifier added: `scripts/verify-env-history-cleanup.sh`
     - env-history helpers now auto-discover tracked non-example `.env*` paths from the current index and full Git history instead of relying on a hardcoded list
   - Still needed:
     - rewrite Git history
     - force push after sign-off
     - rotate any exposed secrets

2. Support three main working folders
   - Status: `done-repo`
   - Evidence:
     - path-aware workflows split `public`, `emr-portal`, `emr-backend`
     - deployment plan documents folder ownership in `DEPLOYMENT_PIPELINE_PLAN.md`

3. Preserve folder purposes
   - Status: `done-repo`
   - Evidence:
     - workflow routing aligns:
       - `public` -> landing hosting
       - `emr-portal` -> EMR hosting
       - `emr-backend` -> Cloud Run backend

4. Configure GitHub workflow so builds/deploys run only when relevant folders change
   - Status: `done-repo`
   - Evidence:
     - `.github/workflows/ci.yml`
     - `.github/workflows/deploy-staging.yml`
     - `.github/workflows/deploy-production.yml`
     - each uses path filtering

5. Create staging branch and staging pipeline
   - Status: `partial`
   - Evidence:
     - staging workflow created: `.github/workflows/deploy-staging.yml`
     - branch strategy documented in `DEPLOYMENT_PIPELINE_PLAN.md`
     - staged frontend environment flag wired through `.github/workflows/deploy-staging.yml`
     - local helper added: `scripts/plan-github-environments-bootstrap.sh`
     - GCP verifier added: `scripts/verify-gcp-deployment-setup.sh`
   - Still needed:
     - create `staging` branch
     - create GitHub `staging` environment
     - add staging secrets/vars
     - set staging DNS

6. Create production branch and protected production pipeline
   - Status: `partial`
   - Evidence:
     - production workflow created: `.github/workflows/deploy-production.yml`
      - production checklist documented in `docs/DEPLOYMENT_SETUP_CHECKLIST.md`
      - local helper added: `scripts/plan-github-environments-bootstrap.sh`
      - local helper added: `scripts/plan-branch-protection-bootstrap.sh`
      - branch protection helper now lists the concrete CI job names derived from `.github/workflows/ci.yml`
      - branch protection verifier added: `scripts/verify-branch-protection-setup.sh`
      - GitHub verifier added: `scripts/verify-github-deployment-setup.sh`
   - Still needed:
     - create `production` branch
     - add branch protection
     - create GitHub `production` environment with approvals
     - set production DNS

7. Use Secret Manager and separate secrets by environment
   - Status: `partial`
   - Evidence:
     - deploy workflows now fetch EMR portal and backend env files from GCP Secret Manager
      - workflows still use environment-specific GitHub environments for deploy identity and routing vars
      - setup checklist specifies env-specific secret names and vars
      - local helper added: `scripts/plan-secret-manager-bootstrap.sh`
      - local helper added: `scripts/plan-workload-identity-bootstrap.sh`
      - `npm run plan:secret-manager-bootstrap` now explicitly recommends project-separated secrets and a follow-up `npm run verify:gcp-deployment-setup`
      - deployment plan recommends GCP Secret Manager split by project or namespaced secret names
   - Still needed:
     - actual GCP Secret Manager secrets and values
     - actual Workload Identity / deploy identity setup

8. Review redirect behavior from homepage to EMR portal for logged-in users
   - Status: `done-repo`
   - Evidence:
     - landing dashboard CTA still exists in `public/index.html`
     - landing dashboard redirect uses `getEmrOrigin()` in `public/assets/js/dashboard.js`
     - auth-driven EMR portal link uses `getEmrLoginUrl()` in `public/assets/js/auth-state.js`
     - landing dashboard links now route via JS redirect flow instead of fixed hrefs
     - central runtime config added in `public/assets/js/app-config.js`
     - redirect code updated in `public/assets/js/dashboard.js`
     - SSO-aware anchor interception updated in `public/assets/js/ui-helpers.js`
     - deploy workflows now smoke-test the landing runtime config and EMR login target after deploy

9. Remove static/hard-coded redirection
   - Status: `partial`
   - Evidence:
     - centralized public runtime config in `public/assets/js/app-config.js`
     - centralized EMR app origins in `emr-portal/src/lib/app-origins.ts`
     - centralized backend origins in `emr-backend/src/config/app-origins.ts`
     - PACS viewer routes now use shared PACS origin helpers in `public/assets/js/provider-admin.js` and `emr-portal/src/app/(provider)/orders/pacs/PageClient.tsx`
     - backend notification link helper now resolves portal URLs through `emr-backend/src/modules/notifications/links.ts`, and the SendGrid smoke script no longer hardcodes production portal hosts
     - updated checkout, billing, webhook, dashboard, referral, and notification link code paths to use helpers
   - Remaining note:
     - remaining hard-coded domain strings are now mostly intentional central defaults, contact addresses, PACS defaults, or product-specific third-party service endpoints rather than scattered redirect targets

10. `emr-portal` and `emr-backend` use Cloud Run, with `emr-portal` deployed to Firebase Hosting
   - Status: `partial`
   - Evidence:
     - production workflow deploys `emr-backend` to Cloud Run through `deploy-backend.sh`
     - staging/production workflows deploy `emr` hosting target through Firebase
     - staging/production workflows now assert the deployed landing runtime config contains the expected EMR/API hosts
     - staging/production workflows now smoke-test the deployed EMR login route
     - Cloud Run domain mapping bootstrap helper added: `scripts/plan-cloud-run-domain-mapping-bootstrap.sh`
   - Still needed:
     - live GCP auth/secrets/domain setup
     - production Cloud Run domain mapping for `api.patriotictelehealth.com`

11. `public` deployed directly to Firebase Hosting
   - Status: `done-repo`
   - Evidence:
     - staging/production workflows deploy `hosting:landing`
     - local Firebase target mapping matches `.firebaserc`, verified by `npm run verify:firebase-hosting-setup`
     - Firebase Hosting bootstrap helper added: `scripts/plan-firebase-hosting-bootstrap.sh`
     - Firebase Hosting custom-domain bootstrap helper added: `scripts/plan-firebase-custom-domain-bootstrap.sh`

12. Find best deployment and map domains from Cloudflare
   - Status: `partial`
   - Evidence:
     - domain target plan documented in `DEPLOYMENT_PIPELINE_PLAN.md`
     - Cloudflare setup checklist documented in `docs/DEPLOYMENT_SETUP_CHECKLIST.md`
     - Firebase Hosting bootstrap helper added: `scripts/plan-firebase-hosting-bootstrap.sh`
     - Firebase Hosting custom-domain bootstrap helper added: `scripts/plan-firebase-custom-domain-bootstrap.sh`
     - Cloud Run domain mapping bootstrap helper added: `scripts/plan-cloud-run-domain-mapping-bootstrap.sh`
     - local helper added: `scripts/plan-cloudflare-dns-bootstrap.sh`
     - Firebase Hosting verifier added: `scripts/verify-firebase-hosting-setup.sh`
     - DNS verifier added: `scripts/verify-dns-resolution.sh`
     - `npm run plan:cloudflare-dns-bootstrap` now also prints the post-cutover Cloudflare API, DNS-resolution, and deployed-target verification commands
   - Still needed:
      - create or confirm the expected Firebase Hosting sites in the dev/prod projects
      - bind the staging/production Firebase Hosting custom domains to those sites
      - create the production Cloud Run domain mapping for `api.patriotictelehealth.com`
      - access to the correct `patriotictelehealth.com` Cloudflare zone
      - creation/verification of actual DNS records

## Local Verification

- `emr-backend`: `npm run build` passed
- `emr-portal`: `npx tsc --noEmit` passed
- `emr-portal`: `npm run build` passed
  - `repo helpers`:
  - `npm run check:tracked-envs` now passes because the current index no longer contains tracked non-example env files
  - `npm run plan:env-history-cleanup` auto-discovers tracked non-example `.env*` paths and now prints the safer mirror-clone history rewrite and force-push sequence
  - `npm run plan:branch-bootstrap` prints the exact `git checkout` / `git push -u origin` sequence for creating `staging` and `production` from `main`
  - `npm run plan:secret-manager-bootstrap` prints the recommended secret names and `gcloud secrets` commands
  - `npm run plan:firebase-hosting-bootstrap` prints the exact `firebase hosting:sites:create` commands for the four expected staging/production Hosting sites
  - `npm run plan:firebase-custom-domain-bootstrap` prints the exact staging/production Firebase Hosting site-to-domain bindings that should be created before Cloudflare cutover
  - `npm run verify:firebase-custom-domains` checks Firebase Hosting custom-domain bindings through the Firebase Hosting REST API and verifies `HOST_ACTIVE` plus `OWNERSHIP_ACTIVE`
  - `npm run plan:cloud-run-domain-mapping-bootstrap` prints the exact `gcloud beta run domain-mappings create` and `describe` commands for `api.patriotictelehealth.com`
  - `npm run plan:workload-identity-bootstrap` prints the recommended OIDC and IAM bootstrap commands
  - `npm run plan:cloudflare-dns-bootstrap` prints the exact cutover order, host mapping plan, and the post-cutover verification commands for Cloudflare API, DNS resolution, and deployed target smoke checks
  - `npm run plan:github-environments-bootstrap` prints the `gh` environment/variable/secret setup commands
  - `npm run plan:branch-protection-bootstrap` prints the `gh api` branch protection examples
  - `npm run plan:operator-decisions` now prints the remaining manual decisions the repo cannot auto-verify yet: `backend/` scope, frontend-only vs full-stack staging backend mode, staging host convention, apex/www behavior, Cloudflare zone ownership, and secret-rotation approval
  - `npm run audit:deployment-readiness` now explicitly checks that `scripts/plan-operator-decisions.sh` exists as part of the prepared operator helper surface
  - `npm run audit:deployment-readiness` now also verifies that the documented `npm run` entrypoints for the deployment helper/verifier surface are actually wired in `package.json`, not just present as script files
  - `npm run verify:cloudflare-zone-setup` checks Cloudflare zone access and required DNS record names through the Cloudflare API when a token is available
  - `npm run plan:deployment-handoff` prints the full ordered operator sequence and invokes the helper plans
  - `npm run plan:deployment-handoff` now explicitly includes the required commit/push step between env-history cleanup and remote bootstrap, so GitHub has the split workflows before environment, branch-protection, and cloud setup begins
  - `npm run report:deployment-blockers` now provides a single current-shell blocker summary across operator auth, env cleanup, and the repo-side readiness audit, and its ordered to-do now includes committing/pushing the repo-side deployment changes before remote bootstrap
  - [DEPLOYMENT_HANDOFF.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_HANDOFF.md:1), [DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1), and [DEPLOYMENT_OPERATOR_RUNBOOK.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_OPERATOR_RUNBOOK.md:1) now match that same safe order: env-history cleanup and verification first, then commit/push the cleaned repo-side changes, then start remote bootstrap
  - `npm run plan:operator-auth-repair` now prints the concrete `gh auth login`, writable-`CLOUDSDK_CONFIG` `gcloud auth login`, and writable-cache `firebase login` recovery steps for this shell
  - `npm run verify:deployment-handoff` now provides a single post-bootstrap wrapper for operator-auth, env-history, GitHub, branch-protection, GCP, Firebase Hosting, Firebase custom-domain, optional Cloudflare API, optional DNS, and optional deployed-target verification
  - `npm run audit:deployment-readiness` currently fails only on the remaining env-history cleanup blocker and passes the repo-side workflow/origin checks, including:
    - CI branch triggers and folder path filters
    - staging branch trigger, backend exclusion, Firestore gate, Secret Manager EMR env fetch, and runtime-config smoke test against `vars.API_URL`
    - production branch trigger, backend deploy job, Secret Manager env fetches, backend `/health` smoke check, and Firebase hosting target wiring
  - top-level [DEPLOYMENT_PIPELINE_PLAN.md](/home/zeus/Projects/patriotic-virtual-prod/DEPLOYMENT_PIPELINE_PLAN.md:1) now matches the actual repo state: split `ci` / `deploy-staging` / `deploy-production` workflows are described as already prepared, while tracked env cleanup is correctly described as still incomplete
  - repo-side readiness audit now explicitly checks that the landing dashboard CTA, dashboard redirect, and auth-generated EMR login link all use the centralized runtime config helpers
  - repo-side readiness audit now explicitly checks that canonical production hosts only appear in the approved centralized helper/config files used for runtime origin resolution
  - repo-side readiness audit now explicitly checks that the chosen staging hosts `dev.patriotictelehealth.com` and `emr-dev.patriotictelehealth.com` stay confined to the centralized runtime config
  - a follow-up code search confirmed that the remaining `patriotictelehealth.cloudflareaccess.com` reference is only in `emr-portal/next.config.js` within the CSP `frame-src` allowlist, not in redirect or navigation logic
  - repo-side readiness audit now explicitly enforces that `patriotictelehealth.cloudflareaccess.com` stays confined to that documented `emr-portal/next.config.js` CSP allowlist
  - repo-side readiness audit now explicitly checks that actual deploy surfaces reference `emr-backend` and do not target literal legacy `backend/` paths
  - repo-side readiness audit now explicitly checks that the EMR UI reads `NEXT_PUBLIC_APP_ENV` and renders a visible staging/test warning banner
  - `npm run plan:github-environments-bootstrap` now defines `API_URL=https://api.patriotictelehealth.com` for `staging`, so the staging deploy workflow smoke-checks the same environment variable surface it will read at runtime instead of a hardcoded host literal
  - `npm run verify:github-deployment-setup` now also requires the staging `API_URL` variable, and now checks concrete staging/production GitHub environment variable values such as `PUBLIC_URL`, `EMR_URL`, and `API_URL`, so the remote GitHub verifier matches the staging workflow and bootstrap helper surface instead of only checking variable existence
  - [DEPLOYMENT_HANDOFF.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_HANDOFF.md:1), [DEPLOYMENT_OPERATOR_RUNBOOK.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_OPERATOR_RUNBOOK.md:1), [DEPLOYMENT_SETUP_CHECKLIST.md](/home/zeus/Projects/patriotic-virtual-prod/docs/DEPLOYMENT_SETUP_CHECKLIST.md:1), and `npm run plan:deployment-handoff` now explicitly call out both staging and production `npm run verify:deployment-targets` commands instead of only the production example
  - `npm run plan:cloudflare-dns-bootstrap` and `npm run plan:firebase-custom-domain-bootstrap` now also print the banner-aware staging and production `npm run verify:deployment-targets` commands, not just a production-only cutover check
  - `npm run verify:cloudflare-zone-setup` now supports `WWW_HANDLING_MODE=redirect|record|skip`, and `npm run verify:deployment-handoff` now surfaces that same mode in its usage, so the optional Cloudflare API verification can reflect whether `www.patriotictelehealth.com` is handled as a redirect rule or as a real DNS record
  - `npm run verify:deployment-targets` now supports `EXPECT_STAGING_BANNER=1|0|auto` and checks that staging EMR shows the warning banner while production EMR does not
  - `bash -n scripts/verify-env-history-cleanup.sh` passed
  - `npm run verify:env-history-cleanup` currently fails because Git history still contains `emr-portal/.env.dev`, `emr-portal/.env.production`, and `emr-portal/.env.test`, even though the current index is now clean
  - deploy workflows now include landing runtime-config smoke checks and EMR login smoke checks
  - `bash -n scripts/verify-github-deployment-setup.sh` passed
  - `npm run verify:github-deployment-setup` now resolves the repo slug from `origin` and reaches the real GitHub auth check without requiring a manual `GITHUB_REPO=...` prefix
  - `bash -n scripts/verify-branch-protection-setup.sh` passed
  - `npm run verify:branch-protection-setup` now resolves the repo slug from `origin` and reaches the real GitHub auth check without requiring a manual `GITHUB_REPO=...` prefix
  - `bash -n scripts/verify-gcp-deployment-setup.sh` passed
  - `npm run verify:gcp-deployment-setup` now defaults to the repo's known staging and production projects and fails fast with a `gcloud` auth/config error instead of reporting misleading missing-project or missing-resource results
  - `bash -n scripts/verify-firebase-hosting-setup.sh` passed
  - `npm run verify:firebase-hosting-setup` now fails fast with a Firebase CLI auth/runtime error instead of reporting misleading missing-site results
  - `bash -n scripts/verify-firebase-custom-domains.sh` passed
  - `npm run verify:firebase-custom-domains` now fails fast with a `gcloud` auth/config error instead of reporting misleading missing custom-domain results
  - `bash -n scripts/verify-cloudflare-zone-setup.sh` passed
  - `bash -n scripts/verify-dns-resolution.sh` passed
  - `npm run verify:dns-resolution` currently reports that outbound DNS access is blocked from this shell, so live DNS verification still has to be run from an unrestricted operator environment
  - `bash -n scripts/verify-deployment-handoff.sh` passed
  - `VERIFY_DNS=0 npm run verify:deployment-handoff` now defaults to the repo slug from `origin` plus the repo's known staging and production GCP/Firebase projects, and correctly collapses the current blocker set into one command, surfacing operator auth/runtime blockers first, then failed env cleanup verification, followed by the dependent GitHub, GCP, and Firebase verification failures from this shell
  - `bash -n scripts/verify-operator-auth.sh` passed
  - `npm run verify:operator-auth` currently fails on exactly three local operator prerequisites in this shell: invalid `gh` auth, unusable `gcloud` auth/config because the local config directory is not writable, and unusable Firebase CLI runtime/auth signaled by the `firepit-log.txt` runtime error
  - `gh auth status` currently reports that the configured GitHub token for `Razeev-Shrestha` is invalid in this shell, so GitHub branch, environment, secret, and branch-protection verification from this shell must be re-run after `gh auth login`
  - `npm run verify:github-deployment-setup` now defaults to the repo slug from `origin` and fails fast with a GitHub auth error instead of reporting misleading missing-branch or missing-secret results
  - `npm run verify:branch-protection-setup` now defaults to the repo slug from `origin` and fails fast with a GitHub auth error instead of reporting misleading protection gaps
  - `bash -n scripts/verify-deployment-targets.sh` passed
  - `npm run verify:deployment-targets` prints usage until `PUBLIC_URL`, `EMR_URL`, and `API_URL` are provided, which is the expected local behavior before cutover
  - backend SendGrid smoke fixtures now derive portal URLs from the shared link helper instead of hardcoding `https://patriotictelehealth.com/...`
  - `node --check public/assets/js/app-config.js` passed
  - `node --check public/assets/js/provider-admin.js` passed
  - note: the prior local failure was traced to `next/font/google` fetching `Inter` during build; `src/app/layout.tsx` now uses `font-sans` instead of a build-time Google font fetch
  - note: the build still emits existing ESLint warnings, but they are non-fatal and did not block static page generation or build trace collection

## Open Blockers

- repo-side readiness audit now indicates there are no remaining local implementation gaps beyond the still-pending env-history rewrite
- correct Cloudflare zone was not accessible from the currently available Cloudflare account
  - verified via Cloudflare API `GET /zones?name=patriotictelehealth.com`, which returned zero matches from the connected account
  - the same account currently lists only:
    - `omshreegauri.com.np`
    - `rajeevshrestha.info.np`
    - `samirshrestha.name.np`
- Git history cleanup and force-push were not executed in this working tree
- GCP project, Secret Manager, Workload Identity, Cloud Run service, and Cloud Run domain-mapping verification from this shell is blocked until `gcloud auth login` runs in a writable/unrestricted shell
- Firebase Hosting site and custom-domain verification from this shell is blocked until Firebase CLI auth/runtime is usable in an unrestricted shell
- production/staging GitHub environments and branch protections still require operator setup
- `gh` authentication is invalid in the current shell, so GitHub environment/secret verification must be re-run after `gh auth login`
- `staging` and `production` branches still require operator creation, and live verification from this shell is currently blocked until `gh auth login`
- `backend/` still needs an explicit legacy-vs-active decision so deployment scope is unambiguous

## Scope Evidence For `backend/`

- `firebase.json` deploys `public`, `emr-portal`, and `functions`, not `backend/`
- `.github/workflows/deploy-production.yml` deploys `emr-backend`, not `backend/`
- `EMR_ARCHITECTURE.md` documents `emr-backend/` as the backend service in the current architecture
- `backend/` is a separate CommonJS Node app with its own Dockerfile and standalone `index.js`, but no current deploy workflow points at it
