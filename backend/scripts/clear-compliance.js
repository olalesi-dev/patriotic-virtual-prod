const admin = require('firebase-admin');
const serviceAccount = require('c:\\Users\\dayoo\\Downloads\\patriotic-virtual-prod-firebase-adminsdk-fbsvc-ba0548c407.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function deleteAll() {
    const snap = await db.collection('crm-compliance').doc('data').collection('document-records').get();
    console.log(`Deleting ${snap.size} documents...`);
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('Done! All compliance records deleted.');
    process.exit(0);
}
deleteAll().catch(e => { console.error(e); process.exit(1); });
