# Patriotic vEMR Architecture (HIPAA/Enterprise)

This repository contains the production-grade EMR codebase structured for HIPAA compliance, scalability, and strict security controls.

## 🏗️ System Architecture

### 1. Frontend: Clinical Portal (`emr-portal/`)
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS (Custom Medical Design System)
- **Hosting**: Firebase Hosting (Target: `emr`)
- **Security**:
  - **MFA Enrollment Gate**: `src/components/auth/MfaEnrollmentGate.tsx` - Blocks access until 2FA is verified.
  - **RBAC**: Role-based access control hook using Firebase Claims + Backend Profile.

### 2. Backend: EMR API (`emr-backend/`)
- **Runtime**: Node.js v20 + Express + TypeScript
- **Database**: Cloud SQL (PostgreSQL) - Strict Schema
- **Hosting**: Cloud Run (Serverless)
- **Key Modules**:
  - **Auth Middleware**: `src/middleware/auth.ts` - Enforces MFA for Staff, loads Audit Context.
  - **Telehealth Service**: `src/services/telehealth.ts` - Adapter pattern for Doxy/Zoom/Google.
  - **Schema**: `schema.sql` - Comprehensive normalized SQL schema.

## 🔒 Security Implementation (HIPAA)

1.  **Identity & Access**:
    *   Firebase Auth handles identity.
    *   Postgres `users` table stores RBAC roles and MFA state.
    *   Middleware explicitly checks `mfa_enrolled_at` for all Staff endpoints.

2.  **Audit Logging**:
    *   `audit_logs` table is APPEND-ONLY.
    *   Every PHI access (View/Edit) is logged via middleware interceptors.

3.  **Telehealth**:
    *   **Provider Override**: System checks `appointment_types.video_provider_override`.
    *   **Integration**: Adapters securely fetch join links (Time-gated URLs).

## 🚀 Getting Started

### Prerequisites
- Node.js v20+
- PostgreSQL Database
- Firebase Project

### Setup Frontend
```bash
cd emr-portal
npm install
npm run dev
```

### Setup Backend
```bash
cd emr-backend
npm install
# Create .env file with DATABASE_URL, FIREBASE_CREDENTIALS
npm run build
npm start
```

### Database Migration
Run the SQL script in `emr-backend/schema.sql` against your Cloud SQL instance.

## 📦 Deployment

This project handles multisite deployment via Firebase.

1.  **Build Frontend**: `cd emr-portal && npm run build`
2.  **Deploy**: `firebase deploy --only hosting`

## 🩺 Telehealth Adapter Logic

The system uses a Strategy Pattern to select video providers:
1.  Check `AppointmentType` for overrides (e.g., "Psychiatry" uses Zoom).
2.  Check Provider's integration status (OAuth tokens in DB).
3.  Fallback to `Doxy.me` static room if no integration exists.

See `emr-backend/src/services/telehealth.ts` for implementation.
