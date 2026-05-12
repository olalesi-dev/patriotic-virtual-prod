# Audit Integrity And Export

The backend keeps application audit rows in Postgres and marks PHI/auth/emergency-access rows for export to an external append-only destination.

## Integrity Chain

Every explicit audit row written through `createAuditLog` includes:

- `previous_hash`: the latest previous audit row hash at write time.
- `hash`: a SHA-256 hash over the audit row identity, actor, action, resource, details, PHI flag, and `previous_hash`.
- `hash_algorithm`: currently `sha256`.

This creates a tamper-evident chain for application-written audit events. Database trigger-generated rows may still use their trigger hash until those triggers are replaced or removed.

## Export Eligibility

Rows are marked `export_status='pending'` when they are:

- PHI access rows, meaning `is_phi_access=true`.
- Auth security rows, meaning `table_name='Auth Security'`.
- Emergency access rows, meaning `table_name='Emergency Access'`.
- Rows whose `details.event` indicates break-glass, session, password, MFA, permission, or role security activity.

Other audit rows are marked `not_required`.

## Configuration

Use these environment variables:

- `AUDIT_EXPORT_ENABLED`: set to `true` to enable forwarding.
- `AUDIT_EXPORT_ENDPOINT`: HTTPS endpoint for the SIEM, object-lock gateway, or append-only collector.
- `AUDIT_EXPORT_BEARER_TOKEN`: optional bearer token for the endpoint.
- `AUDIT_EXPORT_TIMEOUT_MS`: request timeout, default `5000`.
- `AUDIT_EXPORT_BATCH_SIZE`: max rows per batch, default `100`, capped at `1000`.
- `AUDIT_LOG_RETENTION_DAYS`: operational retention policy marker, default local value `2190` for six years.

Do not point this directly at a general-purpose webhook that can mutate or delete historical events. The destination should be append-only, access-controlled, encrypted in transit and at rest, and monitored by compliance/security.

## Running The Forwarder

Run a batch manually:

```bash
bun run --cwd apps/api audit:export
```

In production, run the same command from a scheduler or worker. A normal result looks like:

```json
{ "processed": 10, "sent": 10, "failed": 0, "skipped": false }
```

If `AUDIT_EXPORT_ENABLED=false` or no endpoint is configured, the worker returns `skipped:true` and sends nothing.

## Operations

Review failed exports regularly:

- Query `audit_logs` where `export_status='failed'`.
- Inspect `last_export_error`.
- Re-run `bun run --cwd apps/api audit:export` after fixing the endpoint or credential.

Retain audit logs and exported copies for at least six years unless legal/compliance policy requires a longer period.

## Admin Audit API

Admins with `admin:audit:read` can list and download audit rows:

```http
GET /api/admin/audit?limit=50&offset=0&sortBy=createdAt&sortOrder=desc
GET /api/admin/audit/export?format=csv
GET /api/admin/audit/export?format=json
```

Supported filters:

- `search`
- `actorId`
- `actorRole`
- `action`
- `resourceType`
- `resourceId`
- `exportStatus`
- `isPhiAccess=true|false`
- `createdFrom`
- `createdTo`

Exports use the same filters and sorting as the list endpoint. CSV is the default format.

## Admin Session API

Admins with `admin:sessions:read` can inspect server-side sessions:

```http
GET /api/admin/sessions?limit=50&offset=0&sortBy=loggedInAt&sortOrder=desc
GET /api/admin/users/{userId}/sessions
```

Session rows include the user, role snapshot, login method, login time, last activity, expiry, IP address, and user agent. New sessions default to `login_method='unknown'` and Better Auth login hooks update the value when the hook exposes the created session id.
