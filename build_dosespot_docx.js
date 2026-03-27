const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

const PRIMARY = "0f172a";
const TEXT = "334155";
const SECONDARY = "2563eb";
const CLAUSE_COLOR = "b91c1c"; // Red for the warning

const protectionClause = "Do not modify, remove, or interfere with any existing DoseSpot SSO encryption logic, iframe security configuration, CORS settings, or patient-sync API calls. Only add new code alongside existing DoseSpot functionality. Do not alter the existing token generation, iframe embedding, or RBAC enforcement for the DoseSpot prescriber role.";

const makeClause = () => new Paragraph({
    spacing: { before: 200, after: 300 },
    children: [
        new TextRun({ text: protectionClause, color: CLAUSE_COLOR, bold: true, italics: true, size: 20 })
    ]
});

const doc = new Document({
    creator: "Patriotic Virtual Telehealth Architect",
    title: "DoseSpot Integration Developer Handoff",
    styles: {
        paragraphStyles: [
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { color: PRIMARY, size: 28, bold: true }, paragraph: { spacing: { before: 240, after: 120 } } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { color: SECONDARY, size: 24, bold: true }, paragraph: { spacing: { before: 240, after: 120 } } },
            { id: "Normal", name: "Normal", next: "Normal", quickFormat: true, run: { color: TEXT, size: 22 }, paragraph: { spacing: { before: 100, after: 100 } } }
        ]
    },
    sections: [{
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                    new TextRun({ text: "DOSESPOT INTEGRATION HANDOFF ARCHITECTURE GUIDE", bold: true, size: 36, color: PRIMARY }),
                ]
            }),
            
            // 1. Executive Summary
            new Paragraph({ text: "1. Executive Summary", heading: HeadingLevel.HEADING_1 }),
            new Paragraph("Patriotic Virtual Telehealth (PVT) is a comprehensive online healthcare platform providing immediate patient access to board-certified clinicians. To enable regulatory-compliant e-prescribing, PVT leverages the DoseSpot JumpStart iframe integration. This implementation allows our providers to securely write prescriptions, transmit them electronically to pharmacies, and review patient medication history without leaving the EMR context. Currently, the Stage 1 integration is operational under staging credentials. Foundational authentication and syncing logic have been verified."),
            makeClause(),
            
            // 2. System Architecture & Tech Stack Setup
            new Paragraph({ text: "2. System Architecture & Tech Stack Setup", heading: HeadingLevel.HEADING_1 }),
            new Paragraph("• Frontend Environment: Next.js 14 (App Router), deployed via Firebase Hosting. The EMR Portal renders the DoseSpot JumpStart interface via a secure iframe component (`<DoseSpotFrame />`).\n• Backend & Integration Layer: Node.js/Express deployed to Google Cloud Run, authenticating requests and establishing CORS/REST bridges to the DoseSpot API.\n• Database & State: Firebase Firestore processes patient clinical states, prescriber data, and synchronization triggers. Identity management relies on Firebase Auth with custom claims."),
            makeClause(),
            
            // 3. Credentials and Endpoints
            new Paragraph({ text: "3. Credentials and Endpoints", heading: HeadingLevel.HEADING_1 }),
            new Paragraph("Staging Credentials:\n- Clinic ID: 1007159\n- Clinician ID: 3088396\n- Base URL: my.staging.dosespot.com\n\nGoogle Cloud Setup:\n- Backend URL: https://[YOUR_CLOUD_RUN_URL]\n- Secrets Manager: All DoseSpot API keys, Single Sign-On (SSO) secrets, and Clinic Keys are stored in GCP Secret Manager. Incoming developers must use `gcloud secrets versions access` to inspect existing API mappings."),
            makeClause(),
            
            // 4. Completed Work
            new Paragraph({ text: "4. Completed Work", heading: HeadingLevel.HEADING_1 }),
            new Paragraph("The following foundational elements have been successfully deployed and verified:\n• SSO Encrypted Token Generation (Clinic & Clinician).\n• Secure Iframe Embedding & CORS Policy Resolution ensuring no browser blocks.\n• Patient Demographic Sync via API ensuring DoseSpot records match Firestore records.\n• Firebase RBAC Enforcement locking the iframe strictly to the 'prescriber' role.\n• Cross-Domain Authentication between our marketing site and the EMR portal."),
            makeClause(),
            
            // 5. Remaining Tasks (Priority Order)
            new Paragraph({ text: "5. Remaining Tasks & Priority Roadmap", heading: HeadingLevel.HEADING_1 }),
            new Paragraph("1. Production Credential Cutover: Migrate from my.staging.dosespot.com to production credentials in GCP Secret Manager.\n2. End-to-End Patient Sync Validation: Validate data consistency on write/update.\n3. Allergy & Medication History Sync: Parse and sync LOINC/RxNorm codes.\n4. Webhook Receiver Implementation: Establish `/api/v1/webhooks/dosespot`. (Model after existing Doxy.me webhook).\n5. Firebase Security Rules Bugfix: Resolve issues blocking Doxy.me session saves and banner loading (Must complete before Phase 16).\n6. EPCS Prescriber Enrollment: Complete identity proofing integration.\n7. Auto-Prescription Renewal Webhook: Handle automated continuity of care operations.\n8. DoseSpot API v1 to v2 Migration Planning: Architect upgrade pathway.\n9. Pediatric Sync Automation: Map height and weight sync using LOINC codes.\n10. DoseSpot CSS Branding Customization: Inject clinic-specific styling to the iframe interface."),
            makeClause(),
            
            // 6. Code Scaffolding
            new Paragraph({ text: "6. Code Scaffolding for High Priority Tasks", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "Task 1: Production Credential Cutover (GCP Commands)", bold: true }),
            new Paragraph({ text: "gcloud secrets versions add DOSESPOT_CLINIC_ID --data=\"YOUR_PROD_ID\"\n" +
                                 "gcloud secrets versions add DOSESPOT_SSO_KEY --data=\"YOUR_PROD_KEY\"\n" +
                                 "gcloud run deploy patriotic-virtual-backend --update-secrets=DOSESPOT_CLINIC_ID=DOSESPOT_CLINIC_ID:latest", font: "Courier New" }),
            
            new Paragraph({ text: "Task 2: DoseSpot Webhook Receiver (Express Route)", bold: true, spacing: { before: 200 } }),
            new Paragraph({ text: "app.post('/api/v1/webhooks/dosespot', async (req, res) => {\n" +
                                 "  try {\n" +
                                 "    const { eventType, patientId, prescriptionId } = req.body;\n" +
                                 "    // Verify DoseSpot signature here\n" +
                                 "    // Trigger internal Firestore updates\n" +
                                 "    res.status(200).send({ success: true });\n" +
                                 "  } catch (err) {\n" +
                                 "    res.status(500).send({ error: err.message });\n" +
                                 "  }\n" +
                                 "});", font: "Courier New" }),
            makeClause(),
            
            // 7. Developer Onboarding Checklist
            new Paragraph({ text: "7. Developer Onboarding Checklist", heading: HeadingLevel.HEADING_1 }),
            new Paragraph("[] Clone the patriotic-virtual-prod repository.\n[] Authenticate with GCP CLI and pull `.env` configurations from Secret Manager.\n[] Review `firestore.rules` and verify the RBAC requirements for prescribers.\n[] Launch the emulation suite or test against the staging backend.\n[] Read the DoseSpot API v2 standard documentation attached independently.\n[] Perform a dummy prescription workflow via the staging jumpstart iframe."),
            makeClause(),
            
            // Final Clause
            makeClause()
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('C:/Users/dayoo/Downloads/DoseSpot_Integration_Handoff_Guide.docx', buffer);
    console.log("Written docx successfully");
});
