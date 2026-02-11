# Patriotic Virtual Telehealth — Infrastructure Playbook

**Project:** `patriotic-virtual-prod` · **GCP Region:** `us-central1`  
**API:** `https://telehealth-api-189906910824.us-central1.run.app`  
**Date:** February 4, 2026

---

## 1. Firebase Hosting Deployment

Your updated HTML is staged in `public/index.html`. Deploy files are ready.

### Directory Structure

```
patriotic-virtual-prod/
├── firebase.json          ← Hosting config (SPA rewrite, security headers, caching)
├── .firebaserc            ← Project alias → patriotic-virtual-prod
├── deploy.sh              ← One-command deploy script
└── public/
    └── index.html         ← Your updated telehealth site (99 KB)
```

### Deploy Commands

```bash
# One-time auth (run on your machine, not CI)
firebase login --no-localhost

# Deploy
cd patriotic-virtual-prod
./deploy.sh

# Or manually:
firebase deploy --only hosting --project patriotic-virtual-prod
```

### Post-Deploy

Your site will be live at:
- `https://patriotic-virtual-prod.web.app`
- `https://patriotic-virtual-prod.firebaseapp.com`
- Your custom domain (if configured in Firebase Console → Hosting → Custom domains)

The `firebase.json` includes security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy), SPA rewrite rules, and aggressive caching for static assets.

---

## 2. Retool EMR — Provider Dashboard

Retool gives you a no-code/low-code internal tool that connects directly to your Cloud Run API and Firestore. This is your provider-facing EMR for reviewing consultations, prescribing, and managing patients.

### Architecture

```
[Provider Browser] → [Retool App] → [Cloud Run API] → [Firestore / Cloud SQL]
                                   → [DrFirst/DoseSpot eRx API]
                                   → [Stripe API]
                                   → [Orthanc PACS API]
```

### Setup Steps

1. **Create Retool Account** — https://retool.com (Retool Cloud or self-hosted on GCP)
2. **Add API Resource** in Retool:
   - Type: REST API
   - Base URL: `https://telehealth-api-189906910824.us-central1.run.app/api/v1`
   - Auth: Bearer Token (use a service account token or Firebase Admin token)
3. **Add Firestore Resource** (direct read for dashboards):
   - Type: Firestore
   - Service Account JSON from `patriotic-virtual-prod`

### Recommended Retool Pages

| Page | Purpose | Key Queries |
|------|---------|-------------|
| **Consultation Queue** | Inbox of pending visits | `GET /consultations?status=pending` |
| **Patient Chart** | Full patient view + history | `GET /patients/:id` with embedded visit history |
| **Prescribing** | Write Rx → DrFirst/DoseSpot | `POST /prescriptions` (triggers eRx API) |
| **Radiology Worklist** | Studies pending read | `GET /studies?status=pending` (from Orthanc) |
| **Billing Dashboard** | Stripe payment status | Stripe resource → list charges/subscriptions |
| **Provider Schedule** | Availability + video links | Calendar component + Firestore schedule collection |

### Retool API Resource Config

```json
{
  "name": "PVT_API",
  "type": "restapi",
  "baseUrl": "https://telehealth-api-189906910824.us-central1.run.app",
  "defaultHeaders": {
    "Content-Type": "application/json",
    "X-Retool-Service": "emr-dashboard"
  },
  "authentication": "bearer",
  "authToken": "{{ secrets.FIREBASE_ADMIN_TOKEN }}"
}
```

### Key Retool Queries to Build

**Consultation Queue Query:**
```sql
-- If using Cloud SQL alongside Firestore:
SELECT c.id, c.service_key, c.status, c.created_at,
       p.first_name, p.last_name, p.email, p.state, p.dob
FROM consultations c
JOIN patients p ON c.patient_id = p.id
WHERE c.status = 'pending'
ORDER BY c.created_at ASC;
```

**REST Alternative (Cloud Run):**
```
GET /api/v1/admin/consultations?status=pending&limit=50
Authorization: Bearer {{ secrets.ADMIN_TOKEN }}
```

### API Endpoints to Add for Retool

Your Cloud Run API needs these admin/provider endpoints:

```
GET    /api/v1/admin/consultations          — List consultations (filter by status)
GET    /api/v1/admin/consultations/:id      — Full consultation detail + intake
PATCH  /api/v1/admin/consultations/:id      — Update status (reviewed, approved, denied)
GET    /api/v1/admin/patients               — Patient list
GET    /api/v1/admin/patients/:id           — Patient chart + visit history
POST   /api/v1/admin/prescriptions          — Create prescription (→ eRx)
GET    /api/v1/admin/prescriptions/:patientId — Rx history
POST   /api/v1/admin/notes                  — Provider clinical notes
GET    /api/v1/admin/studies                 — Radiology worklist (from Orthanc)
POST   /api/v1/admin/studies/:id/report     — Submit radiology report
```

---

## 3. Orthanc PACS — Radiology Infrastructure

Orthanc is an open-source, lightweight DICOM server. You'll run it on GCP to accept studies from referring urgent cares/clinics and present them to radiologists for reads.

### Architecture

```
[Referring Facility]               [Radiologist]
       │                                │
  DICOM C-STORE                    OHIF Viewer
       │                                │
       ▼                                ▼
┌─────────────────────────────────────────────┐
│              GCP Cloud Run / GCE            │
│  ┌─────────┐    ┌──────────────┐            │
│  │ Orthanc │───▶│ PostgreSQL   │            │
│  │ DICOM   │    │ (index DB)   │            │
│  │ Server  │    └──────────────┘            │
│  └────┬────┘                                │
│       │         ┌──────────────┐            │
│       └────────▶│ GCS Bucket   │            │
│                 │ (DICOM files)│            │
│                 └──────────────┘            │
│  ┌──────────────────────┐                   │
│  │ OHIF Viewer (static) │                   │
│  │ Firebase Hosting      │                   │
│  └──────────────────────┘                   │
└─────────────────────────────────────────────┘
         │                    │
    HL7/FHIR to           Retool EMR
    referring EMR          Rad Worklist
```

### Deployment Option A: GCE VM (Recommended for April Launch)

```bash
# 1. Create VM
gcloud compute instances create orthanc-pacs \
  --project=patriotic-virtual-prod \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --boot-disk-size=50GB \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --tags=orthanc-server \
  --scopes=storage-full

# 2. Firewall — DICOM port (4242) + HTTPS (443)
gcloud compute firewall-rules create allow-dicom \
  --project=patriotic-virtual-prod \
  --allow tcp:4242,tcp:443,tcp:8042 \
  --target-tags=orthanc-server \
  --source-ranges=0.0.0.0/0 \
  --description="DICOM C-STORE + Orthanc web UI"

# 3. Reserve static IP
gcloud compute addresses create orthanc-ip \
  --project=patriotic-virtual-prod \
  --region=us-central1
```

### Docker Compose (on the VM)

```yaml
# docker-compose.yml — Orthanc PACS
version: "3.8"

services:
  orthanc:
    image: orthancteam/orthanc:24.12.1
    restart: always
    ports:
      - "4242:4242"   # DICOM
      - "8042:8042"   # REST API + Web UI
    volumes:
      - ./orthanc.json:/etc/orthanc/orthanc.json:ro
      - orthanc-data:/var/lib/orthanc/db
    environment:
      - ORTHANC__POSTGRESQL__HOST=postgres
      - ORTHANC__POSTGRESQL__PORT=5432
      - ORTHANC__POSTGRESQL__DATABASE=orthanc
      - ORTHANC__POSTGRESQL__USERNAME=orthanc
      - ORTHANC__POSTGRESQL__PASSWORD=${POSTGRES_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: orthanc
      POSTGRES_USER: orthanc
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orthanc"]
      interval: 10s
      retries: 5

  ohif-viewer:
    image: ohif/app:v3.9
    restart: always
    ports:
      - "3000:80"
    volumes:
      - ./ohif-config.js:/usr/share/nginx/html/app-config.js:ro

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - orthanc
      - ohif-viewer

volumes:
  orthanc-data:
  pg-data:
```

### Orthanc Configuration

```json
{
  "Name": "Patriotic Virtual PACS",
  "RemoteAccessAllowed": true,
  "AuthenticationEnabled": true,
  "RegisteredUsers": {
    "admin": "CHANGE_ME_STRONG_PASSWORD",
    "retool": "CHANGE_ME_RETOOL_PASSWORD",
    "radiologist": "CHANGE_ME_RAD_PASSWORD"
  },
  "DicomServerEnabled": true,
  "DicomPort": 4242,
  "DicomAet": "PVTPACS",
  "HttpPort": 8042,

  "PostgreSQL": {
    "EnableIndex": true,
    "EnableStorage": false,
    "Host": "postgres",
    "Port": 5432,
    "Database": "orthanc",
    "Username": "orthanc",
    "Password": "FROM_ENV"
  },

  "GoogleCloudStorage": {
    "ServiceAccountFile": "/etc/orthanc/gcp-sa.json",
    "BucketName": "pvt-pacs-dicom-prod",
    "RootPath": "dicom-studies/"
  },

  "DicomModalities": {
    "URGENT_CARE_1": ["UCPACS1", "192.168.1.100", 4242],
    "CLINIC_IMAGING": ["CLINICPACS", "10.0.0.50", 4242]
  },

  "StableAge": 60,
  "StorageCompression": true,

  "Lua": {
    "OnStoredInstance": "function OnStoredInstance(instanceId, tags, metadata) -- notify API end end"
  }
}
```

### GCS Bucket for DICOM Storage

```bash
# Create HIPAA-appropriate bucket
gsutil mb -p patriotic-virtual-prod \
  -l us-central1 \
  -b on \
  gs://pvt-pacs-dicom-prod/

# Enable versioning for compliance
gsutil versioning set on gs://pvt-pacs-dicom-prod/

# Lifecycle — move to Coldline after 1 year
cat <<EOF > lifecycle.json
{
  "rule": [{
    "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
    "condition": {"age": 365}
  }]
}
EOF
gsutil lifecycle set lifecycle.json gs://pvt-pacs-dicom-prod/
```

### OHIF Viewer Config

```javascript
// ohif-config.js — connects OHIF Viewer to Orthanc's DICOMweb
window.config = {
  routerBasename: "/viewer",
  showStudyList: true,
  dataSources: [{
    namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
    sourceName: "PVT-PACS",
    configuration: {
      friendlyName: "Patriotic Virtual PACS",
      name: "orthanc",
      wadoUriRoot: "https://pacs.patriotictelehealth.com/wado",
      qidoRoot: "https://pacs.patriotictelehealth.com/dicom-web",
      wadoRoot: "https://pacs.patriotictelehealth.com/dicom-web",
      qidoSupportsIncludeField: false,
      imageRendering: "wadors",
      thumbnailRendering: "wadors",
      enableStudyLazyLoad: true,
      supportsFuzzyMatching: false,
      supportsWildcard: true
    }
  }],
  defaultDataSourceName: "PVT-PACS"
};
```

### Integration with Cloud Run API

Add these endpoints to your API for Retool and the patient portal:

```
GET    /api/v1/radiology/studies              — List studies (proxies Orthanc)
GET    /api/v1/radiology/studies/:orthancId   — Study detail + series/instances
POST   /api/v1/radiology/studies/:id/report   — Radiologist submits report
GET    /api/v1/radiology/reports/:patientId   — Patient's radiology reports
POST   /api/v1/radiology/upload-link          — Pre-signed URL for patient DICOM upload
```

### Timeline for April Launch

| Week | Milestone |
|------|-----------|
| Week 1 (Feb) | Provision GCE VM, install Docker, deploy Orthanc + Postgres |
| Week 2 (Feb) | Configure OHIF viewer, SSL certs, test DICOM C-STORE |
| Week 3 (Feb) | GCS storage integration, backup automation |
| Week 4 (Mar) | Build Retool radiology worklist page |
| Week 5 (Mar) | Cloud Run API radiology endpoints |
| Week 6 (Mar) | HL7/FHIR integration planning with first referring facility |
| Week 7 (Mar) | End-to-end testing: facility sends study → Orthanc → OHIF → report |
| Week 8 (Apr) | Soft launch with 1-2 referring facilities |

---

## 4. Stripe Checkout Integration

Your Stripe products are already created (from the CSV). Now wire them to the frontend consultation flow and subscription purchases.

### Product ID Mapping (from your Stripe dashboard)

| Service | Stripe Product ID | Price |
|---------|-------------------|-------|
| General Visit | `prod_Tsna4xzySPbKT0` | $79 |
| GLP-1 Weight Loss | `prod_TsnZ1goCbeavNz` | $129 |
| Erectile Dysfunction | `prod_TupASTZvm9MPDJ` | $79 |
| Premature Ejaculation | `prod_TupBXVZaCU7fWJ` | $79 |
| Testosterone / HRT | `prod_TsnbTXR2n8ni2R` | $149 |
| AI Imaging Analysis | `prod_TsnPLrOTNMh7xM` | $99 |
| AI Health Assistant | `prod_TsnOx9T2J8z8Bz` | $29 |
| Digital Platform | `prod_TsnTYEU145UpKl` | $19/mo |
| All Access Core | `prod_TsnR5LpCR65XOv` | $99/mo |
| All Access Plus | `prod_TsnRLsuI61fxnt` | $149/mo |
| All Access Elite | `prod_TsnS735VNACb3g` | $199/mo |
| Telehealth Basic | `prod_TsnLdFSY23zwtS` | $29/mo |
| Telehealth Standard | `prod_TsnM0Eu3XY9ckD` | $59/mo |
| Telehealth Premium | `prod_TsnNYdVBqlNpxO` | $99/mo |

### Step 1: Create Price Objects in Stripe

You need Price IDs for each product. Run via Stripe CLI or Dashboard:

```bash
# One-time clinical visits
stripe prices create \
  --product=prod_Tsna4xzySPbKT0 \
  --unit-amount=7900 \
  --currency=usd

stripe prices create \
  --product=prod_TsnZ1goCbeavNz \
  --unit-amount=12900 \
  --currency=usd

stripe prices create \
  --product=prod_TupASTZvm9MPDJ \
  --unit-amount=7900 \
  --currency=usd

stripe prices create \
  --product=prod_TupBXVZaCU7fWJ \
  --unit-amount=7900 \
  --currency=usd

stripe prices create \
  --product=prod_TsnbTXR2n8ni2R \
  --unit-amount=14900 \
  --currency=usd

# Subscriptions (recurring)
stripe prices create \
  --product=prod_TsnR5LpCR65XOv \
  --unit-amount=9900 \
  --currency=usd \
  --recurring='{"interval":"month"}'

stripe prices create \
  --product=prod_TsnRLsuI61fxnt \
  --unit-amount=14900 \
  --currency=usd \
  --recurring='{"interval":"month"}'

stripe prices create \
  --product=prod_TsnS735VNACb3g \
  --unit-amount=19900 \
  --currency=usd \
  --recurring='{"interval":"month"}'
```

### Step 2: Cloud Run API — Checkout Session Endpoint

Add this to your Cloud Run API:

```javascript
// POST /api/v1/payments/create-checkout-session
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/v1/payments/create-checkout-session', authenticateFirebase, async (req, res) => {
  const { priceId, serviceKey, consultationId, mode } = req.body;
  // mode: 'payment' for one-time, 'subscription' for recurring

  try {
    const session = await stripe.checkout.sessions.create({
      mode: mode || 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email,
      client_reference_id: req.user.uid,
      metadata: {
        firebaseUid: req.user.uid,
        serviceKey: serviceKey,
        consultationId: consultationId || ''
      },
      success_url: `${process.env.FRONTEND_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}?payment=cancelled`,
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});
```

### Step 3: Webhook Handler

```javascript
// POST /api/v1/webhooks/stripe
app.post('/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { firebaseUid, serviceKey, consultationId } = session.metadata;
        // Mark consultation as paid, activate subscription, etc.
        await activateService(firebaseUid, serviceKey, consultationId, session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateSubscriptionStatus(sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handleFailedPayment(invoice);
        break;
      }
    }

    res.json({ received: true });
  }
);
```

### Step 4: Frontend Integration

Update the `subC()` function in your HTML to redirect to Stripe Checkout after consultation submission:

```javascript
async function subC() {
  try {
    const sv = svcs.find(x => x.k === selSvc);

    // 1. Submit consultation to API
    const consultRes = await fetch(`${API}/api/v1/consultations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        serviceKey: sv.k,
        stripeProductId: sv.stripe,
        intake: intake
      })
    });
    const consultation = await consultRes.json();

    // 2. Create Stripe Checkout session
    const checkoutRes = await fetch(`${API}/api/v1/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        priceId: sv.priceId,  // Replace PRICE_ID_* placeholders with real IDs
        serviceKey: sv.k,
        consultationId: consultation.id,
        mode: sv.priceSuffix ? 'subscription' : 'payment'
      })
    });
    const { url } = await checkoutRes.json();

    // 3. Redirect to Stripe Checkout
    window.location.href = url;
  } catch (e) {
    // Fallback: show success without payment (for testing)
    cN(4);
    toast('Visit submitted! Payment processing coming soon.');
  }
}
```

### Stripe Environment Variables (Cloud Run)

```bash
gcloud run services update telehealth-api \
  --project=patriotic-virtual-prod \
  --region=us-central1 \
  --set-env-vars="STRIPE_SECRET_KEY=sk_live_XXXX,STRIPE_WEBHOOK_SECRET=whsec_XXXX,FRONTEND_URL=https://patriotictelehealth.com"
```

---

## 5. DrFirst / DoseSpot eRx Integration

Electronic prescribing is required for controlled and non-controlled substances. Both DrFirst (Rcopia) and DoseSpot are EPCS-certified. DoseSpot is typically faster to integrate for startups.

### Option A: DoseSpot (Recommended for Speed)

DoseSpot offers a white-label iframe that embeds directly into Retool or your provider dashboard.

**Integration flow:**

```
[Provider in Retool] → [DoseSpot iframe/API] → [Surescripts] → [Patient's pharmacy]
```

**Setup Steps:**

1. **Apply at** https://dosespot.com — request sandbox credentials
2. **Complete EPCS enrollment** — each prescriber needs identity proofing + 2FA
3. **Get API credentials:**
   - `clinicId`, `clinicKey`
   - SSO endpoint for iframe embedding
   - REST API endpoint for programmatic Rx

**API Integration (Cloud Run):**

```javascript
// POST /api/v1/prescriptions/create
app.post('/api/v1/prescriptions/create', authenticateProvider, async (req, res) => {
  const { patientId, medication, directions, quantity, refills, pharmacyId } = req.body;

  // 1. Ensure patient exists in DoseSpot
  const dsPatient = await dosespot.findOrCreatePatient({
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: patient.dob,
    gender: patient.gender,
    address: patient.address,
    phone: patient.phone
  });

  // 2. Create prescription
  const rx = await dosespot.createPrescription({
    patientId: dsPatient.id,
    clinicianId: req.provider.dosespotId,
    drugName: medication.name,
    drugNdc: medication.ndc,
    directions: directions,
    quantity: quantity,
    refills: refills,
    pharmacyId: pharmacyId,
    daysSupply: medication.daysSupply
  });

  // 3. Store in our DB
  await db.collection('prescriptions').add({
    patientUid: patientId,
    providerUid: req.provider.uid,
    dosespotRxId: rx.id,
    medication: medication.name,
    status: 'pending_signature',
    createdAt: new Date()
  });

  res.json({ prescriptionId: rx.id, status: 'pending_signature' });
});
```

**DoseSpot iframe in Retool:**

```javascript
// Retool Custom Component — DoseSpot SSO
const ssoUrl = `https://my.dosespot.com/webapi/sso?` +
  `SingleSignOnClinicId=${CLINIC_ID}` +
  `&SingleSignOnUserId=${providerId}` +
  `&SingleSignOnPhraseLength=128` +
  `&SingleSignOnCode=${generateHMAC(providerId)}` +
  `&PatientId=${dsPatientId}`;

// Embed in Retool iframe component
return `<iframe src="${ssoUrl}" width="100%" height="800" />`;
```

### Option B: DrFirst (Rcopia)

DrFirst is the larger, more established platform. Better for multi-state operations.

**Integration flow is similar** — DrFirst provides both iframe (Rcopia) and API (EPCS API) options.

**Key differences from DoseSpot:**
- Longer onboarding (4-8 weeks vs 2-4 weeks)
- More comprehensive formulary/benefits checking
- Better Surescripts RealTime Prescription Benefits (RTPB) integration
- Higher cost but more features

### eRx API Endpoints for Cloud Run

```
POST   /api/v1/erx/patients              — Create/sync patient in DoseSpot
GET    /api/v1/erx/patients/:id/meds     — Medication history
POST   /api/v1/erx/prescriptions         — Create new Rx
GET    /api/v1/erx/prescriptions/:id     — Rx status
POST   /api/v1/erx/prescriptions/:id/sign — EPCS sign (provider 2FA)
GET    /api/v1/erx/pharmacies/search     — Pharmacy search by zip
POST   /api/v1/erx/eligibility           — Insurance/formulary check
GET    /api/v1/erx/notifications         — Pharmacy change requests, refill requests
```

### EPCS Compliance Requirements

Each prescribing provider needs:
- Identity proofing (NIST SP 800-63A Level 3)
- Two-factor authentication (hardware token or biometric)
- Logical access controls in your system
- DEA EPCS certification (through DoseSpot/DrFirst — they handle this)
- Audit logging of all prescription events

### Retool Prescribing Workflow

```
1. Provider opens patient chart in Retool
2. Reviews consultation intake + safety screening
3. Clicks "Prescribe" → DoseSpot iframe loads
4. Searches medication → selects formulation + dose
5. Confirms patient pharmacy (or searches new one)
6. DoseSpot runs drug interaction + allergy check
7. Provider signs with EPCS 2FA
8. Prescription transmits to pharmacy via Surescripts
9. API webhook updates consultation status to "prescribed"
10. Patient gets notification: "Your prescription has been sent to [pharmacy]"
```

---

## 6. Environment Variables & Secrets

All secrets should be in GCP Secret Manager, referenced by Cloud Run:

```bash
# Create secrets
echo -n "sk_live_XXXX" | gcloud secrets create stripe-secret-key \
  --data-file=- --project=patriotic-virtual-prod

echo -n "whsec_XXXX" | gcloud secrets create stripe-webhook-secret \
  --data-file=- --project=patriotic-virtual-prod

echo -n "YOUR_DOSESPOT_CLINIC_KEY" | gcloud secrets create dosespot-clinic-key \
  --data-file=- --project=patriotic-virtual-prod

# Reference in Cloud Run
gcloud run services update telehealth-api \
  --project=patriotic-virtual-prod \
  --region=us-central1 \
  --set-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest,\
STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,\
DOSESPOT_CLINIC_KEY=dosespot-clinic-key:latest"
```

---

## 7. HIPAA Considerations

| Component | HIPAA Requirement | Implementation |
|-----------|-------------------|----------------|
| Firebase Hosting | BAA with Google | Sign Google Cloud BAA (covers Firebase) |
| Cloud Run API | Encryption at rest + transit | Default GCP encryption + HTTPS-only |
| Orthanc PACS | PHI storage | GCS with CMEK encryption, VPC Service Controls |
| Stripe | PCI DSS | Stripe handles; don't store card data |
| DoseSpot | eRx PHI | DoseSpot is HIPAA-covered; sign BAA |
| Retool | Admin access to PHI | Retool Cloud HIPAA plan or self-host; sign BAA |
| Firestore | Patient data | GCP BAA covers Firestore; field-level encryption for SSN/DOB |

**Critical:** Sign BAAs with Google Cloud, Stripe, DoseSpot/DrFirst, and Retool before going live.

---

## 8. Quick Start Checklist

### This Week
- [ ] Deploy HTML to Firebase Hosting (`./deploy.sh`)
- [ ] Create Stripe Price objects for all 14 products
- [ ] Add checkout session endpoint to Cloud Run API
- [ ] Register webhook endpoint in Stripe Dashboard

### February
- [ ] Provision Orthanc VM on GCE
- [ ] Deploy Orthanc + PostgreSQL + OHIF via Docker Compose
- [ ] Set up Retool account + API resource
- [ ] Build consultation queue page in Retool
- [ ] Apply for DoseSpot sandbox credentials

### March
- [ ] Integrate Stripe Checkout into frontend consultation flow
- [ ] Build Retool prescribing page with DoseSpot iframe
- [ ] Configure Orthanc DICOM receiving from test facility
- [ ] Build radiology worklist in Retool
- [ ] End-to-end eRx test: consult → review → prescribe → pharmacy
- [ ] Sign all HIPAA BAAs

### April
- [ ] Soft launch PACS with 1-2 referring facilities
- [ ] Go live with Stripe payments on consultations
- [ ] EPCS enrollment for all prescribing providers
- [ ] Production eRx go-live
