# Repository Guidelines

## Project Structure & Module Organization
- `emr-portal/`: Next.js 14 frontend (App Router, TypeScript, Tailwind). Main app code lives in `emr-portal/src/app`, shared UI in `emr-portal/src/components`, utilities in `emr-portal/src/lib`.
- `emr-backend/`: TypeScript Express API. Entry point is `emr-backend/src/index.ts`; routes/middleware/services are under `emr-backend/src`.
- `backend/`: legacy Node/Express backend (`backend/index.js`) used by some older workflows.
- Root infra/config files include `docker-compose.yml`, Firebase config (`firebase.json`, `firestore.rules`, `firestore.indexes.json`), and deployment scripts.

## Build, Test, and Development Commands
- Install deps:
  - `npm ci` (root)
  - `cd emr-portal && npm ci`
  - `cd emr-backend && npm ci`
  - `cd backend && npm install`
- Run apps locally:
  - `cd emr-portal && npm run dev -- --port 3001`
  - `cd emr-backend && PORT=8081 npm run dev`
  - `cd backend && npm start`
- Quality/build checks:
  - `cd emr-portal && npm run lint && npm run build`
  - `cd emr-backend && npm run lint && npm run build`
- Optional infra:
  - `docker compose up -d` (PACS/Orthanc/Nginx/Postgres stack)

## Coding Style & Naming Conventions
- Use TypeScript-first patterns in `emr-portal/` and `emr-backend/`; keep `strict`-compatible types.
- Follow existing formatting: 4-space indentation in TS/TSX files; preserve current quote/style patterns in touched files.
- React components: `PascalCase` filenames and exports (e.g., `LoginForm.tsx`).
- Utility/modules: `camelCase` or descriptive domain names (`trusted-types.ts`, `telehealth.ts`).
- Mutation endpoints and mutation UI flows should use optimistic updates by default (apply locally first, rollback on failure, and reconcile with server/state subscription).
- Use `react-hook-form` with `zod` validation for form handling in frontend flows instead of direct field-by-field `useState` form management.

## Testing Guidelines
- No dedicated automated test suite is currently enforced.
- Minimum verification for changes:
  - Run lint/build for touched package(s).
  - Smoke test key routes (`/login`, `/health`, critical API endpoints).
- Prefer adding focused tests only when introducing a test harness in that module.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat: ...`, `fix(scope): ...`, `infra: ...`.
- Keep commits scoped by package (`emr-portal`, `emr-backend`, `backend`) when possible.
- PRs should include:
  - concise problem/solution summary,
  - impacted paths,
  - env/config changes,
  - screenshots for UI changes,
  - manual verification steps (commands + results).

## Security & Configuration Tips
- Never commit secrets. Use `.env.example` and local `.env`/`.env.local`.
- For Firebase local auth, ensure `localhost` is added to Firebase Authorized Domains.
- Keep CSP/auth changes in `emr-portal/next.config.js` aligned with Firebase/Google auth requirements.
