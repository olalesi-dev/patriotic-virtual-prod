# Authentication And Session Security

This backend uses Better Auth as the primary authentication system. Protected API routes call the shared auth macro, which resolves a server-side session and attaches the authenticated user plus role and permission claims to the request context.

## Completed Backend Work

The rebuild-v2 backend now has the following auth/session controls implemented:

- Better Auth database sessions with opaque HttpOnly cookies.
- Bounded session lifetime and server-side idle timeout.
- Session authorization snapshots for role, permissions, allowed modules, and token version.
- User token versioning for global session invalidation.
- Session revocation hooks for password reset/change, account disablement, role changes, permission downgrades, MFA reset, user deletion, and manual session revocation.
- Firebase bearer-token compatibility during migration, with local token-version revocation checks.
- Cookie-authenticated mutation CSRF Origin/Referer guard.
- Staff MFA enforcement behind `AUTH_REQUIRE_STAFF_MFA`.
- Step-up enforcement on migrated admin/security mutations behind `AUTH_REQUIRE_STEP_UP`.
- Per-account login lockout after repeated invalid email/password attempts.
- Admin routes for MFA reset, account disable/enable, session revocation, and permission downgrade session invalidation.
- Break-glass emergency access grants, activation, end, route guard, audit events, and admin/compliance notification.
- Explicit auth/security audit events without raw PHI.
- SHA-256 audit integrity chain for application-written audit rows.
- Pending export marking and batch forwarding for PHI/auth/emergency audit rows.
- Admin-only account bootstrap, first-password change, mandatory MFA gating, 14-day trusted-device policy, and super-admin approved password reset requests.

The frontend migration still needs the UI flows listed in [auth-README.md](./auth-README.md) before the strict MFA and step-up feature flags should be enabled in production.

## Primary Session Model

The primary session is database-backed, not a purely stateless JWT.

The `session` table stores:

- `token`: opaque session token.
- `expiresAt`: session expiry.
- `ipAddress` and `userAgent`: request context captured by Better Auth.
- `userId`: owning user.
- `role`, `permissions`, and `allowedModules`: authorization snapshot.
- `token_version`: the user token version copied at session creation time.

Because sessions are stored server-side, the backend can revoke them by deleting rows from `session`.

Better Auth session lifetime is configured explicitly:

- `AUTH_SESSION_EXPIRES_IN_SECONDS`: default `28800` seconds, or 8 hours.
- `AUTH_SESSION_UPDATE_AGE_SECONDS`: default `900` seconds, or 15 minutes.
- `AUTH_SESSION_FRESH_AGE_SECONDS`: default `300` seconds, or 5 minutes for Better Auth operations that require a fresh session.
- `AUTH_SESSION_IDLE_TIMEOUT_SECONDS`: default `900` seconds, or 15 minutes.
- `AUTH_SESSION_IDLE_UPDATE_THROTTLE_SECONDS`: default `60` seconds.

The API also stores `session.last_activity_at`. Protected API requests reject and delete a session when the server-side idle age is greater than `AUTH_SESSION_IDLE_TIMEOUT_SECONDS`. Activity updates are throttled by `AUTH_SESSION_IDLE_UPDATE_THROTTLE_SECONDS` so normal API usage does not write to the database on every request.

Better Auth email/password sign-in accepts `rememberMe`. When the frontend sends `rememberMe: false`, Better Auth creates a non-persistent browser-session cookie that should disappear when the browser session ends. When `rememberMe` is omitted or `true`, the cookie uses the configured session max age. In both cases, the backend session row, token-version checks, absolute expiry, idle timeout, and revocation checks remain authoritative.

## Token Versioning

The `users` table stores:

- `token_version`: monotonically increasing integer.
- `token_version_updated_at`: timestamp of the latest local token invalidation.

When a session is created, the user's current `token_version` is copied into the session row. On every protected Better Auth request, the API compares:

```text
session.token_version === users.token_version
```

If the values differ, the request is rejected with `401 Unauthorized`.

This means a copied old session token stops working after the user's token version is bumped, even if the session row still exists.

## Revocation Events

Use the shared auth security helpers in `@workspace/auth/session-security` for high-risk account changes.

Call `revokeUserAuth(db, userId, reason)` for:

- Password change.
- Password reset.
- MFA reset.
- Role change.
- Permission downgrade.
- Account disable.
- Suspected compromise.
- Manual admin action.
- User-triggered "log out all devices".

`revokeUserAuth` does two things:

1. Increments `users.token_version` and updates `users.token_version_updated_at`.
2. Deletes that user's active session rows.

Use `revokeUserSessions(db, userId)` only when you want to delete sessions without bumping the token version.

## Implemented Revocation Hooks

The API currently revokes sessions in these migrated paths:

- Better Auth password reset: `revokeSessionsOnPasswordReset` is enabled and `onPasswordReset` bumps local token version.
- Better Auth password change and set-password hooks: bump local token version and revoke other sessions after successful password mutation.
- `POST /api/profile/me/revoke-sessions`: current user logs out all devices.
- `POST /api/admin/users/:id/revoke-sessions`: admin manually revokes a user's sessions.
- `PATCH /api/admin/users/:id`: revokes when `roleId` changes.
- `POST /api/admin/users/:id/disable`: disables the account and revokes sessions.
- `POST /api/admin/users/:id/enable`: re-enables the account.
- `POST /api/admin/users/:id/mfa/reset`: deletes the user's Better Auth MFA secret/backup codes and revokes sessions.
- `PUT /api/admin/roles/:id/permissions`: replaces role permissions and revokes sessions for users assigned to the role when permissions are removed.
- `DELETE /api/admin/users/:id`: deletes sessions before deleting the user.
- `POST /api/auth/admin/users`: creates an admin or super-admin account with a temporary password and `must_change_password=true`.
- `POST /api/auth/admin/first-password`: verifies the temporary password, stores a new Argon2id password, clears `must_change_password`, and revokes other sessions.
- `POST /api/auth/admin/password-reset/requests/:id/approve`: generates a new temporary password, forces password change, revokes sessions, and emails the password only after super-admin approval.

As more auth-sensitive routes are migrated, call `revokeUserAuth` after any new account security mutation.

## Admin Authentication Workflow

Admin users cannot self-sign up. Super-admins create `Admin` or `SuperAdmin` accounts through `POST /api/auth/admin/users`. The backend creates the database user, creates a Better Auth credential account, generates a temporary password, sends that password by PHI-free transactional email, records the creator in `users.admin_created_by_id`, and sets `users.must_change_password=true`.

Seeded role hierarchy is explicit: `SuperAdmin` receives every seeded permission, while `Admin` receives the default admin permission set except role-management permissions. This keeps super-admin above admin for account creation, password-reset approvals, and role/permission administration.

The first successful login must call `GET /api/auth/admin/session/requirements` before dashboard access. This route returns:

- whether the password must be changed,
- whether MFA is required and verified,
- TOTP setup/verification endpoint hints,
- backup-code policy with exactly 16 one-time codes,
- trusted-device policy with `AUTH_MFA_TRUST_DEVICE_SECONDS`, default `1209600` seconds, or 14 days.

Admins with `must_change_password=true` may call only onboarding auth routes such as `POST /api/auth/admin/first-password` and MFA enrollment/status routes. Normal protected dashboard routes reject them until the password is changed and MFA is verified.

For the admin login screen, the frontend should send Better Auth `rememberMe: false` when the user does not choose "remember me" so browser close behaves as a session-only login. The separate "trust this computer for 14 days" control belongs to the MFA verification step and sends `trustDevice: true` only after the MFA challenge succeeds.

Forgot-password for admin users is approval-based:

- `POST /api/auth/admin/password-reset/requests` accepts the public request and stores IP address plus user agent when the email belongs to an active admin or super-admin. The response is always neutral to avoid account enumeration.
- `GET /api/auth/admin/password-reset/requests` lists the super-admin's organization-scoped review queue.
- `POST /api/auth/admin/password-reset/requests/:id/approve` generates and emails a new temporary password, sets `must_change_password=true`, revokes sessions, and records approver metadata.
- `POST /api/auth/admin/password-reset/requests/:id/reject` records rejection metadata without emailing a password.

All super-admin decisions are organization-scoped and audited with IP address, user agent, actor, target user, reset request ID, and token-version revocation details where applicable.

## Auth Security Audit Events

The migrated admin/profile security routes write explicit audit events for:

- User-triggered log-out-all.
- Admin-triggered session revocation.
- Role changes.
- Permission downgrades.
- Account disablement or suspected compromise disablement.
- Account enablement.
- MFA reset.
- User deletion session cleanup.

Audit details are intentionally PHI-free. They include the security event, target user ID, request path, method, IP address, user agent, revocation reason, and resulting token version when applicable. Audit persistence is best effort for these security mutation routes: if the main security action succeeds but audit persistence fails, the route logs a warning and does not roll back the already-completed security action.

## MFA And Step-Up Enforcement

Better Auth two-factor support is backed by:

- `users.twoFactorEnabled`
- `twoFactor.verified`

TOTP enrollment and challenge routes are available through Better Auth:

- `POST /api/auth/two-factor/enable`: requires the current password, creates an unverified TOTP secret, returns `totpURI`, and returns one-time backup codes. The frontend renders `totpURI` as a QR code and also provides a manual setup fallback.
- `POST /api/auth/two-factor/verify-totp`: verifies the first TOTP code, marks the factor verified, and enables `users.twoFactorEnabled`.
- `POST /api/auth/two-factor/get-totp-uri`: returns the current TOTP URI after password confirmation.
- `POST /api/auth/two-factor/generate-backup-codes`: rotates backup codes.
- `POST /api/auth/two-factor/verify-backup-code`: verifies a backup code during MFA challenge.
- `POST /api/auth/two-factor/disable`: disables TOTP after password confirmation.
- `GET /api/auth/mfa/factors`: returns UI-safe factor status and endpoint metadata. It intentionally never returns TOTP secrets or backup-code values.

TOTP uses `AUTH_TOTP_ISSUER`, default `Patriotic Virtual Telehealth`, 6 digits, and a 30-second period. Backup codes are encrypted at rest by Better Auth and generated as exactly 16 one-time codes. Trusted-device persistence is supported by Better Auth after successful TOTP verification by sending `trustDevice: true`; the max age is `AUTH_MFA_TRUST_DEVICE_SECONDS`, default `1209600` seconds, or 14 days.

Additional Better Auth sign-in and OTP factors are now wired:

- `POST /api/auth/email-otp/send-verification-otp`: sends a SendGrid email OTP for `sign-in`, `email-verification`, `forget-password`, or `change-email`.
- `POST /api/auth/sign-in/email-otp`: verifies the sign-in email OTP. Unknown-user signup is disabled.
- `POST /api/auth/two-factor/send-otp` and `POST /api/auth/two-factor/verify-otp`: sends and verifies email OTP during two-factor challenge.
- `POST /api/auth/sign-in/magic-link` and `GET /api/auth/magic-link/verify`: sends and verifies hashed, single-use magic links. Unknown-user signup is disabled.
- `POST /api/auth/phone-number/send-otp` and `POST /api/auth/phone-number/verify`: sends Telnyx SMS OTP for phone verification and recovery flows.
- `POST /api/auth/sign-in/phone-number`: supports phone-number plus password sign-in with verified-phone enforcement.
- `GET /api/auth/passkey/generate-register-options` and `POST /api/auth/passkey/verify-registration`: register a passkey for a signed-in user.
- `GET /api/auth/passkey/generate-authenticate-options` and `POST /api/auth/passkey/verify-authentication`: authenticate with a registered passkey.
- `GET /api/auth/passkey/list-user-passkeys`, `POST /api/auth/passkey/delete-passkey`, and `POST /api/auth/passkey/update-passkey`: manage a user's passkeys.

Email OTPs and magic links use SendGrid plain transactional email through the shared email package. SMS OTP uses the shared Telnyx channel. These auth messages are intentionally PHI-free.

Passkey/WebAuthn uses the official `@better-auth/passkey` package, backed by SimpleWebAuthn. Registration requires a fresh signed-in session. The frontend should use `authClient.passkey.addPasskey()` and `authClient.signIn.passkey()`, including cross-device QR flows for platform-to-mobile passkey use where the browser supports it.

The API can enforce staff MFA with:

- `AUTH_REQUIRE_STAFF_MFA=true`

When enabled, every protected Better Auth request for `SuperAdmin`, `Admin`, `Provider`, or `Staff` requires `users.twoFactorEnabled=true` and a verified `twoFactor` row. `Patient` sessions are not covered by this staff MFA gate.

Step-up checks are wired on migrated admin security mutations with `requireStepUp: true`, including role changes, permission changes, account disable/enable, admin session revocation, MFA reset, user deletion, break-glass, and delegated access creation. Enforcement is controlled by:

- `AUTH_REQUIRE_STEP_UP=true`
- `AUTH_STEP_UP_MAX_AGE_SECONDS=300`

When step-up is enabled, those routes require an explicit server-side `session.step_up_authenticated_at` marker newer than the configured max age. The backend can mark this timestamp through `POST /api/auth/session/step-up/password` after verifying the current password against the Better Auth account hash. Keep this flag disabled until the frontend has a reauthentication or MFA/passkey step-up UX that can call this route after a successful challenge.

Admin MFA reset also clears `users.twoFactorEnabled` and deletes the user's `twoFactor` rows before revoking sessions.

## Firebase Migration Compatibility

During the frontend migration, the API also supports Firebase bearer tokens as a temporary compatibility path.

Firebase tokens are accepted only when:

- `FIREBASE_PROJECT_ID` is configured.
- The token has a valid JWT shape.
- The token issuer and audience match the configured Firebase project.
- The token is not expired.
- The token signature verifies against Google's Firebase secure-token certificates.
- `FIREBASE_WEB_API_KEY` is configured and Firebase `accounts:lookup` confirms the account is active and the token was not revoked.
- The Firebase user resolves to an existing migrated database user by `id` or `email`.
- The token `auth_time` or `iat` is newer than `users.token_version_updated_at`.

This gives us local revocation for copied Firebase ID tokens during migration. If a user is marked compromised locally, bumping their token version causes older Firebase tokens to fail even if Firebase would otherwise accept them until expiry.

## Cookie Protection

Better Auth is configured with:

- Explicit `baseURL`.
- Explicit `trustedOrigins`.
- `httpOnly` session cookies.
- `SameSite=Lax`.
- `secure` cookies in production.

Frontend code must not copy session tokens into `localStorage`, `sessionStorage`, query strings, logs, analytics events, or error reports.

## CSRF Protection

Custom API routes use an Origin/Referer CSRF guard for cookie-authenticated mutation requests.

The guard applies when all of these are true:

- The method is `POST`, `PUT`, `PATCH`, or `DELETE`.
- The request carries a Better Auth session cookie.
- The request is not authenticated with a bearer token.

The guard accepts the request only when `Origin` or `Referer` resolves to a trusted origin derived from `APP_URL` and `CORS_ORIGIN`. Webhook-style server-to-server requests without Better Auth cookies are not blocked by this guard.

## Healthcare Security Baseline

This section translates the current authentication implementation into controls that support HIPAA Security Rule technical safeguards. It is an engineering baseline, not a legal compliance certification.

HHS describes the Security Rule as requiring administrative, physical, and technical safeguards for ePHI, including access control, audit controls, integrity, authentication, and transmission security. HHS also states that unique user identification is required for systems containing ePHI, so shared staff logins are not allowed.

### Unique User Identification

Every workforce user must have an individual `users.id` and an individual login. Shared provider, office, support, or admin accounts must not be created.

Session and audit records must keep enough context to attribute activity to one user:

- `session.userId`
- `session.id`
- `session.ipAddress`
- `session.userAgent`
- `audit_logs.actorId`
- `audit_logs.actorName`
- `audit_logs.actorRole`
- `audit_logs.organizationId`

### Least Privilege

Access should remain permission-based, not role-name-only. Roles are administrative groupings; permissions are the enforcement surface.

When adding or changing roles, document the capability map in the relevant seed or admin UI workflow. Use discrete permissions for clinical and administrative actions, for example:

- `patients:read`
- `patients:update`
- `appointments:write`
- `prescriptions:write`
- `admin:users:write`
- `admin:roles:write`
- `phi:export`

Any permission downgrade must call `revokeUserAuth(..., 'permission_downgrade')` for affected users so older sessions cannot continue with broader authorization snapshots.

### MFA

MFA should be required for staff and privileged users before PHI-heavy production rollout. Prefer phishing-resistant or app-based factors, such as WebAuthn/FIDO2 passkeys or TOTP. SMS should be treated as a transitional or recovery-only factor because phone numbers can be taken over.

Target MFA and sign-in factor support:

- TOTP authenticator app enrollment with QR-code generation and manual setup key fallback.
- Passkeys/WebAuthn for platform authenticators and security keys.
- Cross-device passkey sign-in with QR-code scanning from a mobile device, similar to Google passkey flows.
- Email OTP for login verification, step-up, and account recovery.
- SMS OTP for login verification or recovery only when risk policy allows it.
- Magic link sign-in by email for passwordless login or recovery.
- Trusted device for 14 days after successful MFA, stored server-side and revocable by the user/admin.

Recommended production factor priority:

1. Passkey/WebAuthn.
2. TOTP authenticator app.
3. Email OTP or magic link.
4. SMS OTP only as a lower-trust fallback or recovery factor.

Step-up MFA is required before sensitive operations:

- PHI export or bulk download.
- Role or permission changes.
- Staff account creation, disablement, or recovery.
- MFA reset.
- Break-glass emergency access.
- Security setting changes.

The current codebase has Better Auth TOTP setup, email OTP, SMS OTP, magic link, passkey/WebAuthn, backup codes, trusted-device persistence, a UI-safe factor status API, feature-flagged staff MFA enforcement, feature-flagged step-up enforcement on migrated admin security mutations, and an admin MFA reset route. The frontend still needs enrollment, challenge, recovery, passkey management, and trusted-device management screens before strict MFA flags are enabled in production.

### Password And Account Controls

Password hashing uses Argon2id through `Bun.password.hash`.

Email/password sign-in has backend account lockout controls:

- `users.failed_login_attempts` records failed credential attempts.
- `users.last_failed_login_at` records the last failed credential attempt time.
- `users.locked_until` blocks password verification while the lock is active.
- `AUTH_LOGIN_LOCKOUT_MAX_ATTEMPTS` controls the failed attempt threshold. The local default is `5`.
- `AUTH_LOGIN_LOCKOUT_SECONDS` controls the fixed lock duration. The local default is `900` seconds.

The Better Auth `/sign-in/email` hook rejects locked accounts before password verification, increments counters after invalid credential responses, and resets counters after successful sign-in. Unknown email attempts are not persisted as user lockout rows.

Before production, add or verify:

- Minimum password length and breach/common-password checks.
- Login route IP/user-agent rate limits in addition to the per-account lockout.
- Password reset throttling.
- User education and policy text prohibiting credential sharing.
- Forced reset after suspected compromise.

Do not add arbitrary password rotation unless the compliance policy requires it. Rotation can push users toward weaker patterns unless paired with password-manager guidance and compromise detection.

### Automatic Logoff

The configured Better Auth session lifetime limits the maximum refreshed session window. The API also enforces server-side inactivity timeout through `session.last_activity_at`.

Recommended backend policy:

- Shared kiosk or shared workstation: 3 to 5 minute idle timeout.
- Staff clinical workstation: 10 to 15 minute idle timeout.
- Patient portal: a longer patient-friendly idle timeout if risk analysis approves it.
- Absolute session lifetime: 8 to 12 hours for staff, aligned with shift length.

Client timers may show warnings and autosave drafts, but they must not be the only enforcement mechanism.

### Session Termination

Logout, account disablement, password change, MFA reset, role change, permission downgrade, suspected compromise, and user deletion must invalidate backend session state.

Current implementation supports this through `revokeUserAuth` and `revokeUserSessions`. Any future SSO integration must also implement provider-side or back-channel logout where supported so a local logout does not leave an upstream session active.

### Audit Logging And Monitoring

Audit controls must cover more than database row changes. Log these events without storing raw PHI in log messages:

- Successful and failed login.
- Session creation, refresh, timeout, logout, and revocation.
- Token-version bumps and the revocation reason.
- MFA enrollment, challenge, failure, and reset.
- Role, permission, account status, and staff lifecycle changes.
- PHI view, create, update, delete, print, export, and bulk download.
- Break-glass access start, reason, activity, and end.

Logs should be append-only or tamper-evident, replicated outside the application database or forwarded to a SIEM, encrypted in transit and at rest, and accessible only to least-privilege compliance/security roles.

The migrated backend computes a SHA-256 integrity chain for explicit application audit rows and marks PHI/auth/emergency-access/delegated-access events for export. Run the forwarder with `bun run --cwd apps/api audit:export` when `AUDIT_EXPORT_ENABLED=true` and `AUDIT_EXPORT_ENDPOINT` points at an append-only SIEM or object-lock collector. See [audit-export.md](./audit-export.md) for the runbook and environment variables.

HIPAA documentation retention is generally six years for required policies and procedures. Treat audit retention as a compliance and legal policy decision; do not shorten production auth/PHI audit retention without compliance approval.

### Encryption And Transmission Security

Production must enforce TLS for all browser and API traffic. Secure cookies are already enabled when `NODE_ENV=production`; TLS termination and proxy headers must be validated in deployment.

The API now includes transport-security middleware that rejects insecure production API requests when `SECURITY_REQUIRE_HTTPS=true`, emits HSTS in production, and applies no-store response headers for API data.

At-rest encryption has two layers. Infrastructure must encrypt production PostgreSQL volumes, backups, object storage, log storage, queue storage, and vendor systems that may handle ePHI. Application code now also has AES-256-GCM envelope encryption primitives for PHI fields, plus client E2EE payload validation for secure messages and uploaded documents.

Production PHI encryption must use a managed KMS, Vault, or HSM. The local envelope provider is for development and tests only and is blocked by default when `NODE_ENV=production`.

Secure messages can be sent with canonical `POST /api/messages/encrypted`; the legacy `POST /api/clinical/messages/encrypted` route remains during migration. `SuperAdmin`, `Admin`, `Provider`, `Staff`, `Radiologist`, and `Patient` roles receive `communications:read` and `communications:write` so any same-organization user can participate in E2EE secure messaging. `GET /api/messages/sync` provides cursor-based polling so clients do not need a WebSocket for delivery. The backend stores only ciphertext and recipient key envelopes.

Encrypted uploaded documents use `POST /api/documents/encrypted`, `GET /api/documents/encrypted`, `GET /api/documents/encrypted/:id`, and `PATCH /api/documents/encrypted/:id/complete`. The same roles receive `documents:read` and `documents:write`. The backend stores only encrypted upload metadata, encrypted key-recipient envelopes, generated object keys, and non-sensitive size/checksum metadata; document plaintext must be encrypted in the browser before object storage upload. See [encryption.md](./encryption.md) for payload formats and environment variables.

Use HSTS only after the production domain, subdomains, TLS renewal, and rollback plan are verified. Enabling HSTS too early can lock users out during certificate or domain mistakes.

### Remote Access And Device Posture

For staff access to ePHI from outside trusted networks, require an approved remote-access pattern such as VPN, secure access proxy, mutual TLS, device posture checks, or managed-device policy. High-risk admin and PHI export functions should be restricted by stronger device/network signals where feasible.

### Emergency Access

HIPAA requires emergency access procedures. Add a break-glass workflow instead of using shared emergency accounts.

Minimum break-glass behavior:

- Require a named user session.
- Require MFA or documented compensating control.
- Require a reason before access is granted.
- Grant time-limited elevated permissions.
- Log every action with `isPhiAccess=true`.
- Notify compliance/security staff immediately.
- Require post-event review.

The migrated backend has an initial break-glass implementation:

- `POST /api/admin/emergency-access/grants` creates a time-limited grant for a named user in the admin's organization.
- `POST /api/emergency-access/activate` activates the grant with a reason and requires verified MFA or a written compensating control.
- `POST /api/emergency-access/:id/end` ends the active grant.
- `GET /api/emergency-access/current` returns the user's current unexpired grant.
- `requireEmergencyAccess: true` is available as an Elysia route guard for routes that should only run under active emergency access.
- Break-glass grant, activation, end, and guarded route access events are written with `isPhiAccess=true`.
- Activation attempts enqueue an in-app `SECURITY_BREAK_GLASS_ACTIVATED` notification to admin/compliance roles in the organization.

The current default grant duration is `AUTH_BREAK_GLASS_DURATION_SECONDS=3600`, bounded by backend helpers to 5 minutes minimum and 4 hours maximum.

### Delegated On-Behalf-Of Access

Delegated access is separate from break-glass. It covers controlled support, coverage, and clinical delegation where one named user acts on behalf of another user, patient, or provider without inheriting that target's full role.

The migrated backend has a first-class delegated access implementation:

- `POST /api/admin/delegated-access/sessions` creates a time-limited delegated access session for a named actor in the admin's organization.
- `GET /api/delegated-access/current` returns the actor's current unexpired delegated access session.
- `POST /api/delegated-access/:id/end` ends the actor's delegated access session.
- `requireDelegatedAccess: ['scope']` is available as an Elysia route guard for routes that should only run under active delegation.
- Delegated access creation, end, guarded route use, and DoseSpot on-behalf resolution are audited with `isPhiAccess=true`.

The effective authorization model is deliberately narrow:

- The actor remains the authenticated user and keeps their own session, MFA, role, and permission snapshot.
- Delegated access adds only time-limited scopes such as `phi:read:delegated` or `dosespot:on-behalf-of`.
- Routes must check actor permissions and delegation scopes together.
- DoseSpot on-behalf clinician IDs are resolved server-side from an active delegated access session targeting a provider. Frontend requests must not provide arbitrary clinician IDs.

The current default delegated access duration is `AUTH_DELEGATED_ACCESS_DURATION_SECONDS=3600`, bounded by backend helpers to 5 minutes minimum and 8 hours maximum.

### Vendor And BAA Inventory

Better Auth is a library in this implementation, not automatically a business associate. Hosted vendors and services that create, receive, maintain, or transmit PHI may need a signed BAA and documented security review.

Maintain a vendor inventory for at least:

- Firebase during migration.
- SendGrid or any email provider.
- Telnyx or any SMS/voice provider.
- DoseSpot.
- Cloud/database/hosting/logging/monitoring providers.
- Doxy or waiting room/telehealth vendors.

Do not send PHI through a vendor channel unless the PHI use is approved, covered by contract, and documented.

### Risk Analysis And Testing

The authentication and PHI access model must be included in the security risk analysis. Track:

- ePHI data flow and asset inventory.
- Auth/session trust boundaries.
- Frontend token and cache handling.
- Vendor data flows.
- Admin and emergency access.
- Backup and recovery paths.

The current HHS NPRM is proposed, not final, but it signals expected direction: MFA, written policies, asset inventory/network mapping, vulnerability scanning at least every six months, penetration testing at least every 12 months, network segmentation, encryption at rest and in transit, and annual testing of security measures.

## Implementation Roadmap

Before PHI-heavy production rollout, add or verify:

- Step-up MFA for PHI export, admin security actions, account recovery, and role/permission changes.
- Frontend MFA enrollment and step-up UX before enabling `AUTH_REQUIRE_STAFF_MFA` or `AUTH_REQUIRE_STEP_UP` in production.
- Frontend/admin UX for delegated access creation, current-state banner, end action, and compliance review.
- Audit log entries for Better Auth internal password reset/change hooks, session creation, session timeout, and failed login events.
- Device/session management UI showing active sessions and allowing per-session revocation.
- Role/context-specific idle timeout policy beyond the current global backend idle timeout.
- Rate limits on login, password reset, MFA reset, admin security mutation, and token exchange paths.
- Progressive lockout policy if compliance/product wants longer repeated lock windows than the current fixed short lockout.
- Frontend/admin UX for grant creation, activation, and compliance review of break-glass events.
- Production SIEM/object-lock destination provisioning and scheduler deployment for `bun run --cwd apps/api audit:export`.
- Vendor/BAA inventory and PHI-approved communication channel matrix.
- SSO back-channel logout if SSO is added.
- Client ePHI cache policy: no PHI in persistent browser storage, clear service worker/cache state on logout, and no PHI in telemetry.

## References

- HHS, [Summary of the HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- HHS, [Unique user ID FAQ](https://www.hhs.gov/hipaa/for-professionals/faq/2018/does-the-security-rule-permit-a-covered-entity-to-assign-the-same-log-on-id-to-multiple-employees/index.html)
- HHS, [Security Rule technical safeguards guidance](https://www.hhs.gov/sites/default/files/ocr/privacy/hipaa/administrative/securityrule/techsafeguards.pdf)
- HHS, [HIPAA Security Rule NPRM fact sheet](https://www.hhs.gov/hipaa/for-professionals/security/hipaa-security-rule-nprm/factsheet/index.html)
- Better Auth, [Session management](https://www.better-auth.com/docs/concepts/session-management)
