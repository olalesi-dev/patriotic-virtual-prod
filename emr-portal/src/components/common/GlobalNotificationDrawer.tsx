"use client";

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Bell, X, ExternalLink, CalendarClock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface BroadcastNotification {
    id: string;
    subject: string;
    body: string;
    actionLabel?: string;
    actionUrl?: string;
    priority: 'Normal' | 'High';
    read: boolean;
    timestamp: any;
}

export function GlobalNotificationDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();

    useEffect(() => {
        let unsubNotifs = () => {};

        const unsubAuth = auth.onAuthStateChanged(user => {
            unsubNotifs();

            if (user) {
                const q = query(
                    collection(db, 'users', user.uid, 'notifications'),
                    orderBy('timestamp', 'desc')
                );

                unsubNotifs = onSnapshot(q, (snapshot) => {
                    const loaded: BroadcastNotification[] = [];
                    let unread = 0;
                    
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            if (!data.read && data.priority === 'High') {
                                toast.error(data.subject, { 
                                    description: data.body,
                                    duration: 10000,
                                    icon: <Bell className="w-5 h-5" />
                                });
                            }
                        }
                    });

                    snapshot.docs.forEach(docSnap => {
                        const data = docSnap.data() as BroadcastNotification;
                        loaded.push({ ...data, id: docSnap.id });
                        if (!data.read) unread++;
                    });
                    
                    setNotifications(loaded);
                    setUnreadCount(unread);
                });
            } else {
                setNotifications([]);
                setUnreadCount(0);
            }
        });

        return () => {
            unsubAuth();
            unsubNotifs();
        };
    }, []);

    const handleNotificationClick = async (notif: BroadcastNotification) => {
        if (!auth.currentUser) return;
        
        if (!notif.read) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid, 'notifications', notif.id), { read: true });
        }

        if (notif.actionUrl) {
            setIsOpen(false);
            if (notif.actionUrl.startsWith('http')) {
                window.open(notif.actionUrl, '_blank');
            } else {
                router.push(notif.actionUrl);
            }
        }
    };

    return (
        <div className="relative isolate z-[100]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm animate-in zoom-in">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[120]">
                    <button
                        type="button"
                        aria-label="Close notifications"
                        onClick={() => setIsOpen(false)}
                        className="absolute inset-0 cursor-default bg-transparent"
                    />

                    <div className="absolute top-0 right-0 h-full w-[400px] max-w-[90vw] border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-900/50">
                            <header className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div>
                                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                                        <Bell className="w-5 h-5 text-indigo-500" /> Notifications
                                    </h2>
                                    <p className="text-xs font-medium text-slate-500">Stay updated on alerts & announcements.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-xl bg-slate-100 p-2 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </header>

                            <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
                                {notifications.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center space-y-4 text-slate-400 opacity-50">
                                        <CalendarClock className="w-12 h-12" />
                                        <p className="font-bold">You're all caught up!</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div 
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`relative cursor-pointer rounded-2xl border p-5 transition-all group ${!notif.read ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 shadow-md shadow-indigo-100/50 dark:shadow-indigo-900/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'}`}
                                        >
                                            {!notif.read && (
                                                <div className="absolute top-5 right-5 h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                            )}
                                            <div className="mb-1 flex items-center gap-2 pr-6">
                                                {notif.priority === 'High' && (
                                                    <span className="shrink-0 rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">Priority</span>
                                                )}
                                                <h4 className={`truncate text-sm font-bold ${!notif.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {notif.subject}
                                                </h4>
                                            </div>
                                            <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                                {notif.body}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    {notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                                </div>
                                                {notif.actionLabel && (
                                                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400">
                                                        {notif.actionLabel} <ExternalLink className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
