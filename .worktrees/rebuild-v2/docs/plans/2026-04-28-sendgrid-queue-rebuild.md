# SendGrid Queue Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port transactional SendGrid email into the rebuild and replace GCP Cloud Tasks with a local Redis-compatible job queue.

**Architecture:** Keep email delivery in a reusable workspace package so Better Auth and API modules can call the same sender. Add a queue package backed by BullMQ because the rebuild already provisions Valkey/Redis in Docker, with an inline fallback only for tests and local development when Redis is not configured.

**Tech Stack:** Bun workspaces, TypeScript, Better Auth, Elysia, SendGrid, BullMQ, Valkey/Redis, TypeBox env validation.

---

### Task 1: Package Dependencies

**Files:**

- Modify: `package.json`
- Modify: `packages/env/src/index.ts`
- Create: `packages/email/package.json`
- Create: `packages/email/src/index.ts`
- Create: `packages/queue/package.json`
- Create: `packages/queue/src/index.ts`

**Steps:**

1. Add catalog entries for `@sendgrid/mail`, `bullmq`, and `ioredis`.
2. Add `SENDGRID_API_KEY`, default sender variables, template IDs, `REDIS_URL`, and queue mode variables to env validation.
3. Create workspace package shells with scripts for `typecheck` and `test`.
4. Run `/home/zeus/.bun/bin/bun install`.
5. Run targeted package typechecks.

### Task 2: SendGrid Email Service

**Files:**

- Create: `packages/email/src/sendgrid.ts`
- Create: `packages/email/src/templates.ts`
- Create: `packages/email/src/send-template-email.ts`
- Create: `packages/email/src/send-template-email.test.ts`

**Steps:**

1. Write tests for missing API key behavior, template ID resolution, and payload construction.
2. Implement the SendGrid adapter with structured provider responses.
3. Implement template resolution from env vars, keeping dynamic SendGrid template discovery out of this first slice.
4. Export a direct template sender for `patient_welcome` and `staff_welcome`.
5. Run `SKIP_ENV_VALIDATION=true /home/zeus/.bun/bin/bun test packages/email`.

### Task 3: Queue Abstraction

**Files:**

- Create: `packages/queue/src/notification-queue.ts`
- Create: `packages/queue/src/notification-queue.test.ts`
- Modify: `infra/docker/docker-compose.yml`

**Steps:**

1. Write tests for inline fallback and BullMQ option shaping.
2. Implement `enqueueNotificationJob`, `cancelNotificationJob`, and worker registration around BullMQ.
3. Preserve delayed execution via BullMQ `delay`.
4. Use `REDIS_URL` from env and keep Docker’s existing Valkey service.
5. Run `SKIP_ENV_VALIDATION=true /home/zeus/.bun/bin/bun test packages/queue`.

### Task 4: Auth Integration

**Files:**

- Modify: `packages/auth/package.json`
- Modify: `packages/auth/src/auth.ts`
- Create: `packages/auth/src/email-hooks.ts`
- Create: `packages/auth/src/email-hooks.test.ts`

**Steps:**

1. Add a Better Auth database hook for user creation.
2. Send `staff_welcome` for admin/staff roles and `patient_welcome` for normal users when an email is present.
3. Ensure email failures log and do not block account creation unless explicitly configured later.
4. Run `SKIP_ENV_VALIDATION=true /home/zeus/.bun/bin/bun test packages/auth`.

### Task 5: Verification

**Files:**

- Modify as needed for failing type/tests only.

**Steps:**

1. Run `/home/zeus/.bun/bin/bun run typecheck`.
2. Run package tests for auth, email, and queue.
3. Summarize remaining migration gaps, especially full notification orchestration and DoseSpot webhook processing.
