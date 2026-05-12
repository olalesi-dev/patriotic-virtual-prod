# User Management Audit Sessions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete backend user-management list/detail, audit list/export, and admin session visibility APIs.

**Architecture:** Keep the existing Elysia admin module and Better Auth database tables. Add bounded pagination utilities, safelisted filters/sorts, CSV/JSON audit export, and session login-method tracking stored on the server-side session row.

**Tech Stack:** Elysia, Better Auth, Drizzle, PostgreSQL, Bun tests, tsgo.

---

### Task 1: Session Login Method Storage

**Files:**

- Modify: `packages/db/src/auth-schema.ts`
- Modify: `packages/db/src/auth-schema.test.ts`
- Create: `packages/db/src/migrations/0018_admin_session_management.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json`
- Create: `packages/auth/src/session-login-method.ts`
- Create: `packages/auth/src/session-login-method.test.ts`
- Modify: `packages/auth/src/auth.ts`

**Steps:**

1. Add `session.login_method` with default `unknown`.
2. Add helpers that map Better Auth sign-in paths to login methods.
3. Mark newly created sessions when Better Auth exposes a session id in hook context.
4. Test method mapping and session-id extraction.

### Task 2: Shared Admin Query Helpers

**Files:**

- Create: `apps/api/src/modules/admin/query-utils.ts`
- Create: `apps/api/src/modules/admin/query-utils.test.ts`

**Steps:**

1. Add limit/offset clamping, boolean parsing, date parsing, sort-order normalization, and pagination metadata.
2. Test boundary cases and invalid input.

### Task 3: User Management Query Parity

**Files:**

- Modify: `apps/api/src/modules/admin/users/users.controller.ts`
- Create: `apps/api/src/modules/admin/users/users-query.test.ts`

**Steps:**

1. Replace dynamic sort lookup with a safelisted sort map.
2. Return `{ payload, pagination, sort, filters }`.
3. Add filters for search, role, disabled, email verified, MFA enabled, must-change-password, and created date range.
4. Add `GET /api/admin/users/:id` and `GET /api/admin/users/:id/sessions`.
5. Test route registration and query normalization.

### Task 4: Audit List And Export

**Files:**

- Modify: `apps/api/src/modules/admin/audit/audit.controller.ts`
- Create: `apps/api/src/modules/admin/audit/audit-export.ts`
- Create: `apps/api/src/modules/admin/audit/audit-export.test.ts`

**Steps:**

1. Add audit filters for actor, role, action, resource, PHI flag, export status, search, and date range.
2. Add safelisted sorting and pagination metadata.
3. Add `GET /api/admin/audit/export?format=csv|json`.
4. Test CSV escaping and export response route registration.

### Task 5: Admin Session Management API

**Files:**

- Create: `apps/api/src/modules/admin/sessions/sessions.controller.ts`
- Modify: `apps/api/src/modules/admin/admin.controller.ts`
- Modify: `apps/api/src/migration-route-parity.test.ts`

**Steps:**

1. Add `GET /api/admin/sessions`.
2. Filter by user, role, login method, active/expired state, search, and date range.
3. Sort by login time, last activity, expiry, user name, email, role, and login method.
4. Add route parity tests.

### Task 6: Verification

**Commands:**

- `bun run --cwd packages/auth test src/session-login-method.test.ts`
- `bun run --cwd apps/api test src/modules/admin/query-utils.test.ts src/modules/admin/audit/audit-export.test.ts src/modules/admin/users/users-query.test.ts src/migration-route-parity.test.ts`
- `bun run --cwd packages/auth typecheck`
- `bun run --cwd apps/api typecheck`
- `bun run --cwd packages/db typecheck`
- `bun run db:migrate:local`
- Local Postgres inspection for `session.login_method` and `admin:sessions:read`.
- `git diff --check`
