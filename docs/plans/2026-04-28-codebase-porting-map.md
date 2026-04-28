# Rebuild Porting Map

**Purpose:** handoff notes for continuing the `emr-backend` to `rebuild-v2` migration after the Gemini worktree stopped mid-task.

**Working tree:** `/home/zeus/Projects/patriotic-virtual-prod/.worktrees/rebuild-v2`

**Old source:** `/home/zeus/Projects/patriotic-virtual-prod/emr-backend/src`

**Current rebuild stack:** Bun workspaces, Turborepo, Elysia, Better Auth, Drizzle/Postgres, TypeBox, Valkey/Redis, SendGrid.

**Important current state:** the rebuild worktree already has many uncommitted Gemini changes. Do not run broad cleanup or revert commands. Commit in small slices.

---

## Resume Prompt For Gemini

Continue in:

```bash
cd /home/zeus/Projects/patriotic-virtual-prod/.worktrees/rebuild-v2
PATH=/home/zeus/.bun/bin:$PATH
```

Use this file as the migration map. Port modules in the "Recommended Port Order" section, lowest blast radius first. Keep each slice independently typechecked and tested:

```bash
PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bun run typecheck
```

---

## Current Rebuild Inventory

### Foundation

- `package.json` - root Bun workspace and catalog versions.
- `turbo.json` - task graph for workspace scripts.
- `tsconfig.json` - shared TS config, `@workspace/*` path mapping.
- `bunfig.toml` - local Bun/cache config.
- `.env.example` - generated env list.
- `infra/docker/docker-compose.yml` - local Postgres, Valkey, API, admin services.

### `packages/env`

- `packages/env/src/index.ts` - TypeBox env schema and validation. Current keys cover DB/API/CORS/Vouched/SendGrid/Redis.
- `packages/env/src/index.test.ts` - env schema tests.
- `packages/env/scripts/sync-env-example.ts` - writes `.env.example` from schema.
- `packages/env/package.json`, `packages/env/tsconfig.json` - package metadata.

### `packages/db`

- `packages/db/src/schema.ts` - core Drizzle schema: roles, organizations, users, patients, providers, appointments, audit logs, audit trigger SQL.
- `packages/db/src/auth-schema.ts` - Better Auth tables: session, account, verification, twoFactor.
- `packages/db/src/identity-verifications.ts` - identity verification table tied to patients/appointments.
- `packages/db/src/index.ts` - schema exports.
- `packages/db/src/migrate.ts` - Drizzle migration runner.
- `packages/db/src/seed.ts` - seed roles/org/users.
- `packages/db/src/*.test.ts` - schema, migrate, seed, identity verification tests.
- `packages/db/src/migrations/*` - generated Drizzle migration metadata and SQL.

### `packages/auth`

- `packages/auth/src/auth.ts` - Better Auth server config with Drizzle adapter, email/password, Google, twoFactor/admin plugins, and welcome-email hook.
- `packages/auth/src/client.ts` - Better Auth React client.
- `packages/auth/src/email-hooks.ts` - maps created users to `patient_welcome` or `staff_welcome`; sends welcome email without blocking account creation on SendGrid failure.
- `packages/auth/src/index.ts` - package exports.
- `packages/auth/src/*.test.ts` - auth/client/email hook tests.

### `packages/email`

- `packages/email/src/templates.ts` - SendGrid template keys and sender defaults.
- `packages/email/src/sendgrid.ts` - injectable SendGrid dynamic template adapter.
- `packages/email/src/send-template-email.ts` - high-level template email sender.
- `packages/email/src/send-template-email.test.ts` - SendGrid payload tests.
- `packages/email/src/index.ts`, `packages/email/package.json` - package surface.

### `packages/queue`

- `packages/queue/src/notification-queue.ts` - BullMQ-backed notification queue with inline fallback for dev/test.
- `packages/queue/src/notification-queue.test.ts` - delay/fallback tests.
- `packages/queue/src/index.ts`, `packages/queue/package.json` - package surface.

### `packages/ui`

- `packages/ui/src/components/Button/Button.tsx` - shared Button component.
- `packages/ui/src/components/Input/Input.tsx` - shared Input component.
- `packages/ui/src/components/Button.tsx` - older/simple Button export still present.
- `packages/ui/src/styles/*.css` - global, patient, provider CSS.
- `packages/ui/setup.ts`, component tests - test DOM setup and component coverage.

### `apps/api`

- `apps/api/src/index.ts` - Elysia app entry with OpenAPI and `/api` group.
- `apps/api/src/setup.ts` - global Elysia setup: logger, request id, IP, helmet, CORS, rate limit, compression, circuit breaker, XSS, auth/audit macros, standard response envelope.
- `apps/api/src/db.ts` - Drizzle/Postgres app DB client.
- `apps/api/src/modules/auth/*` - Better Auth route bridge and auth macros.
- `apps/api/src/modules/audit/*` - audit controller, service, and macro.
- `apps/api/src/modules/health/*` - health controller and test.
- `apps/api/src/modules/vouched/*` - new Elysia Vouched webhook model/controller/service.
- `apps/api/src/plugins/*` - circuit breaker and compression plugins.
- `apps/api/src/utils/*` - errors and logger config.
- `apps/api/test-imports.ts`, `apps/api/test-use.ts` - scratch dependency import checks from earlier setup.

### `apps/admin`

- `apps/admin/package.json` only. TanStack Start/login UI is not implemented yet.

---

## Old Backend Module Inventory

### Bootstrap, Config, Middleware

- `emr-backend/src/index.ts` - Express bootstrap, route mounting, raw body capture, CORS, root health, protected route gate, inline DoseSpot SSO/count/admin user helper routes.
- `emr-backend/src/config/database.ts` - `pg.Pool` for old Postgres queries.
- `emr-backend/src/config/firebase.ts` - Firebase Admin init from JSON, base64 JSON, split env, or ADC.
- `emr-backend/src/config/stripe.ts` - Stripe client and configured flag.
- `emr-backend/src/middleware/auth.ts` - Firebase token verification, old Postgres user context, staff MFA gate.
- `emr-backend/src/middleware/error.ts` - Express error handler.
- `emr-backend/src/types/express.d.ts` - Express request augmentation.

### Simple Routes

- `emr-backend/src/routes/health.ts` - DB-backed health check.
- `emr-backend/src/routes/patients.ts` - placeholder patients route.
- `emr-backend/src/routes/appointments.ts` - placeholder appointments route.
- `emr-backend/src/routes/consultations.ts` - creates Firestore consultation and patient profile after Firebase-authenticated intake.

### Payments And Consultations

- `emr-backend/src/routes/payments.ts` - protected Stripe Checkout creation and session confirmation.
- `emr-backend/src/routes/webhooks.ts` - Stripe webhook for checkout success and charge failure; triggers notification producers.
- `emr-backend/src/services/consultation-payments.ts` - service catalog, checkout line item builder, post-payment Firestore appointment/consultation updates.
- `emr-backend/src/utils/stripe-checkout-urls.ts` - safe redirect URL builder that preserves Stripe `{CHECKOUT_SESSION_ID}` placeholder.
- `emr-backend/src/utils/stripe-checkout-urls.test.ts` - redirect placeholder coverage.

### Vouched

- `emr-backend/src/routes/vouched.ts` - authenticated job completion plus public webhook endpoint.
- `emr-backend/src/services/vouched.ts` - Vouched signature validation, job fetch, uid correlation, Firestore user/patient verification persistence, audit log.

### Notifications

- `emr-backend/src/modules/notifications/types.ts` - channels, priorities, topics, template keys, request/record types.
- `emr-backend/src/modules/notifications/registry.ts` - topic catalog and inbox/email/SMS rendering rules.
- `emr-backend/src/modules/notifications/registry.test.ts` - topic behavior tests.
- `emr-backend/src/modules/notifications/orchestrator.ts` - turns requests into message/delivery records, applies allowed channels/preferences/PHI guard.
- `emr-backend/src/modules/notifications/service.ts` - dedupe, recipient lookup, persist message/deliveries, enqueue delivery tasks, cancel scheduled tasks.
- `emr-backend/src/modules/notifications/repository.ts` - Firestore repository for messages, deliveries, events, user prefs, recipient profiles, in-app notifications, FCM push.
- `emr-backend/src/modules/notifications/jobs/dispatch.ts` - delivery worker: SendGrid, Twilio, in-app projection, retries, SendGrid event processing.
- `emr-backend/src/modules/notifications/queue.ts` - old GCP Cloud Tasks enqueue/delete/secret verification with inline dev fallback.
- `emr-backend/src/modules/notifications/producers.ts` - domain producers for priority queue payment success and failed payment.
- `emr-backend/src/modules/notifications/direct-email.ts` - direct template email sender.
- `emr-backend/src/modules/notifications/channels/sendgrid.adapter.ts` - SendGrid dynamic template adapter.
- `emr-backend/src/modules/notifications/channels/twilio.adapter.ts` - Twilio channel adapter.
- `emr-backend/src/modules/notifications/templates/template.mapper.ts` - template ID env mapping plus dynamic template discovery from SendGrid.
- `emr-backend/src/modules/notifications/sendgrid-webhook-security.ts` - SendGrid webhook signature verification.
- `emr-backend/src/modules/notifications/template-data.ts` - date/time/platform template helpers.
- `emr-backend/src/modules/notifications/links.ts` - portal URL helper.
- `emr-backend/src/modules/notifications/policies/dedupe.policy.ts` - notification dedupe key builder.
- `emr-backend/src/modules/notifications/policies/dedupe.policy.test.ts` - dedupe tests.
- `emr-backend/src/modules/notifications/policies/phi.policy.ts` - channel/PHI safety guard.
- `emr-backend/src/modules/notifications/policies/retry.policy.ts` - priority-based retry delays.
- `emr-backend/src/modules/notifications/index.ts` - barrel export.
- `emr-backend/src/routes/notifications.ts` - legacy/manual priority queue notification endpoint.
- `emr-backend/src/routes/notifications-v1.ts` - protected notification API: notify, direct template email, delivery status.
- `emr-backend/src/routes/notification-worker.ts` - old worker HTTP task endpoint and SendGrid webhook endpoint.
- `emr-backend/src/scripts/sendgrid-delivery-status.ts` - CLI for checking delivery status.
- `emr-backend/src/scripts/sendgrid-notification-smoke.ts` - SendGrid template smoke runner.
- `emr-backend/src/services/sendgrid.ts` - older simple SendGrid sender, superseded by notification module for most flows.
- `emr-backend/src/services/twilio.ts` - simple SMS sender.

### DoseSpot

- `emr-backend/src/utils/dosespot.ts` - SSO URL signing plus access token fetch.
- `emr-backend/src/utils/dosespot.test.ts` - SSO/token tests.
- `emr-backend/src/utils/dosespot-test.ts` - manual SSO URL test script.
- `emr-backend/src/services/dosespot-rest.ts` - authenticated DoseSpot REST fetch wrapper.
- `emr-backend/src/services/dosespot-patients.ts` - patient ensure/delete/sync logic, search/creation/ambiguous match handling, preferred pharmacy sync.
- `emr-backend/src/services/dosespot-patients.test.ts` - patient sync behavior coverage.
- `emr-backend/src/services/dosespot-clinicians.ts` - clinician readiness, sync, registration status, legal agreements, IDP/KBA/OTP flows, webhook application.
- `emr-backend/src/services/dosespot-clinicians.test.ts` - clinician workflow tests.
- `emr-backend/src/services/dosespot-workflows.ts` - medication history, consent, prescription summary, pending refill/RxChange queues.
- `emr-backend/src/services/dosespot-validation.ts` - screen demo validation runner.
- `emr-backend/src/services/dosespot-summary-sync.ts` - sync DoseSpot webhook updates into patient medication/pharmacy summaries.
- `emr-backend/src/services/dosespot-push.ts` - webhook secret validation, Cloud Tasks enqueueing, event persistence, leases, count updates, notification drafts, processing, validation report.
- `emr-backend/src/services/dosespot-push.test.ts` - webhook event and processing tests.
- `emr-backend/src/routes/dosespot.ts` - all DoseSpot HTTP endpoints: webhooks, health/validation, clinician flows, patient ensure/delete/pharmacy, medication history, prescriptions, refill/RxChange queues, dev helpers.

### Misc Services

- `emr-backend/src/services/telehealth.ts` - old DB-backed telehealth service stub.
- `emr-backend/src/utils/logger.ts` - Winston logger.

---

## Old Source Touch Count

This comes from `git log --name-only -- emr-backend/src`. It measures historical edit frequency, not runtime risk.

Low touch:

- `config/firebase.ts`, `config/stripe.ts`, `middleware/error.ts`
- `routes/appointments.ts`, `routes/consultations.ts`, `routes/health.ts`, `routes/notification-worker.ts`, `routes/notifications-v1.ts`, `routes/patients.ts`
- `services/dosespot-rest.ts`, `services/dosespot-validation.ts`, `services/telehealth.ts`, `services/twilio.ts`, `services/vouched.ts`
- `utils/dosespot-test.ts`, `utils/logger.ts`, `utils/stripe-checkout-urls.ts`, `utils/stripe-checkout-urls.test.ts`

Medium touch:

- `config/database.ts`, `middleware/auth.ts`, `routes/notifications.ts`, `routes/payments.ts`, `routes/vouched.ts`, `routes/webhooks.ts`
- `services/dosespot-push.test.ts`, `services/dosespot-summary-sync.ts`, `services/dosespot-workflows.ts`, `services/sendgrid.ts`, `types/express.d.ts`
- `services/consultation-payments.ts`, `services/dosespot-clinicians.test.ts`
- `services/dosespot-clinicians.ts`, `services/dosespot-patients.test.ts`, `services/dosespot-push.ts`, `utils/dosespot.test.ts`
- `services/dosespot-patients.ts`

High touch:

- `utils/dosespot.ts`
- `routes/dosespot.ts`
- `emr-backend/src/index.ts`
- `modules/notifications/*`

---

## Recommended Port Order

### 0. Commit The Current Rebuild Infrastructure Slice

Commit the new SendGrid/queue/auth/env work before continuing. It is already verified independently.

Relevant rebuild files:

- `packages/email/*`
- `packages/queue/*`
- `packages/auth/src/email-hooks.ts`
- `packages/auth/src/auth.ts`
- `packages/env/src/index.ts`
- `.env.example`
- `package.json`

### 1. Low-Risk Utility And Config Parity

Port tiny helpers before domain modules:

- `utils/stripe-checkout-urls.ts` -> likely `packages/common/src/stripe-checkout-urls.ts` or `apps/api/src/utils/stripe-checkout-urls.ts`.
- `config/stripe.ts` -> new Stripe package or `apps/api/src/modules/payments/stripe.ts`.
- `services/twilio.ts` -> defer unless SMS is in scope.
- Firebase config should not be ported wholesale if the rebuild is moving to Postgres/Better Auth. Only keep temporary compatibility if old Firestore data remains authoritative.

Why first: small files, good tests, low coupling.

### 2. Finish Vouched

Current rebuild already has:

- `apps/api/src/modules/vouched/model.ts`
- `apps/api/src/modules/vouched/service.ts`
- `apps/api/src/modules/vouched/vouched.controller.ts`
- `packages/db/src/identity-verifications.ts`

Next checks:

- Compare old `services/vouched.ts` uid correlation and audit behavior against new `processVouchedJob`.
- Decide whether verification mirrors into `patients` table or only `identity_verifications`.
- Add webhook raw body handling if current Elysia path does not preserve the exact body for HMAC.

Why next: already partially ported and smaller than notifications/DoseSpot.

### 3. Notification Core Without Full Delivery Status

The new base exists:

- `packages/email/*`
- `packages/queue/*`

Port next:

- `modules/notifications/types.ts`
- `registry.ts`
- `template-data.ts`
- `links.ts`
- `policies/dedupe.policy.ts`
- `policies/phi.policy.ts`
- `policies/retry.policy.ts`

Target destination:

- `packages/notifications/src/*` if shared by API/workers.
- Or `apps/api/src/modules/notifications/*` if API-only.

Do not port Firestore repository directly. First design the Postgres tables:

- notification messages
- notification deliveries
- notification events
- user notification preferences
- in-app notifications

Why now: notification types/registry are pure logic and unlock payments/reminders.

### 4. Notification Dispatch Worker

Port:

- `jobs/dispatch.ts`
- `service.ts`
- `producers.ts`
- `routes/notification-worker.ts`
- `routes/notifications-v1.ts`
- `sendgrid-webhook-security.ts`

Replace:

- old `modules/notifications/queue.ts` Cloud Tasks with `packages/queue`.
- old Firestore repository with Postgres/Drizzle repository.

Keep explicit tests for:

- dedupe
- scheduled enqueue delay
- retry delay
- SendGrid webhook event matching
- no-account-creation-failure when email send fails

Why after notification core: this is where persistence and queue behavior matter.

### 5. Payments And Consultations

Port:

- `services/consultation-payments.ts`
- `routes/consultations.ts`
- `routes/payments.ts`
- `routes/webhooks.ts`
- `utils/stripe-checkout-urls.ts`

Replace Firestore writes with Drizzle tables. Needed tables likely include:

- consultations
- payment sessions or checkout sessions
- appointment request / waitlist status

Dependency:

- notification producers for checkout success and failed payments.

Why after notifications: Stripe webhooks currently call notification producers.

### 6. Basic DoseSpot SSO And Patient Ensure

Port:

- `utils/dosespot.ts`
- `services/dosespot-rest.ts`
- `services/dosespot-patients.ts`
- the SSO and patient endpoints from `routes/dosespot.ts`

Do not port the whole `routes/dosespot.ts` file at once. Start with:

- `GET /dosespot/sso-url`
- `POST /dosespot/patients/ensure`
- preferred pharmacy sync if needed for the first UI flow

Dependency:

- patient/provider schema must be ready.
- decide where `doseSpotClinicianId`, `doseSpotPatientId`, sync status, missing fields, and pharmacy IDs live.

Why now: enough to support provider workflow without webhook processing.

### 7. DoseSpot Clinician Workflows

Port:

- `services/dosespot-clinicians.ts`
- clinician endpoints from `routes/dosespot.ts`

Endpoints include:

- readiness
- sync
- registration status
- legal agreements
- IDP disclaimer/init/start/answers/OTP

Why later: large file, many state transitions, depends on provider schema decisions.

### 8. DoseSpot Patient Workflows

Port:

- `services/dosespot-workflows.ts`
- `services/dosespot-validation.ts`
- medication history, consent, prescriptions, refill queue, RxChange queue endpoints.

Why later: mostly read/workflow heavy and depends on patient/clinician sync being correct.

### 9. DoseSpot Push Webhooks

Port last:

- `services/dosespot-push.ts`
- `services/dosespot-summary-sync.ts`
- push webhook endpoints from `routes/dosespot.ts`

Replace:

- Cloud Tasks with `packages/queue`.
- Firestore webhook event documents with Postgres tables.
- Firestore user notification counts with a Postgres or notification projection.

Why last: highest complexity and async correctness risk. It has leases, dedupe, event persistence, task auth, clinician webhook application, summary sync, and notification count projections.

### 10. Admin Frontend

Only start after auth + backend routes needed for login are stable:

- `apps/admin` needs TanStack Start routing.
- Login should use Better Auth client from `@workspace/auth`.
- Keep first UI slice small: login, authenticated shell, sign out, session check.

---

## Suggested Module Destinations

| Old module | Rebuild destination | Notes |
|---|---|---|
| Express bootstrap | `apps/api/src/index.ts`, `apps/api/src/setup.ts` | Already replaced by Elysia setup. |
| Firebase auth middleware | `packages/auth`, `apps/api/src/modules/auth` | Do not port Firebase auth wholesale unless compatibility is required. |
| Vouched | `apps/api/src/modules/vouched`, `packages/db/src/identity-verifications.ts` | Already partially ported. Finish parity checks. |
| SendGrid direct email | `packages/email` | Basic welcome sender already implemented. Expand templates as needed. |
| Cloud Tasks notification queue | `packages/queue` | Replaced by BullMQ/Valkey. |
| Notification domain | new `packages/notifications` or `apps/api/src/modules/notifications` | Prefer package if worker will run separately. |
| Stripe payments | `apps/api/src/modules/payments` plus DB schema | Needs consultation/payment tables. |
| Consultations | `apps/api/src/modules/consultations` plus DB schema | Replace Firestore writes. |
| DoseSpot REST/helpers | `packages/dosespot` or `apps/api/src/modules/dosespot` | Package is cleaner because API and worker paths will share it. |
| DoseSpot webhook processing | worker module using `packages/queue` | Port after schema and simpler DoseSpot routes. |
| Old UI shared components | `packages/ui` | Existing Button/Input only; admin app not built. |

---

## Environment Variables To Reconcile

Already in rebuild env schema:

- `DATABASE_URL`
- `PORT`
- `CORS_ORIGIN`
- `NODE_ENV`
- `VOUCHED_PRIVATE_KEY`
- `VOUCHED_SIGNATURE_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_DEFAULT_FROM_EMAIL`
- `SENDGRID_DEFAULT_REPLY_TO_EMAIL`
- `SENDGRID_TEMPLATE_PATIENT_WELCOME`
- `SENDGRID_TEMPLATE_STAFF_WELCOME`
- `EMAIL_DEBUG_LOGS`
- `REDIS_URL`
- `NOTIFICATION_QUEUE_NAME`
- `QUEUE_INLINE_FALLBACK`

Still needed before later ports:

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, app URL settings.
- SendGrid full notification templates: appointment, priority queue, reminders, secure message, failed payment templates.
- SendGrid webhook: `SENDGRID_WEBHOOK_VERIFICATION_KEY`.
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- DoseSpot: `DOSESPOT_BASE_URL`, `DOSESPOT_CLINIC_ID`, `DOSESPOT_CLINIC_KEY`, `DOSESPOT_USER_ID`, `DOSESPOT_SECRET_KEY`, `DOSESPOT_SUBSCRIPTION_KEY`, `DOSESPOT_DEFAULT_CLINICIAN_ID`, `DOSESPOT_WEBHOOK_SECRET`.
- Cloud Tasks vars should not be ported unless keeping old infra temporarily.

---

## Risk Notes

- The old notification repository is Firestore-centric. Do not copy it into the rebuild unchanged.
- Old DoseSpot processing uses both Firestore and Cloud Tasks. The rebuild should use Postgres + BullMQ/Valkey.
- Old `index.ts` has inline DoseSpot routes mixed with route modules. In Elysia, split those into dedicated controllers.
- Vouched signature verification needs raw request body. Verify the Elysia controller preserves raw bytes before considering it production-equivalent.
- Better Auth warning in tests about `BETTER_AUTH_URL` is expected until that env is set.
- `bun` is available at `/home/zeus/.bun/bin/bun`; Turbo needs `/home/zeus/.bun/bin` on `PATH`.

---

## Verification Commands

Known passing after the SendGrid/queue/auth slice:

```bash
SKIP_ENV_VALIDATION=true /home/zeus/.bun/bin/bun test packages/email
SKIP_ENV_VALIDATION=true /home/zeus/.bun/bin/bun test packages/queue
SKIP_ENV_VALIDATION=true /home/zeus/.bun/bin/bun test packages/auth packages/env
PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bun run typecheck
```

Targeted lint passed for:

```bash
PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bun run --filter @workspace/email lint
PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bun run --filter @workspace/queue lint
PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bun run --filter @workspace/auth lint
```
