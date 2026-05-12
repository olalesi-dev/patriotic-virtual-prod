# Encryption And E2EE Guide

This backend implements the foundation for 256-bit encryption and end-to-end encrypted secure content.

## What Is Implemented

- API transport hardening in `apps/api/src/plugins/transport-security.ts`.
- AES-256-GCM envelope encryption primitives in `packages/crypto/src/field-encryption.ts`.
- Client E2EE payload validation in `packages/crypto/src/e2ee-envelope.ts`.
- PHI key-provider config guardrails in `apps/api/src/modules/security/phi-encryption.ts`.
- Database columns for encrypted secure messages.
- Database table for encrypted uploaded-document metadata.
- API routes for encrypted uploaded-document metadata registration and completion.
- Database table for encryption key registry metadata.

## Transport Security

Production API traffic must be HTTPS. The API rejects insecure production requests when `SECURITY_REQUIRE_HTTPS=true`.

The API also sets:

- `Strict-Transport-Security` in production.
- `Cache-Control: no-store`.
- `Pragma: no-cache`.
- `Expires: 0`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: no-referrer`.

TLS version and cipher enforcement must be configured at the edge, load balancer, or ingress because TLS terminates before the Elysia app in production. Use TLS 1.3 preferred, TLS 1.2 minimum.

## AES-256-GCM Envelope Encryption

Use `@workspace/crypto/field-encryption` for server-side PHI field encryption.

The payload format is:

```json
{
  "v": 1,
  "alg": "AES-256-GCM",
  "kid": "kms-or-vault-key-id",
  "keyWrapAlg": "KMS-or-Vault-wrap-algorithm",
  "encryptedDataKey": "base64",
  "iv": "base64",
  "tag": "base64",
  "ciphertext": "base64",
  "context": {
    "tenantId": "org-id",
    "field": "patients.notes",
    "recordId": "row-id"
  }
}
```

Use authenticated encryption context for tenant, table, field, and record identifiers. The same context must be supplied on decrypt, so ciphertext copied into another row or tenant fails authentication.

## Key Management

Production must use a managed KMS, Vault, or HSM provider. The local envelope provider exists only for development and tests.

Do not store raw production encryption keys in `.env`. `.env` should store only key IDs and provider selection.

Environment variables:

```env
PHI_ENCRYPTION_KEY_PROVIDER=kms
PHI_ENCRYPTION_KMS_KEY_ID=
PHI_ENCRYPTION_REQUIRE_MANAGED_KEY_IN_PRODUCTION=true
```

Local-only development variables:

```env
PHI_ENCRYPTION_KEY_PROVIDER=local
PHI_ENCRYPTION_LOCAL_KEY_ID=local-dev-phi-key-v1
PHI_ENCRYPTION_LOCAL_MASTER_KEY_B64=
```

Generate a local 32-byte key for development with:

```bash
bun -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"
```

## Secure Messages

The canonical encrypted messaging API is:

```http
POST /api/messages/encrypted
```

It supports user-to-user E2EE messaging between `SuperAdmin`, `Admin`, `Provider`, `Staff`, `Radiologist`, and `Patient` accounts in the same organization. The backend stores ciphertext and recipient key envelopes only; it does not receive plaintext message bodies.

Clients can receive messages without WebSockets by polling:

```http
GET /api/messages/sync?after=2026-05-09T12:00:00.000Z
```

This is the same high-level store-and-forward pattern used by mature messaging systems: the sender encrypts locally, the backend stores/routes ciphertext, push notifications wake offline clients, and clients fetch new ciphertext by cursor when they reconnect or poll. WebSockets are only a low-latency transport optimization; they are not required for E2EE.

The older clinical route remains available during migration:

```http
POST /api/clinical/messages/encrypted
```

Request shape:

```json
{
  "recipientId": "user-id",
  "threadId": "optional-thread-id",
  "encryptedPayload": {
    "v": 1,
    "mode": "client_e2ee",
    "alg": "AES-256-GCM",
    "iv": "base64-12-byte-iv",
    "tag": "base64-16-byte-auth-tag",
    "ciphertext": "base64-ciphertext",
    "recipients": [
      {
        "userId": "recipient-user-id",
        "keyId": "recipient-device-key-id",
        "wrapAlg": "ECDH-ES+A256KW",
        "wrappedContentKey": "base64"
      }
    ],
    "aad": {
      "purpose": "secure-message"
    }
  }
}
```

The backend rejects plaintext fields such as `body`, `subject`, `text`, `title`, `message`, or `content` inside the encrypted payload wrapper.

Seeded messaging permissions:

- `communications:read`
- `communications:write`

These are granted to `SuperAdmin`, `Admin`, `Provider`, `Staff`, `Radiologist`, and `Patient` roles.

Important frontend requirements:

- Generate device keys in the client.
- Store private keys only on the user device or an approved secure client vault.
- Publish public keys to a backend key directory.
- Encrypt the content key once per recipient device.
- Include each recipient key envelope in `encryptedPayload.recipients`.
- Send only generic push/SMS/email notifications such as "You have a new secure message."
- Never include plaintext PHI in notification bodies, logs, analytics, or error reporting.

## Uploaded Documents

Uploaded documents must be encrypted in the browser before object storage upload. The backend stores encrypted object metadata in `encrypted_document_uploads`.

The backend must never receive document plaintext for E2EE uploads. The client registers encrypted upload metadata with:

```http
POST /api/documents/encrypted
```

Request shape:

```json
{
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "checksumSha256": "64-character-sha256-hex",
  "encryptedPayload": {
    "v": 1,
    "mode": "client_e2ee",
    "alg": "AES-256-GCM",
    "iv": "base64-12-byte-iv",
    "tag": "base64-16-byte-auth-tag",
    "ciphertext": "base64-encrypted-manifest",
    "recipients": [
      {
        "userId": "owner-user-id",
        "keyId": "owner-device-key-id",
        "wrapAlg": "ECDH-ES+A256KW",
        "wrappedContentKey": "base64"
      }
    ],
    "aad": {
      "purpose": "encrypted-document"
    }
  },
  "encryptedMetadata": {
    "v": 1,
    "mode": "client_e2ee",
    "alg": "AES-256-GCM",
    "iv": "base64-12-byte-iv",
    "tag": "base64-16-byte-auth-tag",
    "ciphertext": "base64-encrypted-filename-and-labels",
    "recipients": [
      {
        "userId": "owner-user-id",
        "keyId": "owner-device-key-id",
        "wrapAlg": "ECDH-ES+A256KW",
        "wrappedContentKey": "base64"
      }
    ]
  }
}
```

The API generates the storage provider/object key and returns the pending upload row. After the encrypted bytes are uploaded to object storage, mark the row available with:

```http
PATCH /api/documents/encrypted/{id}/complete
```

Clients can fetch accessible encrypted upload metadata with:

```http
GET /api/documents/encrypted
GET /api/documents/encrypted/{id}
```

Seeded document permissions:

- `documents:read`
- `documents:write`

These are granted to `SuperAdmin`, `Admin`, `Provider`, `Staff`, `Radiologist`, and `Patient` roles.

## Passwords

Passwords are not encrypted. They are one-way hashed with Argon2id through Better Auth and Bun password hashing.

## Remaining Infrastructure Work

- Add the production KMS/Vault provider implementation.
- Configure TLS 1.3 or TLS 1.2 minimum at the edge/load balancer.
- Enable managed encryption for PostgreSQL disks, backups, Redis, object storage, queue storage, and audit export storage.
- Plug the encrypted document flow into the chosen production object-storage signing provider.
- Add frontend E2EE key generation, device public-key registry, mobile QR/device enrollment, encryption before send/upload, and recovery flows.
