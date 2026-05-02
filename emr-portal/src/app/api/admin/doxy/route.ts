import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const CANONICAL_DOXY_URL = 'https://pvt.doxy.me/virtualtelehealth';

function isStaleDoxyUrl(url: string): boolean {
    if (!url) return true;
    // Old check-in widget URL, random per-visit URLs, or any non-PVT clinic URLs
    return (
        url.includes('check-in') ||
        url.includes('doxy.me/patriotic-visit-') ||
        url.includes('doxy.me/patrioticvirtualtelehealth') ||
        url === 'https://doxy.me/patrioticvirtualtelehealth' ||
        (url.includes('doxy.me') && !url.toLowerCase().startsWith('https://pvt.doxy.me'))
    );
}

export async function GET() {
    try {
        if (!db) {
            throw new Error('Firebase Admin not initialized');
        }
        
        const docRef = await db.collection('settings').doc('doxy_integration').get();
        let data: Record<string, any> = {};
        
        if (docRef.exists) {
            data = docRef.data() || {};
        } else {
            data = {
                doxyUrl: CANONICAL_DOXY_URL,
                isActive: true,
                clinicName: 'Patriotic Virtual Telehealth'
            };
            await db.collection('settings').doc('doxy_integration').set(data);
        }

        // Self-heal: if the stored URL is any stale variant, correct it in-place
        if (isStaleDoxyUrl(data.doxyUrl)) {
            data.doxyUrl = CANONICAL_DOXY_URL;
            await db.collection('settings').doc('doxy_integration').set(
                { doxyUrl: CANONICAL_DOXY_URL },
                { merge: true }
            );
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
            doxyUrl: body.doxyUrl || CANONICAL_DOXY_URL,
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
