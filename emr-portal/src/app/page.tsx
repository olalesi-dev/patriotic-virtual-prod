"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function RootDispatcher() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Check Firestore for role
                    const docRef = doc(db, 'patients', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const role = data.role?.toLowerCase();

                        if (role === 'patient') {
                            router.replace('/patient');
                        } else {
                            // Admins, Providers, etc. go to the EMR dashboard
                            router.replace('/dashboard');
                            // WAIT: If I moved the provider page to (provider), 
                            // the root '/' will hit THIS dispatcher again if I'm not careful.
                            // Actually, in Next.js, (provider)/page.tsx DOES match '/'
                            // but since src/app/page.tsx also exists, there's a conflict.
                        }
                    } else {
                        // Default to provider side or login
                        router.replace('/login');
                    }
                } catch (error) {
                    console.error('Dispatch error:', error);
                    router.replace('/login');
                }
            } else {
                router.replace('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Verifying Session...</p>
            </div>
        </div>
    );
}
