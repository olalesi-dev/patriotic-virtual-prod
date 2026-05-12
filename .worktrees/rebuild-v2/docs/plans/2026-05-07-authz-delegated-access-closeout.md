# Authz Delegated Access Closeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the backend-only authentication and authorization closeout before frontend MFA/auth UX work begins.

**Architecture:** Keep Better Auth as the primary session provider, then layer healthcare-specific authorization controls in Elysia macros and database-backed access records. Step-up uses an explicit server-side session timestamp. Delegated on-behalf-of access is modeled separately from break-glass and never copies the target user's role.

**Tech Stack:** Bun, Elysia, Better Auth, Drizzle ORM, PostgreSQL.

---

### Task 1: Explicit Step-Up State

**Files:**

- Modify: `packages/db/src/auth-schema.ts`
- Modify: `packages/auth/src/session-security.ts`
- Create: `apps/api/src/modules/auth/step-up.ts`
- Create: `apps/api/src/modules/auth/step-up.controller.ts`
- Modify: `apps/api/src/modules/auth/macro.ts`

**Steps:**

1. Add `session.step_up_authenticated_at`.
2. Add helpers to mark and verify step-up freshness.
3. Add password confirmation route.
4. Update `requireStepUp` to use the explicit marker.
5. Test helper and unauthorized route behavior.

### Task 2: Delegated On-Behalf-Of Access

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create: `apps/api/src/modules/delegated-access/service.ts`
- Create: `apps/api/src/modules/delegated-access/delegated-access.controller.ts`
- Modify: `apps/api/src/modules/auth/macro.ts`

**Steps:**

1. Add `delegated_access_sessions`.
2. Add bounded durations, scope normalization, active-session lookup, DoseSpot clinician resolution, and PHI audit logging.
3. Add admin create, current, and end routes.
4. Add `requireDelegatedAccess`.
5. Test helper behavior and route parity.

### Task 3: DoseSpot Server-Side Delegation

**Files:**

- Modify: `apps/api/src/modules/dosespot/controllers/compatibility.controller.ts`
- Modify: `apps/api/src/modules/dosespot/controllers/clinician.controller.ts`
- Modify: `apps/api/src/modules/dosespot/controllers/patient-workflow.controller.ts`

**Steps:**

1. Resolve `dosespot:on-behalf-of` from active backend delegation.
2. Pass target clinician IDs server-side.
3. Remove arbitrary frontend clinician proxy behavior from SSO.
4. Audit every delegated DoseSpot resolution.

### Task 4: Route Hardening

**Files:**

- Modify: `apps/api/src/modules/notifications/notification.controller.ts`
- Modify: `apps/api/src/modules/dosespot/controllers/compatibility.controller.ts`
- Modify: `packages/db/src/seed.ts`
- Modify: `packages/db/src/migrations/0013_step_up_and_delegated_access.sql`

**Steps:**

1. Protect internal notification enqueue routes.
2. Add missing permissions used by admin modules.
3. Require permissions on high-risk DoseSpot read/write routes.
4. Add tests that unauthorized requests are blocked.

### Task 5: Verification

**Commands:**

- `SKIP_ENV_VALIDATION=true bun test ...focused files...`
- `bun run --cwd packages/db typecheck`
- `bun run --cwd packages/auth typecheck`
- `bun run --cwd apps/api typecheck`
- `bun run db:migrate:local`
- `bun run --cwd packages/db test`
- `bun run --cwd packages/auth test`
- `bun run --cwd apps/api test`
- `git diff --check`
