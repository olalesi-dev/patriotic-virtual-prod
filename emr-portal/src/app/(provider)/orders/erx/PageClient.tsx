'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pill, Bell } from 'lucide-react';
import { DoseSpotFrame } from '@/components/telehealth/DoseSpotFrame';
import { auth } from '@/lib/firebase';
import { apiFetchJson } from '@/lib/api-client';
import { getDoseSpotApiUrl } from '@/lib/dosespot-client';

export default function ErxPage() {
    const searchParams = useSearchParams();
    const patientIdParam = searchParams.get('patientId');
    const patientDoseSpotId = patientIdParam ? parseInt(patientIdParam, 10) : undefined;

    const [notificationCount, setNotificationCount] = useState<number>(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchNotifications = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const data = await apiFetchJson<{ total?: number }>(getDoseSpotApiUrl('/api/v1/dosespot/notification-count'), {
                    user
                });

                setNotificationCount(data.total || 0);
            } catch (error) {
                console.error('Failed to fetch dosespot notification count:', error);
            }
        };

        fetchNotifications();
        interval = setInterval(fetchNotifications, 60_000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-10">
            {/* Header Row */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
                        <Pill className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">E-Prescribing</h1>
                        <p className="text-sm font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Powered by DoseSpot</p>
                    </div>
                </div>

                {/* Notification Badge */}
                <div className="relative flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Bell className="w-6 h-6 text-slate-600 dark:text-slate-300 dark:text-slate-400" />
                    {notificationCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-in zoom-in">
                            {notificationCount > 99 ? '99+' : notificationCount}
                        </div>
                    )}
                </div>
            </div>

            {/* DoseSpot Frame Container */}
            <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden w-full">
                <DoseSpotFrame 
                    patientDoseSpotId={patientDoseSpotId} 
                    refillsErrors={false} 
                    height="85vh" 
                />
            </div>
        </div>
    );
}
