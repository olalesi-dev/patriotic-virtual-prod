"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    MessageSquare,
    FileText,
    CreditCard,
    Settings,
    LogOut,
    Bell,
    Menu,
    X,
    User,
    ShieldCheck,
    ChevronRight,
    Search,
    Pill,
    Activity
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserIdentityMenu } from '@/components/common/UserIdentityMenu';

export function PatientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const profile = useUserProfile(auth.currentUser);

    useEffect(() => {
        if (!profile.loading) {
            if (!auth.currentUser) {
                if (!['/login', '/signup', '/forgot-password'].includes(pathname)) {
                    router.replace('/login');
                }
            } else if (profile.normalizedRole !== 'patient') {
                router.replace('/dashboard');
            }
        }
    }, [profile, pathname, router]);

    useEffect(() => {
        let unsubThreads: any;

        if (auth.currentUser) {
            const q = query(collection(db, 'threads'), where('patientId', '==', auth.currentUser.uid));
            unsubThreads = onSnapshot(q, (snapshot) => {
                const total = snapshot.docs.reduce((acc, d) => acc + (d.data().unreadCount || 0), 0);
                setUnreadCount(total);
            });
        }

        return () => {
            if (unsubThreads) unsubThreads();
        };
    }, []);


    const navigation = [
        { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
        { name: 'My Appointments', href: '/patient/appointments', icon: Calendar },
        { name: 'Messages', href: '/patient/messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount.toString() : undefined },
        { name: 'Medications', href: '/my-health/medications', icon: Pill },
        { name: 'Lab Results', href: '/my-health/labs', icon: Activity },
        { name: 'Imaging', href: '/my-health/imaging', icon: FileText },
        { name: 'Billing', href: '/patient/billing', icon: CreditCard },
        { name: 'Settings', href: '/patient/settings', icon: Settings },
    ];

    if (profile.loading) {
        return (
            <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0EA5E9] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F9FF] flex">
            {/* MOBILE SIDEBAR OVERLAY */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo */}
                <div className="h-20 flex items-center px-8 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0EA5E9] rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
                            <span className="text-white font-black italic text-xl">P</span>
                        </div>
                        <span className="font-black text-slate-800 tracking-tight text-xl">Patriotic</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`
                                    flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all group
                                    ${isActive
                                        ? 'bg-sky-50 text-[#0EA5E9]'
                                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-[#0EA5E9]' : 'text-slate-300 group-hover:text-slate-400'}`} />
                                    <span>{item.name}</span>
                                </div>
                                {item.badge && (
                                    <span className="bg-[#0EA5E9] text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-sky-200">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile info */}
                <UserIdentityMenu />
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            className="p-2 -ml-2 lg:hidden text-slate-400"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block">
                            Welcome back, <span className="text-[#0EA5E9]">{profile.displayName.split(' ')[0]}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-2 mr-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <Search className="w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Search medical records..."
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 placeholder:text-slate-300 w-48"
                            />
                        </div>

                        <button className="p-2.5 text-slate-400 hover:text-[#0EA5E9] hover:bg-sky-50 rounded-xl transition-all relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="h-8 w-px bg-slate-100 mx-2"></div>

                        <div className="flex items-center gap-1 text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure
                        </div>
                    </div>
                </header>

                {/* Content area */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
