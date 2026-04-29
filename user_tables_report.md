# Patriotic Virtual Telehealth - EMR User Tables Report

## Overview
This report outlines the user data storage architecture within the Patriotic Virtual Telehealth EMR platform.

## User Tables and Locations

The platform uses Google Cloud Firestore for its primary database. The user-related data is split across several key collections:

### 1. `users` Collection
- **Location:** Firestore `users` root collection.
- **Purpose:** The master record for all authenticated accounts in the system (Patients, Providers, Admins, etc.).
- **Linked Platforms:**
  - Firebase Authentication (UID matches document ID).
  - Main EMR Portal (`emr-portal`) for login and basic profile state.
  - Role-based Access Control (RBAC) determining dashboard routing.
- **Exported As:** `users.csv`

### 2. `patients` Collection
- **Location:** Firestore `patients` root collection.
- **Purpose:** Stores extended clinical and demographic data specifically for patients. This allows separation of clinical data from basic authentication data for security.
- **Linked Platforms:**
  - DoseSpot Integration (ePrescribing details, sync status, `doseSpotPatientId`).
  - Clinical Analytics Dashboard.
  - Vouched Identity Verification service.
- **Exported As:** `patients.csv`

### 3. `providers` (Virtual Collection / Filter)
- **Location:** Firestore `users` collection filtered by `role == 'provider'`.
- **Purpose:** Stores clinician details such as NPI, DEA number, state licenses, and specialty.
- **Linked Platforms:**
  - Doxy.me integration (Waiting room routing).
  - DoseSpot Integration (Clinician sync status, `doseSpotClinicianId`).
  - PowerScribe / RadAI (Radiology integrations).
- **Exported As:** Contained within `users.csv` (No separate `providers` collection found during export).

### 4. Associated Collections
While not strictly "user tables", these collections contain user-generated or user-linked data:
- `threads` / `messages`: Secure messaging between users.
- `appointments`: Booking and scheduling data linking a patient and a provider.
- `audits`: Activity logs tracking actions performed by admins and providers.

## Data Export Completion
The user records have been successfully exported to your local system.
- **Location:** `C:\Users\dayoo\Downloads\`
- **Files Generated:** `users.csv`, `patients.csv`
