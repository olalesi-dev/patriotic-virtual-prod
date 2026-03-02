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
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (Firebase Console → Project settings → Cloud Messaging → Web Push certificates)
- `FIREBASE_VERIFY_REVOKED_TOKENS=true`

## Automatic Firebase deploys (no local key file dependency)

This repository deploys on `main` via GitHub Actions (`.github/workflows/deploy.yml`) and writes `emr-portal/.env.production.local` in CI from GitHub secrets.

Add these GitHub repository secrets:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional if analytics is unused)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `NEXT_PUBLIC_BASE_URL` (optional)
- `NEXT_PUBLIC_API_URL` (optional)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line JSON from Firebase Admin service account)

Local deployment can also be file-free by setting `FIREBASE_SERVICE_ACCOUNT_JSON` in `emr-portal/.env.local` and removing `GOOGLE_APPLICATION_CREDENTIALS=../google-services-account.json`.

### Helper: convert existing key file to env value

If you already have `../google-services-account.json`, convert it to a one-line JSON value:

```bash
cd emr-portal
printf "FIREBASE_SERVICE_ACCOUNT_JSON='%s'\n" "$(jq -c . ../google-services-account.json)" >> .env.local
```

If `jq` is not installed:

```bash
cd emr-portal
printf "FIREBASE_SERVICE_ACCOUNT_JSON='%s'\n" "$(tr -d '\n' < ../google-services-account.json)" >> .env.local
```

## Security notes

- Never commit service-account JSON or private keys.
- Do not put admin secrets in `NEXT_PUBLIC_*` variables.
- For production, set `FIREBASE_VERIFY_REVOKED_TOKENS=true`.
