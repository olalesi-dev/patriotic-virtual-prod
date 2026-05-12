# Auth README

This guide summarizes what was implemented in the rebuild-v2 backend and what the frontend must add during the login/signup migration.

## Backend Auth Stack

The backend uses Better Auth with database-backed sessions. Browser sessions are stored in HttpOnly cookies, not in browser storage. Protected API routes use the shared auth macro, which loads the current session, validates revocation state, enforces idle timeout, and attaches user/session claims to the request.

Implemented backend controls:

- Better Auth email/password sign-in and session cookies.
- Argon2id password hashing through `Bun.password.hash`.
- Session rows with role, permissions, allowed modules, token version, and last activity.
- User token versioning through `users.token_version`.
- Global revocation by bumping token version and deleting active sessions.
- Server-side idle timeout using `session.last_activity_at`.
- CSRF Origin/Referer protection for cookie-authenticated mutation requests.
- Staff MFA enforcement feature flag.
- Step-up enforcement feature flag for sensitive admin routes.
- Account lockout after repeated invalid login attempts.
- Firebase bearer-token compatibility during migration.
- Emergency break-glass access workflow.
- Auth/security audit events, audit hash chain, and audit export worker.
- Admin-only account bootstrap, first-password change, mandatory MFA gating, and approval-based admin password reset.

## Login Process

Backend route:

- Better Auth `/sign-in/email`.

Frontend requirements:

- Submit email/password through the Better Auth client or equivalent API integration.
- Send `rememberMe: false` when the user does not check "remember me"; Better Auth then uses a browser-session cookie instead of a persistent max-age cookie.
- Do not store tokens in `localStorage`, `sessionStorage`, query strings, telemetry, or logs.
- Rely on the server-set HttpOnly cookie.
- Show clear errors for:
  - invalid credentials,
  - account locked,
  - disabled account,
  - MFA required,
  - step-up required,
  - session expired.
- On successful login, route users by role/module access.
- If `AUTH_REQUIRE_STAFF_MFA=true`, staff users without verified MFA will be rejected by protected API routes. The UI must guide them into MFA enrollment before normal workspace use.

Lockout behavior:

- `AUTH_LOGIN_LOCKOUT_MAX_ATTEMPTS=5` by default.
- `AUTH_LOGIN_LOCKOUT_SECONDS=900` by default.
- Backend rejects actively locked accounts before password verification.
- UI should show a neutral lockout message and avoid revealing whether an email exists.

## Signup And Account Creation

Backend status:

- Better Auth user creation is available.
- Admin-created staff accounts send welcome notifications through the migrated notification system.
- Role/permission state is stored in database roles and permission tables.

Frontend requirements:

- Patient signup should collect only required account fields first, then move PHI/profile completion into authenticated onboarding.
- Staff creation should be admin-only.
- Signup screens must include password requirements once final password policy is added.
- Do not ask users to share credentials or create shared office/provider accounts.
- After signup, show next-step enrollment screens for email verification, phone verification, profile completion, and MFA when applicable.

Recommended signup states:

- `creating_account`
- `email_verification_required`
- `phone_verification_required`
- `mfa_enrollment_required`
- `profile_completion_required`
- `ready`

## Admin Account Bootstrap And Recovery

Admin signup is disabled. A super-admin must create staff admin accounts.

Backend routes:

- `POST /api/auth/admin/users`
- `GET /api/auth/admin/session/requirements`
- `POST /api/auth/admin/first-password`
- `POST /api/auth/admin/password-reset/requests`
- `GET /api/auth/admin/password-reset/requests`
- `POST /api/auth/admin/password-reset/requests/:id/approve`
- `POST /api/auth/admin/password-reset/requests/:id/reject`

Backend behavior:

- Only super-admins can create `Admin` or `SuperAdmin` users.
- Seeded `SuperAdmin` has every permission; seeded `Admin` has the default admin permission set without role-management permissions.
- Creation generates a temporary password, stores a Better Auth credential hash, emails the temporary password, and sets `must_change_password=true`.
- Admin users with `must_change_password=true` can call onboarding auth routes but cannot access dashboard APIs.
- Admin MFA is mandatory before dashboard access.
- TOTP backup codes are generated as exactly 16 one-time codes.
- Trusted-device MFA persistence lasts 14 days when the user chooses to trust the desktop/browser after MFA.
- Admin forgot-password requests do not send email immediately. The request is stored with IP address and user agent, then a super-admin approves or rejects it.
- Approval generates a new temporary password, emails it, forces password change, and revokes existing sessions.
- Approval/rejection queues are organization-scoped and audited with actor, target user, request ID, IP, user agent, and revocation metadata.

Frontend requirements:

- Admin login screen should route successful first login to password change before dashboard.
- After password change, show mandatory MFA enrollment/challenge before dashboard.
- Add "remember me" or "trust this computer for 14 days" only after successful MFA, and send `trustDevice: true` to Better Auth verification endpoints.
- Treat "remember me" and "trust this computer" as separate controls. "Remember me" belongs to email/password sign-in and controls persistent login cookies. "Trust this computer for 14 days" belongs to MFA verification and controls repeated MFA prompts.
- If the browser session closes and `rememberMe` was false, require login again. If the device was not trusted, require MFA again.
- Add a public admin forgot-password form that creates a reset request and shows neutral "pending review" copy.
- Add a super-admin review queue for pending reset requests with approve/reject actions and step-up reauthentication.
- Never display or log temporary passwords after initial delivery.

## Phone Verification

Backend routes:

- `POST /api/v1/phone-verification/request`
- `POST /api/v1/phone-verification/verify`

Frontend requirements:

- Let users request a phone verification code.
- Let users submit the verification code.
- Show retry/cooldown state from API errors.
- Keep verification codes out of logs and analytics.
- Treat phone verification as contact verification, not as primary MFA for privileged users.

## MFA Enrollment

Backend status:

- Better Auth two-factor support is wired.
- `users.twoFactorEnabled` tracks whether the user has MFA enabled.
- `twoFactor.verified` tracks verified MFA records.
- TOTP setup is available at `POST /api/auth/two-factor/enable`; it returns `totpURI` for QR-code rendering and manual setup fallback.
- TOTP verification is available at `POST /api/auth/two-factor/verify-totp`.
- Email OTP is available at `POST /api/auth/email-otp/send-verification-otp`, `POST /api/auth/sign-in/email-otp`, and the two-factor email OTP endpoints.
- SMS OTP is available through `POST /api/auth/phone-number/send-otp`, `POST /api/auth/phone-number/verify`, and phone-number password sign-in.
- Magic link is available through `POST /api/auth/sign-in/magic-link` and `GET /api/auth/magic-link/verify`.
- Passkey/WebAuthn is available through the official `@better-auth/passkey` plugin, backed by SimpleWebAuthn.
- Backup-code rotation and challenge verification are available through Better Auth two-factor endpoints.
- Trusted device for 14 days is backend-supported by sending `trustDevice: true` during successful TOTP verification. The default is controlled by `AUTH_MFA_TRUST_DEVICE_SECONDS=1209600`.
- `GET /api/auth/mfa/factors` returns the safe factor summary needed by account settings and enrollment screens.
- `AUTH_REQUIRE_STAFF_MFA=true` enforces MFA for `SuperAdmin`, `Admin`, `Provider`, and `Staff`.

Implemented factor support:

- TOTP authenticator app:
  - return `totpURI` for QR-code generation,
  - show manual setup key fallback,
  - verify the first TOTP code before marking the factor active.
- Backup codes:
  - generated during setup,
  - rotatable after enrollment,
  - usable during MFA challenge.
- Trusted device:
  - allow "trust this device for 14 days" after successful MFA,
  - store trust server-side through Better Auth verification records,
  - refresh trusted-device proof on sign-in while valid.
- Email OTP:
  - send one-time code by email,
  - use for login challenge, step-up, and recovery,
  - rate-limit requests and verification attempts.
- SMS OTP:
  - send one-time code by SMS,
  - use only as lower-trust fallback or recovery when policy allows,
  - show phone-number verification and SIM-swap risk warnings for staff/admin roles.
- Magic link:
  - send passwordless sign-in link by email,
  - keep short expiry,
  - bind to browser/device context where possible.
- Passkey/WebAuthn:
  - support platform authenticators and security keys,
  - support cross-device passkey sign-in by QR-code scan from mobile, similar to Google flows when the browser exposes that UX,
  - allow multiple named passkeys per user,
  - list, rename, and delete passkeys.

Frontend requirements:

- Add MFA enrollment screens for staff users.
- Prefer passkeys/WebAuthn or TOTP where available.
- Add factor chooser UI during enrollment and challenge:
  - passkey,
  - authenticator app,
  - email OTP,
  - SMS OTP,
  - magic link.
- Add QR-code UI for TOTP setup.
- Add QR-code UI for cross-device passkey sign-in from a mobile device.
- Add "trust this device for 14 days" checkbox after successful MFA.
- Show backup/recovery code flow if enabled by Better Auth.
- Add an account settings page where users can manage MFA.
- Let users rename, remove, and add factors.
- Let users revoke trusted devices.
- After admin MFA reset, force the user through MFA enrollment again.

Do not enable `AUTH_REQUIRE_STAFF_MFA=true` in production until enrollment UX is complete.

## Step-Up Authentication

Backend status:

- Sensitive admin/security mutation routes are tagged with `requireStepUp: true`.
- Enforcement is controlled by `AUTH_REQUIRE_STEP_UP=true`.
- Freshness is controlled by `AUTH_STEP_UP_MAX_AGE_SECONDS`, default `300`.
- Freshness is checked against server-side `session.step_up_authenticated_at`, not session creation time.
- Password-based confirmation is available at `POST /api/auth/session/step-up/password`.

Routes covered include:

- role changes,
- permission changes,
- admin session revocation,
- account disable/enable,
- MFA reset,
- user deletion,
- break-glass grant creation and activation.
- delegated access creation.

Frontend requirements:

- When API returns step-up required, show a reauthentication modal.
- Reauthenticate with passkey, TOTP, email OTP, SMS OTP, or password plus MFA depending on the user's enrolled factors and risk level.
- Respect trusted-device status only for low-risk step-up. High-risk actions such as PHI export, break-glass activation, role changes, permission downgrades, and MFA reset should still require a fresh factor challenge.
- Retry the original action after a fresh session is established.
- Preserve the original user intent, but never replay destructive actions without visible confirmation.

Do not enable `AUTH_REQUIRE_STEP_UP=true` in production until this UX exists.

## Session Expiry And Session Management

Backend behavior:

- Absolute session lifetime defaults to 8 hours.
- Server-side idle timeout defaults to 15 minutes.
- Idle activity updates are throttled to avoid writing on every request.
- Revoked or expired sessions return unauthorized errors.

Frontend requirements:

- Show a pre-timeout warning before the idle timeout.
- Let users extend the session through a safe authenticated action.
- Autosave non-PHI drafts where possible.
- On timeout, redirect to login and clear sensitive client state.
- Add a session management screen listing active sessions/devices.
- Let users revoke a single session and revoke all other sessions.

Existing backend route:

- `POST /api/profile/me/revoke-sessions`

## Account Disable, MFA Reset, And Permission Downgrade

Backend admin routes:

- `POST /api/admin/users/:id/disable`
- `POST /api/admin/users/:id/enable`
- `POST /api/admin/users/:id/mfa/reset`
- `POST /api/admin/users/:id/revoke-sessions`
- `PUT /api/admin/roles/:id/permissions`

Backend behavior:

- Disablement revokes active sessions.
- Suspected compromise bumps token version.
- MFA reset deletes MFA rows, clears `users.twoFactorEnabled`, and revokes sessions.
- Permission downgrade revokes sessions for users assigned to the role.

Frontend requirements:

- Add admin confirmation dialogs for these actions.
- Require step-up before submission once step-up UI is implemented.
- Show post-action status, including that sessions were revoked.
- For MFA reset, tell admins the user must enroll MFA again on next login.

## Break-Glass Emergency Access

Backend routes:

- `POST /api/admin/emergency-access/grants`
- `GET /api/emergency-access/current`
- `POST /api/emergency-access/activate`
- `POST /api/emergency-access/:id/end`

Backend behavior:

- Admin creates a time-limited grant for a named user.
- User activates the grant with a reason.
- Activation requires verified MFA or a documented compensating control.
- Break-glass activity is audited with `isPhiAccess=true`.
- Activation sends in-app notification to admin/compliance users.
- Routes can require active emergency access with `requireEmergencyAccess: true`.

Frontend requirements:

- Admin UI to create a grant:
  - target user,
  - reason,
  - duration,
  - scope.
- User UI to activate:
  - show grant expiry,
  - require activation reason,
  - require MFA or compensating-control text when MFA is not verified.
- Persistent banner while break-glass mode is active.
- Button to end break-glass access.
- Compliance review screen showing grant, activation reason, activity, expiry, and end state.

## Delegated On-Behalf-Of Access

Backend routes:

- `POST /api/admin/delegated-access/sessions`
- `GET /api/delegated-access/current`
- `POST /api/delegated-access/:id/end`

Backend behavior:

- Admin creates a time-limited delegated access session for a named actor.
- Delegation can target a user, patient, or provider.
- Delegation stores bounded scopes such as `phi:read:delegated` and `dosespot:on-behalf-of`.
- Creation requires admin permission and step-up when `AUTH_REQUIRE_STEP_UP=true`.
- Delegated access activity is audited with `isPhiAccess=true`.
- DoseSpot on-behalf clinician IDs are resolved server-side from an active provider-targeted delegation. The frontend must not pass arbitrary clinician IDs.

Frontend requirements:

- Admin UI to create delegated access:
  - actor user,
  - target user/patient/provider,
  - reason,
  - duration,
  - scopes.
- Current-state banner when delegated access is active.
- Button to end delegated access.
- Compliance review screen showing actor, target, reason, scopes, expiry, and activity.

## Audit Integrity And Export

Backend behavior:

- Explicit audit rows include `previous_hash`, `hash`, and `hash_algorithm`.
- PHI/auth/emergency audit rows are marked `export_status='pending'`.
- Export worker sends pending rows to a configured append-only sink.

Worker command:

```bash
bun run --cwd apps/api audit:export
```

Frontend requirements:

- Admin audit screens should show export status for compliance users.
- Break-glass review UI should link to audit rows.
- Do not expose raw PHI in audit summaries or telemetry.

Production requirements:

- Set `AUDIT_EXPORT_ENABLED=true`.
- Set `AUDIT_EXPORT_ENDPOINT` to the SIEM/object-lock collector.
- Configure the worker in a scheduler.
- Retain audit records for at least six years unless policy requires longer.

## Environment Flags

Important auth flags:

```env
AUTH_SESSION_EXPIRES_IN_SECONDS=28800
AUTH_SESSION_UPDATE_AGE_SECONDS=900
AUTH_SESSION_FRESH_AGE_SECONDS=300
AUTH_SESSION_IDLE_TIMEOUT_SECONDS=900
AUTH_SESSION_IDLE_UPDATE_THROTTLE_SECONDS=60
AUTH_REQUIRE_STAFF_MFA=true
AUTH_TOTP_ISSUER=Patriotic Virtual Telehealth
AUTH_MFA_TRUST_DEVICE_SECONDS=1209600
AUTH_EMAIL_OTP_EXPIRES_SECONDS=300
AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS=3
AUTH_MAGIC_LINK_EXPIRES_SECONDS=300
AUTH_MAGIC_LINK_ALLOWED_ATTEMPTS=1
AUTH_SMS_OTP_EXPIRES_SECONDS=300
AUTH_SMS_OTP_ALLOWED_ATTEMPTS=3
AUTH_PASSKEY_RP_NAME=Patriotic Virtual Telehealth
AUTH_PASSKEY_RP_ID=localhost
AUTH_PASSKEY_ORIGIN=http://localhost:48903
AUTH_REQUIRE_STEP_UP=false
AUTH_STEP_UP_MAX_AGE_SECONDS=300
AUTH_LOGIN_LOCKOUT_MAX_ATTEMPTS=5
AUTH_LOGIN_LOCKOUT_SECONDS=900
AUTH_BREAK_GLASS_DURATION_SECONDS=3600
AUTH_DELEGATED_ACCESS_DURATION_SECONDS=3600
AUDIT_EXPORT_ENABLED=false
AUDIT_EXPORT_ENDPOINT=
AUDIT_EXPORT_BEARER_TOKEN=
AUDIT_EXPORT_TIMEOUT_MS=5000
AUDIT_EXPORT_BATCH_SIZE=100
AUDIT_LOG_RETENTION_DAYS=2190
```

Migration-only Firebase flags:

```env
FIREBASE_PROJECT_ID=
FIREBASE_TOKEN_CERT_URL=
FIREBASE_WEB_API_KEY=
```

## Frontend Build Checklist

Before enabling strict production auth flags:

- Login UI handles locked, disabled, MFA required, step-up required, and expired session states.
- Signup/onboarding separates account creation from PHI profile completion.
- Phone verification UI is migrated to `/api/v1/phone-verification/*`.
- Staff MFA enrollment and recovery screens exist for passkey, TOTP QR setup, email OTP, SMS OTP, magic link, backup/recovery, and trusted-device management.
- Cross-device passkey QR sign-in is supported for users who want to scan from mobile.
- Step-up reauthentication modal exists and retries protected actions safely.
- Session timeout warning and session management screen exist.
- Admin disable/enable/MFA reset/session revoke flows exist.
- Break-glass grant, activation, active banner, end, and compliance review screens exist.
- Audit export status is visible to compliance/admin users.
- Client cache policy prevents PHI in persistent browser storage and clears sensitive state on logout.
- Secure-message UI can create client-side E2EE payloads for `POST /api/messages/encrypted`, with `GET /api/messages/sync` for polling/new-message refresh.
- Uploaded-document UI encrypts files in the browser before object-storage upload, registers metadata with `POST /api/documents/encrypted`, fetches with `GET /api/documents/encrypted`, and marks encrypted uploads complete with `PATCH /api/documents/encrypted/:id/complete`.

## Related Docs

- [auth.md](./auth.md)
- [encryption.md](./encryption.md)
- [audit-export.md](./audit-export.md)
