# Auth Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add production-grade controls for copied-cookie/token risk, idle sessions, CSRF, MFA enforcement, account lockout, break-glass access, and audit integrity.

**Architecture:** Keep Better Auth as the primary session provider and layer healthcare-specific controls in the monorepo API. Implement low-risk controls first in shared auth/session helpers and Elysia plugins, then add explicit database state for MFA enforcement, lockout, break-glass grants, and audit export/integrity.

**Tech Stack:** Bun, TypeScript, Elysia, Better Auth, Drizzle, PostgreSQL.

---

### Task 1: Server-Side Idle Timeout

**Files:**

- Modify: `packages/db/src/auth-schema.ts`
- Create: `packages/db/src/migrations/0007_auth_session_controls.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json`
- Modify: `packages/env/src/index.ts`
- Modify: `.env.example`
- Modify: `packages/auth/src/session-security.ts`
- Test: `packages/auth/src/session-security.test.ts`
- Modify: `apps/api/src/modules/auth/macro.ts`

**Steps:**

1. Add `session.last_activity_at`.
2. Add env settings for idle timeout and activity update throttle.
3. Add helper functions to validate idle age and touch session activity.
4. Reject expired sessions in the API auth macro and delete the expired session row.
5. Test active, stale, missing, and throttled-touch behavior.

### Task 2: CSRF Protection For Cookie-Authenticated Mutations

**Files:**

- Create: `apps/api/src/plugins/csrf.ts`
- Test: `apps/api/src/plugins/csrf.test.ts`
- Modify: `apps/api/src/setup.ts`
- Modify: `docs/auth.md`

**Steps:**

1. Add a guard that only applies to mutating methods.
2. Apply it when the request is using Better Auth cookie credentials and not bearer auth.
3. Allow only trusted `Origin` or `Referer` origins derived from `APP_URL` and `CORS_ORIGIN`.
4. Skip webhook/non-browser requests that do not carry auth cookies.
5. Test trusted origin, trusted referer, bearer auth bypass, no-cookie bypass, and rejected cross-site requests.

### Task 3: Auth Audit Event Coverage

**Files:**

- Create: `apps/api/src/modules/auth/security-audit.ts`
- Modify: `apps/api/src/modules/admin/users/users.controller.ts`
- Modify: `apps/api/src/modules/admin/roles/roles.controller.ts`
- Modify: `apps/api/src/modules/profile/profile.controller.ts`
- Test: targeted controller or service tests.

**Steps:**

1. Add a small audit helper for session revocation, token-version bump, account disable/enable, MFA reset, and permission downgrade events.
2. Store actor, target user, reason, IP address, user agent, and whether PHI access was involved.
3. Keep raw PHI out of `details`.
4. Add tests that verify the audit helper is called for high-risk routes.

### Task 4: MFA Enrollment And Step-Up Enforcement

**Files:**

- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/auth-schema.ts`
- Create migration.
- Modify: `packages/auth/src/auth.ts`
- Modify: `apps/api/src/modules/auth/macro.ts`
- Test: auth macro and route guard tests.

**Steps:**

1. Add Better Auth-compatible `users.twoFactorEnabled` if it is not already present in the effective database.
2. Add `AUTH_REQUIRE_STAFF_MFA` as a feature flag.
3. Require staff/admin roles to have verified MFA when the flag is enabled.
4. Add a `requireStepUp` macro for PHI export and admin security mutations.
5. Keep the flag off in local/dev defaults until frontend MFA enrollment UX is ready.

### Task 5: Account Lockout And Login Abuse Controls

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create migration.
- Modify: `packages/auth/src/auth.ts`
- Test: `packages/auth/src/auth.test.ts` or a focused helper test.

**Steps:**

1. Add `failed_login_attempts`, `locked_until`, and `last_failed_login_at` to users.
2. Use Better Auth before/after hooks for `/sign-in/email`.
3. Reject locked users before password verification.
4. Increment failed attempts after failed sign-in.
5. Reset failed attempts after successful sign-in.
6. Use a fixed short lockout initially: 5 failed attempts, then 15 minutes.

### Task 6: Break-Glass Emergency Access

**Files:**

- Add database table for emergency grants.
- Add admin/security route to grant emergency access.
- Add authenticated route to activate break-glass with a reason.
- Add route guard that checks active emergency grants.
- Add audit logging and notification hook.

**Steps:**

1. Require a named user session and a reason.
2. Require MFA or a documented compensating control.
3. Grant time-limited emergency permissions.
4. Audit every action with `isPhiAccess=true`.
5. Notify compliance/security staff.

### Task 7: Tamper-Evident Audit Export/SIEM Path

**Files:**

- Modify audit log schema if needed.
- Add audit export/forwarder worker or queue processor.
- Add deployment/env documentation.

**Steps:**

1. Keep application audit rows append-oriented.
2. Add hash-chain or external append-only sink.
3. Forward auth/PHI audit events to the configured SIEM/object-lock destination.
4. Add retention configuration and operational runbook.
