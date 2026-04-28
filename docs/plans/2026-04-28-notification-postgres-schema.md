# Notification Postgres Schema Handoff

Status: implemented in the notification schema checkpoint.

## Source Mapping

The old Firestore repository used:

- `notificationMessages`
- `notificationDeliveries`
- `notificationEvents`
- `user_settings/{uid}.notifications`
- `notifications`
- `users.fcmToken` / `users.fcmTokens`

Those are now mapped into normalized Postgres tables instead of a single JSON table.

## Tables

### `notification_messages`

One logical notification request. It owns topic, entity, dedupe, priority/category, audit flags, actor/source, template data, metadata, and schedule time.

Important access paths:

- `(dedupe_key, created_at)` for recent dedupe lookup.
- `(topic_key, entity_id)` for domain lookup.
- `(status, scheduled_for)` for scheduled work.
- `organization_id` for tenant-scoped admin views.

### `notification_recipients`

One recipient snapshot per message. This keeps recipient profile data out of each delivery row while preserving the exact email, phone, display name, and role used for that message.

Important access paths:

- unique `(message_id, recipient_id)`.
- `recipient_id` for user inbox/history.
- `user_id` when the recipient maps to an auth user.

### `notification_deliveries`

One channel delivery per message recipient. This table tracks queue/worker state, provider identifiers, task names, attempts, provider response codes, timestamps, and delivery metadata.

Important access paths:

- `message_recipient_id` for message joins.
- `provider_message_id` for SendGrid webhook matching.
- `task_name` for scheduled cancellation.
- `(status, scheduled_for)` for worker polling and retry scheduling.

### `notification_events`

One immutable provider event, mostly for SendGrid webhook status events. Provider payload stays JSONB, but indexed scalar fields are extracted into columns for lookups.

Important access paths:

- unique `(provider, provider_event_id)` for idempotency.
- `provider_message_id` for delivery matching.
- `provider_recipient_email` for status lookup by email.
- `occurred_at` for recent event views.

### `user_notification_preferences`

One row per user/category. This replaces nested `user_settings.notifications.*`.

Important access paths:

- unique `(user_id, category)`.
- `user_id` for loading all category preferences.

### `in_app_notifications`

The in-app projection. It references the delivery that produced it and stores read state separately from delivery state.

Important access paths:

- unique `delivery_id`.
- `(recipient_id, created_at)` for inbox listing.
- `(recipient_id, read)` for unread counts.

### `user_push_tokens`

Normalized FCM token storage. This replaces array fields on `users` and lets the worker deactivate one invalid token without rewriting a user row.

Important access paths:

- unique `(provider, token)`.
- `(user_id, is_active)` for push fanout.

## Related Profile Changes

To support recipient lookup without guessing Firestore-style ids:

- `users.phone` was added.
- `patients.user_id` and `providers.user_id` were added as nullable unique links to `users.id`.
- `patients.phone` and `providers.phone` were added.

The seed script now links seeded patient/provider profiles to seeded auth users and deletes notification tables before deleting users.

## Existing Table Tightening

`identity_verifications` now has:

- `patient_id` index.
- `appointment_id` index.
- unique `(provider, job_id)` for provider-level idempotency.

## Verification

Passing commands:

```bash
SKIP_ENV_VALIDATION=true PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bun test packages/db
PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bunx oxlint packages/db --deny-warnings
SKIP_ENV_VALIDATION=true PATH=/home/zeus/.bun/bin:$PATH /home/zeus/.bun/bin/bun run typecheck
```

## Remaining Work

Do not recreate the old Firestore repository. The next migration step should implement a Drizzle repository against these tables, then port the dispatch worker/API routes to that repository.
