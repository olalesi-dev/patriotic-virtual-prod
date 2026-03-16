import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!db) {
            throw new Error('Firebase Admin not initialized');
        }
        
        const docRef = await db.collection('settings').doc('doxy_integration').get();
        let data = {};
        
        if (docRef.exists) {
            data = docRef.data() || {};
        } else {
            // Defaults
            data = {
                doxyUrl: 'https://PVT.doxy.me/patrioticvirtualtelehealth',
                isActive: true,
                clinicName: 'Patriotic Virtual Telehealth'
            };
            await db.collection('settings').doc('doxy_integration').set(data);
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error getting Doxy config:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        if (!auth || !db) {
            throw new Error('Firebase Admin not initialized');
        }
        const body = await request.json();
        
        const updateData = {
            doxyUrl: body.doxyUrl || 'https://PVT.doxy.me/patrioticvirtualtelehealth',
            isActive: body.isActive !== false,
            clinicName: body.clinicName || 'Patriotic Virtual Telehealth',
            updatedAt: new Date()
        };

        await db.collection('settings').doc('doxy_integration').set(updateData, { merge: true });

        return NextResponse.json({
            success: true,
            message: 'Doxy integration updated successfully',
            data: updateData
        });
    } catch (error: any) {
        console.error('Error updating Doxy config:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
