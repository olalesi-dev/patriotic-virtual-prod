const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createLegitScriptTestUser() {
  const email = 'legitscript-reviewer@patriotictelehealth.com';
  const password = 'TestUser123!';
  
  try {
    // 1. Create Auth User
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('User already exists:', userRecord.uid);
      await auth.updateUser(userRecord.uid, { password });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: email,
          emailVerified: true,
          password: password,
          displayName: 'Demo Patient',
          disabled: false,
        });
        console.log('Successfully created new user:', userRecord.uid);
      } else {
        throw error;
      }
    }

    // 2. Add to Patients Collection
    const dbRef = db.collection('patients').doc(userRecord.uid);
    await dbRef.set({
      uid: userRecord.uid,
      email: email,
      firstName: 'LegitScript',
      lastName: 'Reviewer',
      name: 'LegitScript Reviewer',
      role: 'patient',
      dob: '1980-01-01',
      sex: 'Female',
      state: 'Florida',
      phone: '(555) 555-0199',
      status: 'active',
      consentAccepted: true,
      consentAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: 'TEST ACCOUNT EXCLUSIVELY FOR LEGITSCRIPT REVIEW PROCESS. NO REAL CLINICAL WORKFLOWS.'
    }, { merge: true });

    // 3. Add to Users Collection (if it exists)
    const userDbRef = db.collection('users').doc(userRecord.uid);
    await userDbRef.set({
      uid: userRecord.uid,
      email: email,
      name: 'LegitScript Reviewer',
      firstName: 'LegitScript',
      lastName: 'Reviewer',
      role: 'patient',
      consentAccepted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('✅ Test patient successfully generated and synced to Firestore.');
    console.log('Credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('Error creating new user:', error);
  } finally {
    process.exit(0);
  }
}

createLegitScriptTestUser();
