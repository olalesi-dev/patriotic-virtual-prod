# EMR Portal (Next.js)

## Local setup for dashboard APIs (Firebase Admin)

The provider dashboard APIs use Firebase Admin on the server:
- `/api/dashboard/provider`
- `/api/dashboard/appointments/[id]`
- `/api/temp/seed-provider-dashboard`

If Firebase Admin credentials are missing, these routes return `500`.

### 1) Get Firebase Admin credentials

1. Open **Firebase Console** for your project.
2. Go to **Project settings** (gear icon).
3. Open **Service accounts** tab.
4. Click **Generate new private key** (Firebase Admin SDK).
5. Download the JSON key file and keep it secret.

### 2) Configure `emr-portal/.env.local`

Use `emr-portal/.env.example` as template.

Choose one method:

- **Method A (recommended):** set `FIREBASE_SERVICE_ACCOUNT_JSON` to the JSON (single-line) or base64 string.
- **Method A2 (platform-friendly):** set `GOOGLE_APPLICATION_CREDENTIALS_JSON` to the same JSON/base64 string.
- **Method B:** set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- **Method C:** set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of the key JSON file.

Example (Method B):

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3) Restart the app

```bash
cd emr-portal
npm run dev:fresh -- --port 3001
```

### 4) Verify

- Login with Google.
- Open `/dashboard`.
- Optional check in terminal:

```bash
curl -i http://localhost:3001/api/dashboard/provider
```

Expected without token: `401 Missing Bearer token`.
Expected with valid logged-in token: `200`.

## Deployment setup (required)

For deployment, do **not** rely on local files like `google-services-account.json`.

Set one of these in your deployment environment variables:
- `FIREBASE_SERVICE_ACCOUNT_JSON` (recommended)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- or split values: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Also set:
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_VERIFY_REVOKED_TOKENS=true`

## Security notes

- Never commit service-account JSON or private keys.
- Do not put admin secrets in `NEXT_PUBLIC_*` variables.
- For production, set `FIREBASE_VERIFY_REVOKED_TOKENS=true`.
