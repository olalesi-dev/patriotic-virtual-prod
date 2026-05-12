# Admin Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add backend support for admin-only account bootstrap, first-login password reset, mandatory MFA onboarding, super-admin approved password resets, audit logging, and descriptive `/api/auth/*` OpenAPI contracts.

**Architecture:** Keep Better Auth as the session and MFA provider. Add admin-specific policy and workflow state in the application schema, expose application-owned `/api/auth/admin/*` routes, and continue using token-version revocation plus audit logs for sensitive account changes. The frontend can later use these route contracts to block dashboard access until password and MFA requirements are satisfied.

**Tech Stack:** Elysia, TypeBox, Better Auth, Drizzle, PostgreSQL, SendGrid email helpers, Bun tests.

---

### Task 1: Schema For Admin Auth Workflow

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/src/migrations/0014_admin_auth_workflow.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json`
- Modify: `packages/db/src/schema.test.ts`

**Steps:**

1. Add user columns for `must_change_password`, `password_changed_at`, and `admin_created_by_id`.
2. Add `admin_password_reset_requests` with pending/approved/rejected status, requester metadata, approver metadata, IP/user-agent, and timestamps.
3. Add schema tests that assert the new columns/table exist.

### Task 2: Admin Auth Service

**Files:**

- Create: `apps/api/src/modules/auth/admin-auth.service.ts`
- Create: `apps/api/src/modules/auth/admin-auth.service.test.ts`

**Steps:**

1. Implement default password generation and hashing with Bun Argon2id.
2. Implement admin role normalization for only `Admin` and `SuperAdmin`.
3. Implement backup-code generation policy with exactly 16 one-time codes metadata.
4. Implement email builders for default-password and approved-reset delivery.
5. Implement reset-request status transition guards.

### Task 3: Admin Auth Controller

**Files:**

- Create: `apps/api/src/modules/auth/admin-auth.controller.ts`
- Modify: `apps/api/src/index.ts`

**Steps:**

1. Add `POST /api/auth/admin/users` for super-admin/admin creation by super-admin only.
2. Add `GET /api/auth/admin/session/requirements` for frontend gating.
3. Add `POST /api/auth/admin/first-password` for forced password change after default password login.
4. Add `POST /api/auth/admin/password-reset/requests` for user-initiated forgot-password requests.
5. Add `GET /api/auth/admin/password-reset/requests` for super-admin review.
6. Add `POST /api/auth/admin/password-reset/requests/:id/approve` and `.../reject`.
7. Add TypeBox body/response schemas with `200`, `201`, `400`, and `500` response shapes where relevant.

### Task 4: MFA And Session Policy

**Files:**

- Modify: `packages/auth/src/mfa-config.ts`
- Modify: `packages/auth/src/mfa-config.test.ts`
- Modify: `.env.example`
- Modify: `apps/api/src/modules/auth/macro.ts`
- Modify: `apps/api/src/modules/auth/macro.test.ts`

**Steps:**

1. Change default trusted-device lifetime to 14 days.
2. Add an auth macro escape hatch for onboarding routes that need a signed-in user before MFA is complete.
3. Keep dashboard/API route access blocked when staff MFA is not verified.

### Task 5: Audits And Verification

**Files:**

- Modify or create focused tests under `apps/api/src/modules/auth/*.test.ts`
- Modify docs if needed after routes are implemented.

**Steps:**

1. Assert account creation, first-password change, reset request, approval, and rejection log audit events with IP address.
2. Run API/auth/db package tests and typechecks.
3. Run migrations locally against development Postgres if schema changes are included.
