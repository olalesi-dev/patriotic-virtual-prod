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

Note: `google-services-account.json` is **not auto-read** by the app. It is only a source file to copy values from.

Example (Method B):

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`FIREBASE_PRIVATE_KEY` must not have JSON-style formatting such as `FIREBASE_PRIVATE_KEY= "..." ,`.

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
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Local deployment can also be file-free by setting `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `emr-portal/.env.local` and removing `GOOGLE_APPLICATION_CREDENTIALS=../google-services-account.json`.

### Helper: sync `google-services-account.json` into split env values

If you already have `../google-services-account.json`, replace the split vars in `.env.local` safely:

```bash
cd emr-portal
node -e 'const fs=require("fs");const sa=require("../google-services-account.json");const p=".env.local";const keep=fs.existsSync(p)?fs.readFileSync(p,"utf8").split(/\r?\n/).filter(l=>!/^FIREBASE_(PROJECT_ID|CLIENT_EMAIL|PRIVATE_KEY)=/.test(l)):[];keep.push(`FIREBASE_PROJECT_ID=${sa.project_id}`);keep.push(`FIREBASE_CLIENT_EMAIL=${sa.client_email}`);keep.push(`FIREBASE_PRIVATE_KEY="${sa.private_key.replace(/\n/g,"\\n")}"`);fs.writeFileSync(p,keep.join("\n").replace(/\n+$/,"")+"\n");'
```

This keeps `FIREBASE_PRIVATE_KEY` on a single line with escaped `\n`, which is required for correct local parsing.

## Security notes

- Never commit service-account JSON or private keys.
- Do not put admin secrets in `NEXT_PUBLIC_*` variables.
- For production, set `FIREBASE_VERIFY_REVOKED_TOKENS=true`.
