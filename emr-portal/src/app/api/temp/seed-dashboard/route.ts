import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
        return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    try {
        if (!db) throw new Error('DB not initialized');

        const now = new Date();

        // 1. Seed Appointments
        const apptsRef = db.collection('patients').doc(uid).collection('appointments');

        // Appointment starting in 5 minutes (for pulsing Join Now)
        await apptsRef.doc('appt_pulsing').set({
            date: new Date(now.getTime() + 5 * 60000),
            providerName: 'Dr. Sarah Henderson',
            type: 'Video Consultation',
            status: 'scheduled',
            meetingUrl: 'https://meet.google.com/abc-defg-hij'
        });

        // Appointment tomorrow
        await apptsRef.doc('appt_tomorrow').set({
            date: new Date(now.getTime() + 24 * 60 * 60000),
            providerName: 'Radiology Dept - Main Office',
            type: 'In-person Imaging',
            status: 'scheduled'
        });

        // 2. Seed Messages
        const msgsRef = db.collection('patients').doc(uid).collection('messages');
        await msgsRef.doc('msg_1').set({
            senderName: 'Care Team',
            preview: 'Your latest lab results are ready for review. Please schedule a follow-up.',
            timestamp: new Date(),
            unread: true
        });
        await msgsRef.doc('msg_2').set({
            senderName: 'Dr. Mark Wilson',
            preview: 'I have approved your refill request for Lisinopril.',
            timestamp: new Date(now.getTime() - 3600000),
            unread: true
        });

        // 3. Seed Medications
        const medsRef = db.collection('patients').doc(uid).collection('medications');
        await medsRef.doc('med_1').set({
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Once daily',
            status: 'active',
            prescribingProvider: 'Dr. Sarah Henderson',
            refillsRemaining: 2,
            instructions: 'Take one tablet by mouth every morning. May be taken with or without food.',
            sideEffects: ['Dizziness', 'Cough', 'Fatigue'],
            startDate: new Date(now.getTime() - 60 * 24 * 60 * 60000)
        });
        await medsRef.doc('med_2').set({
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            status: 'active',
            prescribingProvider: 'Dr. Sarah Henderson',
            refillsRemaining: 1,
            instructions: 'Take one tablet with breakfast and one with dinner to minimize stomach upset.',
            sideEffects: ['Nausea', 'Diarrhea'],
            startDate: new Date(now.getTime() - 90 * 24 * 60 * 60000)
        });

        // 4. Seed Lab Results (Multiple for trending)
        const labsRef = db.collection('patients').doc(uid).collection('lab_results');
        const labTests = [
            { name: 'Hemoglobin A1c', val: '5.7', num: 5.7, unit: '%', range: '4.0 - 5.6', status: 'Review Needed', daysAgo: 2 },
            { name: 'Hemoglobin A1c', val: '5.9', num: 5.9, unit: '%', range: '4.0 - 5.6', status: 'Review Needed', daysAgo: 90 },
            { name: 'Hemoglobin A1c', val: '6.2', num: 6.2, unit: '%', range: '4.0 - 5.6', status: 'Review Needed', daysAgo: 180 },
            { name: 'Lipid Panel - LDL', val: '98', num: 98, unit: 'mg/dL', range: '< 100', status: 'Normal', daysAgo: 2 }
        ];

        for (const lab of labTests) {
            await labsRef.add({
                testName: lab.name,
                category: 'Metabolic',
                dateResulted: new Date(now.getTime() - lab.daysAgo * 24 * 60 * 60000),
                value: lab.val,
                numericValue: lab.num,
                unit: lab.unit,
                referenceRange: lab.range,
                status: lab.status,
                provider: 'Dr. Sarah Henderson',
                notes: 'Control suggests slight improvement in glycemic management. Continue current medication regimen.'
            });
        }

        // 5. Seed Imaging
        const imagingRef = db.collection('patients').doc(uid).collection('imaging');
        await imagingRef.doc('img_1').set({
            type: 'MRI',
            bodyPart: 'Lumbar Spine',
            date: new Date(now.getTime() - 5 * 24 * 60 * 60000),
            status: 'Results Available',
            provider: 'Dr. Mark Wilson',
            facility: 'Patriotic Medical Imaging - West',
            reportText: 'FINDINGS: Normal alignment of the lumbar spine. No suspicious marrow signal intensity identifies. The conus medullaris terminates normally at L1.\n\nL4-L5: Subtle 2mm broad-based posterior disc bulge without significant spinal stenosis or neural foraminal narrowing.\n\nIMPRESSION: Stable lumbar spine. No acute surgical pathology identified.',
            viewerUrl: 'https://pacs.patriotic-emr.com/viewer/study-99281'
        });

        // 6. Seed Global Providers (for scheduling)
        const providersRef = db.collection('providers');
        const demoProviders = [
            { id: 'dr_sarah_henderson', name: 'Dr. Sarah Henderson', specialty: 'Primary Care', availability: ['Monday', 'Wednesday', 'Friday'], bio: 'Board-certified family physician with 15 years experience.' },
            { id: 'dr_mark_wilson', name: 'Dr. Mark Wilson', specialty: 'Radiology', availability: ['Tuesday', 'Thursday'], bio: 'Specializing in neuroradiology and musculoskeletal imaging.' },
            { id: 'dr_elena_rodriguez', name: 'Dr. Elena Rodriguez', specialty: 'Cardiology', availability: ['Monday', 'Tuesday', 'Thursday'], bio: 'Expert in preventative cardiology and heart health.' }
        ];

        for (const p of demoProviders) {
            await providersRef.doc(p.id).set(p);
        }

        // 7. Seed Messaging Threads
        const threadsRef = db.collection('threads');
        // Clear existing for this demo patient to avoid mess
        const existingThreads = await threadsRef.where('patientId', '==', uid).get();
        for (const doc of existingThreads.docs) {
            await doc.ref.delete();
        }

        const thread1 = await threadsRef.add({
            patientId: uid,
            providerId: 'dr_sarah_henderson',
            providerName: 'Dr. Sarah Henderson',
            subject: 'Follow-up on Lab Results',
            category: 'Test Results',
            lastMessage: 'Is there any concern with my glucose levels?',
            lastMessageAt: new Date(),
            updatedAt: new Date(),
            unreadCount: 1
        });

        await threadsRef.doc(thread1.id).collection('messages').add({
            senderId: 'dr_sarah_henderson',
            senderType: 'provider',
            body: 'Hello! I reviewed your results. Most metrics look excellent.',
            createdAt: new Date(now.getTime() - 3600000),
            read: true
        });

        await threadsRef.doc(thread1.id).collection('messages').add({
            senderId: uid,
            senderType: 'patient',
            body: 'Is there any concern with my glucose levels?',
            createdAt: new Date(),
            read: false
        });

        // 8. Seed Billing Summary
        const billingRef = db.collection('patients').doc(uid).collection('billing');
        await billingRef.doc('summary').set({
            balance: 145.00,
            status: 'overdue',
            nextBillingDate: new Date(now.getTime() + 15 * 24 * 60 * 60000), // 15 days from now
            membershipPlan: 'Premium Wellness Plan',
            stripePortalUrl: 'https://billing.stripe.com/p/session/test_123'
        });

        // 9. Seed Statements
        const statementsRef = billingRef.doc('summary').collection('statements');
        await statementsRef.add({
            date: new Date(now.getTime() - 45 * 24 * 60 * 60000),
            amount: 75.00,
            status: 'paid',
            items: [
                { description: 'Video Consultation - Follow up', amount: 50.00 },
                { description: 'Prescription Refill Processing', amount: 25.00 }
            ]
        });
        await statementsRef.add({
            date: new Date(now.getTime() - 5 * 24 * 60 * 60000),
            amount: 145.00,
            status: 'unpaid',
            items: [
                { description: 'In-person Specialty Consult', amount: 120.00 },
                { description: 'Lab Collection Fee', amount: 25.00 }
            ]
        });

        // 10. Seed Insurance
        await db.collection('patients').doc(uid).collection('insurance').doc('current').set({
            carrier: 'Blue Cross Blue Shield',
            memberId: 'BCB123456789',
            groupNumber: 'XJ-4450',
            status: 'Active',
            lastVerified: new Date(now.getTime() - 10 * 24 * 60 * 60000)
        });

        return NextResponse.json({
            success: true,
            message: 'Complete Dashboard, Provider, Messaging, and Billing data seeded successfully!',
            uid
        });
    } catch (error: any) {
        console.error('Seeding Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
