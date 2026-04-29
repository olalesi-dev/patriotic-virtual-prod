/**
 * Compliance Document Seed Script
 * Seeds all 15 required compliance document records into Firestore.
 * Documents can then be uploaded via the Compliance UI in the CRM.
 */

const admin = require('firebase-admin');
const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const CATEGORIES = [
    { name: "Business Associate Agreements", expStr: "2 years" },
    { name: "HIPAA Privacy Policy", expStr: "1 year" },
    { name: "HIPAA Security Policy", expStr: "1 year" },
    { name: "Patient Consent Forms", expStr: "1 year" },
    { name: "Informed Consent for Treatment", expStr: "1 year" },
    { name: "State-Specific Telehealth Compliance Documents", expStr: "1 year", state: "FL" },
    { name: "Notice of Privacy Practices", expStr: "1 year" },
    { name: "Data Breach Notification Policy", expStr: "1 year" },
    { name: "Record Retention Policy", expStr: "1 year" },
    { name: "Accessibility and Nondiscrimination Policy", expStr: "1 year" },
    { name: "Telehealth Provider Licensure Documentation", expStr: "manual", providerName: "[Add Provider Name]", state: "FL" },
    { name: "ONC Certification", expStr: "1 year" },
    { name: "E-Prescribing Compliance", expStr: "1 year" },
    { name: "Telehealth Platform Terms of Service", expStr: "1 year" },
    { name: "Emergency Protocol Documentation", expStr: "1 year" }
];

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const getExpDate = (expStr) => {
    if (expStr === "manual") return null;
    const date = new Date(today);
    if (expStr === "1 year") date.setFullYear(date.getFullYear() + 1);
    else if (expStr === "2 years") date.setFullYear(date.getFullYear() + 2);
    return date.toISOString().split('T')[0];
};

async function seed() {
    console.log("Starting compliance documentation seeding (Firestore records only)...\n");

    // First check if there are already records - avoid duplicate seeding
    const existing = await db.collection('crm-compliance').doc('data').collection('document-records').limit(1).get();
    if (!existing.empty) {
        console.log("⚠️  Records already exist in crm-compliance/data/document-records.\n   Run only once or delete existing records first.");
        return;
    }

    for (const cat of CATEGORIES) {
        const title = `Standard ${cat.name} - Patriotic Telehealth`;
        const effectiveDate = todayStr;
        const expirationDate = getExpDate(cat.expStr);
        const version = "1.0";

        const record = {
            title,
            category: cat.name,
            effectiveDate,
            expirationDate: expirationDate || null,
            noExpiration: !expirationDate,
            version,
            status: expirationDate ? 'Active' : 'Active',
            uploaderId: 'system-seed',
            notes: `DRAFT TEMPLATE — Upload the finalized ${cat.name} document and let AI extract the key dates and metadata. Legal review required before use.`,
            fileUrl: null,
            filename: null,
            aiExtractionStatus: 'not_uploaded',
            versionHistory: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (cat.state) record.state = cat.state;
        if (cat.providerName) record.providerName = cat.providerName;

        const docRef = db.collection('crm-compliance').doc('data').collection('document-records').doc();
        await docRef.set(record);

        // Seed activity log entry
        await docRef.collection('activity-log').add({
            action: 'Record Created',
            actor: 'System Seed',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            note: `Compliance record created via seed script. Document upload pending.`
        });

        const expDisplay = expirationDate || 'Manual (check required)';
        console.log(`✓ [${docRef.id}] ${cat.name}`);
        console.log(`    Effective: ${effectiveDate} | Expires: ${expDisplay}\n`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Seeding complete! 15 compliance records created.");
    console.log("   Next steps:");
    console.log("   1. Go to CRM > Compliance in the EMR portal.");
    console.log("   2. Upload the actual document file for each record.");
    console.log("   3. AI will automatically extract dates and metadata on upload.");
    console.log("   4. Review AI-extracted fields and update manually as needed.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

seed().then(() => process.exit(0)).catch(e => { console.error('Seed error:', e); process.exit(1); });
