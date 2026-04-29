import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { subject, body: msgBody, actionLabel, actionUrl, priority, filters, manualRecipients } = body;

        if (!subject || !msgBody) {
            return NextResponse.json({ success: false, error: 'Missing subject or body' }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ success: false, error: 'Admin database not initialized' }, { status: 500 });
        }

        // 1. Resolve Target Users
        const targetUids = new Set<string>();
        const db = adminDb!;

        // Query users collection based on role if it's not 'All'
        let usersQuery: any = db.collection('users');
        if (filters && filters.role && filters.role !== 'All') {
            usersQuery = usersQuery.where('role', '==', filters.role.toLowerCase());
        }
        
        // Status filter (simplified, assuming we have a status field or just dummy filtering for now)
        if (filters && filters.status && filters.status !== 'All') {
             usersQuery = usersQuery.where('status', '==', filters.status.toLowerCase());
        }

        const querySnapshot = await usersQuery.get();
        querySnapshot.forEach((doc: any) => {
            targetUids.add(doc.id);
        });

        // Add manual recipients (assuming they might be generic email strings or UIDs, resolving emails to UIDs is complex without auth().getUserByEmail, so we just assume UIDs or store them directly if email formatting)
        if (manualRecipients && Array.isArray(manualRecipients)) {
            for (const recipient of manualRecipients) {
                // If it's an email, we could look it up. For safety in this demo, we'll try to add the raw string as the Document ID. In reality, you'd use admin.auth().getUserByEmail()
                if (recipient.includes('@')) {
                    try {
                        const userQuery = await db.collection('users').where('email', '==', recipient).limit(1).get();
                        if (!userQuery.empty) {
                            targetUids.add(userQuery.docs[0].id);
                        }
                    } catch (e) {
                         // ignore failed email lookups
                    }
                } else {
                    targetUids.add(recipient); // assume it's a UID
                }
            }
        }

        const finalTargets = Array.from(targetUids);
        if (finalTargets.length === 0) {
            return NextResponse.json({ success: false, error: 'No matching users found for this broadcast' }, { status: 404 });
        }

        // 2. Perform Batch Writes to Users' Subcollections
        const CHUNK_SIZE = 500;
        let batchCount = 0;
        
        for (let i = 0; i < finalTargets.length; i += CHUNK_SIZE) {
            const chunk = finalTargets.slice(i, i + CHUNK_SIZE);
            const batch = db.batch();
            
            chunk.forEach(uid => {
                const notifRef = db.collection('users').doc(uid).collection('notifications').doc();
                batch.set(notifRef, {
                    subject,
                    body: msgBody,
                    actionLabel: actionLabel || null,
                    actionUrl: actionUrl || null,
                    priority,
                    read: false,
                    timestamp: new Date()
                });
            });
            
            await batch.commit();
            batchCount++;
        }

        // 3. Log to admin-broadcast-log
        await db.collection('admin-broadcast-log').add({
            subject,
            body: msgBody,
            actionLabel: actionLabel || null,
            actionUrl: actionUrl || null,
            priority,
            filters,
            recipientCount: finalTargets.length,
            batchOps: batchCount,
            timestamp: new Date()
        });

        return NextResponse.json({ success: true, count: finalTargets.length });

    } catch (error: any) {
        console.error("Broadcast Execution Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
