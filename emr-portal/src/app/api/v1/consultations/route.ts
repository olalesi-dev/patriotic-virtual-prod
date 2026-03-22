import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// CATALOG: service keys map to readable names and prices (in cents)
const CATALOG: Record<string, { name: string; amount: number; interval?: string }> = {
  general_visit: { name: 'General Visit', amount: 7900 },
  weight_loss: { name: 'GLP-1 & Weight Loss', amount: 12900 },
  erectile_dysfunction: { name: 'Erectile Dysfunction', amount: 7900 },
  premature_ejaculation: { name: 'Premature Ejaculation', amount: 7900 },
  testosterone_hrt: { name: 'Testosterone / HRT', amount: 14900 },
  ai_imaging: { name: 'AI-Powered Imaging Analysis', amount: 9900 },
  report_interpretation: { name: 'Report Interpretation', amount: 14900 },
  standard_imaging: { name: 'Standard Imaging Review', amount: 24900 },
  imaging_video: { name: 'Imaging + Video Consult', amount: 44900 },
  diagnostic_single: { name: 'Single Study Read', amount: 7500 },
  diagnostic_second: { name: 'Diagnostic Second Opinion', amount: 25000 },
  ai_assistant: { name: 'AI Health Assistant', amount: 2900, interval: 'month' },
  digital_platform: { name: 'Digital Health Platform', amount: 1900, interval: 'month' },
  membership_elite: { name: 'All Access — Elite', amount: 19900, interval: 'month' },
  membership_plus: { name: 'All Access — Plus', amount: 14900, interval: 'month' },
  membership_core: { name: 'All Access — Core', amount: 9900, interval: 'month' },
  telehealth_premium: { name: 'Telehealth Premium', amount: 9900, interval: 'month' },
  telehealth_standard: { name: 'Telehealth Standard', amount: 5900, interval: 'month' },
  telehealth_basic: { name: 'Telehealth Basic', amount: 2900, interval: 'month' },
};

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase Auth token
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    if (!auth) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { serviceKey, intake, stripeProductId } = await req.json();

    // Fetch real user info from Auth
    let realFirst = '';
    let realLast = '';
    let realEmail = '';
    try {
      const userRec = await auth.getUser(uid);
      realEmail = userRec.email || '';
      if (userRec.displayName) {
        const parts = userRec.displayName.split(' ');
        realFirst = parts[0] || '';
        realLast = parts.slice(1).join(' ') || '';
      }
    } catch (e) {
      console.error('Auth fetch failed in consultations route:', e);
    }

    const fName = (intake?.firstName || intake?.first_name || realFirst || 'Patient');
    const lName = (intake?.lastName || intake?.last_name || realLast || '');
    const email = intake?.email || realEmail;

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // Create consultation document
    const adminDb = db as admin.firestore.Firestore;
    const consultRef = await adminDb.collection('consultations').add({
      uid: uid || null,
      patient: `${fName} ${lName}`.trim(),
      patientEmail: email,
      serviceKey: serviceKey || 'unknown',
      intake: intake || {},
      stripeProductId: stripeProductId || null,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Upsert patient record
    await adminDb.collection('patients').doc(uid).set({
      uid,
      firstName: fName,
      lastName: lName,
      name: `${fName} ${lName}`.trim(),
      email,
      dob: intake?.dateOfBirth || '',
      state: intake?.state || '',
      lastVisit: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ id: consultRef.id, message: 'Consultation created' });
  } catch (error: any) {
    console.error('Error creating consultation:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
