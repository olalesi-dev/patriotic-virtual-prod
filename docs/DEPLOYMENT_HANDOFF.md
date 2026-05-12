# Deployment Handoff

This is the shortest ordered version of what still needs to happen outside the repo.

## What Is Already Done In Repo

- folder roles are fixed as:
  - `public` -> marketing homepage
  - `emr-portal` -> shared Next.js EMR portal for providers and patients
  - `emr-backend` -> shared Node.js backend used by both `public` and `emr-portal`
- path-aware CI and deploy workflows exist for `public`, `emr-portal`, and `emr-backend`
- redirect/origin handling has been centralized around:
  - `dev.patriotictelehealth.com`
  - `emr-dev.patriotictelehealth.com`
  - `patriotictelehealth.com`
  - `emr.patriotictelehealth.com`
  - `api.patriotictelehealth.com`
- `emr-portal` build passes
- `emr-backend` build passes
- actual deploy topology is:
  - `public` -> Firebase Hosting target `landing`
  - `emr-portal` -> Firebase Hosting target `emr`, with Next.js handled through Firebase frameworks hosting/backend integration
  - `emr-backend` -> standalone Cloud Run service
- chosen staging host convention is:
  - `dev.patriotictelehealth.com` for marketing
  - `emr-dev.patriotictelehealth.com` for the EMR portal
  - not `dev.emr.patriotictelehealth.com`
- the repo-side readiness audit currently fails on exactly one item:
  - env cleanup is still incomplete:
    - current index is now clean for `emr-portal/.env.dev`, `emr-portal/.env.production`, and `emr-portal/.env.test`
    - Git history still contains those three files and still needs a destructive rewrite plus force-push
- helper commands exist for:
  - operator decision planning
  - operator auth preflight
  - operator auth repair plan
  - env cleanup
  - branch bootstrap
  - Secret Manager bootstrap
  - Workload Identity bootstrap
  - GitHub environment bootstrap
  - branch protection bootstrap
  - Firebase Hosting site bootstrap
  - Firebase Hosting custom-domain bootstrap
  - Cloud Run domain-mapping bootstrap
  - Cloudflare DNS bootstrap
  - GitHub, branch-protection, GCP, Firebase Hosting, Firebase custom-domain, Cloudflare zone, DNS, operator-auth, env-history, aggregate handoff, and deployed-target verification
- the current Cloudflare session does not have the `patriotictelehealth.com` zone

## What You Need To Do Now

Do these in order.

If you want the repo to print the whole ordered sequence first, run:

```bash
npm run plan:deployment-handoff
```

Before any remote verification, confirm local operator auth first:

```bash
npm run verify:operator-auth
```

If that fails, print the exact local recovery steps:

```bash
npm run plan:operator-auth-repair
```

If you want a single repo-side readiness check afterward, run:

```bash
npm run audit:deployment-readiness
```

Right now that audit should fail only on the env-history cleanup blocker until the history rewrite is done.

If you want one current-shell blocker summary before doing any remote work, run:

```bash
npm run report:deployment-blockers
```

If you want the unresolved manual decisions listed explicitly first, run:

```bash
npm run plan:operator-decisions
```

If you want one combined post-bootstrap verification command after the remote setup is in place, run:

```bash
CLOUDFLARE_API_TOKEN=... \
CLOUDFLARE_ZONE_NAME=patriotictelehealth.com \
WWW_HANDLING_MODE=redirect \
VERIFY_CLOUDFLARE=1 \
npm run verify:deployment-handoff
```

That wrapper runs operator-auth first, then env-history, GitHub, branch-protection, GCP, Firebase Hosting, and Firebase custom-domain verification, will attempt DNS verification unless you set `VERIFY_DNS=0`, and can optionally run Cloudflare API verification if you set `VERIFY_CLOUDFLARE=1`, provide `CLOUDFLARE_API_TOKEN`, and choose `WWW_HANDLING_MODE=redirect|record|skip`.

After staging setup and DNS cutover, run:

```bash
PUBLIC_URL=https://dev.patriotictelehealth.com \
EMR_URL=https://emr-dev.patriotictelehealth.com \
API_URL=https://api.patriotictelehealth.com \
EXPECT_STAGING_BANNER=1 \
npm run verify:deployment-targets
```

After production setup and DNS cutover, run:

```bash
PUBLIC_URL=https://patriotictelehealth.com \
EMR_URL=https://emr.patriotictelehealth.com \
API_URL=https://api.patriotictelehealth.com \
EXPECT_STAGING_BANNER=0 \
npm run verify:deployment-targets
```

### 1. Confirm Scope

- Confirm `backend/` is legacy-only and out of deploy scope.
- If it is not legacy, stop and define its deployment lifecycle separately before using the new pipeline.

### 2. Remove Tracked Env Files From Git History

Run:

```bash
npm run check:tracked-envs
npm run plan:env-history-cleanup
```

Then execute the printed mirror-clone rewrite flow, force-push, and rotate every secret that ever lived in those env files.

Then prove the cleanup actually worked:

```bash
npm run verify:env-history-cleanup
```

### 3. Commit And Push The Cleaned Repo Changes

- Commit the current repo-side deployment changes after the env cleanup rewrite is complete.
- Push them so GitHub has the split `ci`, `deploy-staging`, and `deploy-production` workflows before remote bootstrap begins.

### 4. Create Remote Branches

Run:

```bash
npm run plan:branch-bootstrap
```

Then create:

- `staging`
- `production`

### 5. Create GitHub Environments And Variables

Run:

```bash
npm run plan:github-environments-bootstrap
```

Then execute the printed `gh` commands.

Then verify the remote GitHub state:

```bash
npm run verify:github-deployment-setup
```

### 6. Add Branch Protection

Run:

```bash
npm run plan:branch-protection-bootstrap
```

Then apply the printed protection settings for `staging` and `production`.

Then verify the remote protection state:

```bash
npm run verify:branch-protection-setup
```

### 7. Bootstrap GCP Workload Identity

Run:

```bash
npm run plan:workload-identity-bootstrap
```

Then execute the printed `gcloud` commands and copy the resulting values into:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`

Then verify the remote GCP state:

```bash
npm run verify:gcp-deployment-setup
```

### 8. Create Secret Manager Payloads

Run:

```bash
npm run plan:secret-manager-bootstrap
```

Then:

- create `emr-portal-env-staging`
- create `emr-portal-env-production`
- create `emr-backend-env-production`

using the repo example files as payload templates.

Preferred secret separation:

- keep staging secrets in `patriotic-virtual-dev`
- keep production secrets in `patriotic-virtual-prod`

Acceptable fallback if you cannot separate by project:

- use one project, but enforce strict secret name prefixes such as `staging-*` and `production-*`

Then re-run the GCP verifier so the expected secrets, deploy identity, Cloud Run service, and domain-mapping prerequisites are checked together:

```bash
npm run verify:gcp-deployment-setup
```

### 9. Create Firebase Hosting Sites

Run:

```bash
npm run plan:firebase-hosting-bootstrap
```

Then create the expected Hosting sites if they do not already exist and verify them:

```bash
npm run verify:firebase-hosting-setup
```

### 10. Bind Firebase Hosting Custom Domains

Run:

```bash
npm run plan:firebase-custom-domain-bootstrap
```

Then bind:

- `dev.patriotictelehealth.com` -> staging landing site
- `emr-dev.patriotictelehealth.com` -> staging EMR site
- `patriotictelehealth.com` -> production landing site
- `emr.patriotictelehealth.com` -> production EMR site

Use the exact domain verification and DNS records shown by Firebase Hosting as the source of truth for Cloudflare.

Then verify the remote custom-domain bindings:

```bash
npm run verify:firebase-custom-domains
```

### 11. Create Cloud Run API Domain Mapping

Run:

```bash
npm run plan:cloud-run-domain-mapping-bootstrap
```

Then create the `api.patriotictelehealth.com` Cloud Run domain mapping and verify it through the GCP verifier:

```bash
PRODUCTION_API_DOMAIN=api.patriotictelehealth.com \
npm run verify:gcp-deployment-setup
```

### 12. Configure DNS In Cloudflare

Run:

```bash
npm run plan:cloudflare-dns-bootstrap
```

Then create the DNS records using the exact values generated by Firebase Hosting and Cloud Run.

Do not guess those records.

If you have Cloudflare API access to the live zone, you can also verify the expected record names through the API:

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

## Final Acceptance Checks

After the above is done, verify:

- `https://dev.patriotictelehealth.com`
- `https://emr-dev.patriotictelehealth.com/login`
- `https://patriotictelehealth.com`
- `https://emr.patriotictelehealth.com/login`
- `https://api.patriotictelehealth.com/health`

Also verify:

- the homepage dashboard button lands in EMR
- notification links land in EMR, not the marketing site
- staging visually shows it is staging
- DNS resolves for the staging and production public, EMR, and API hosts

And run:

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
