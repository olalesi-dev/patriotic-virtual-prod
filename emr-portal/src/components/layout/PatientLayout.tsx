"use client";

import React, { useState, useEffect, useRef } from 'react';
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
    Search,
    Pill,
    Activity,
    CheckCircle2,
    Clock,
    AlertCircle,
    Users,
    ShoppingBag,
    ShoppingCart,
    Gift
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { UserIdentityMenu } from '@/components/common/UserIdentityMenu';
import { ConsentModal } from '@/components/patient/ConsentModal';
import { useCart } from '@/hooks/useCart';
import { CartDrawer } from '@/components/shop/CartDrawer';


export function PatientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);
    const [activeUser, setActiveUser] = useState(auth.currentUser);
    const notifRef = useRef<HTMLDivElement>(null);
    // Direct Firebase Auth user — always has the real displayName (set during signup)
    const authUser = activeUser;
    const cart = useCart();

    const profile = useUserProfile();
    const {
        notifications,
        unreadCount: notificationUnreadCount,
        markRead
    } = useNotifications({
        limit: 8,
        toastOnNew: true
    });

    usePushNotifications(activeUser);

    // Derive the display name: prefer direct Firebase Auth, then hook, then email prefix
    const getDisplayName = () => {
        const authName = authUser?.displayName;
        const hookName = profile.displayName;
        const email = authUser?.email || profile.email;
        if (authName && authName !== 'Unknown' && authName.trim()) return authName.trim();
        if (hookName && hookName !== 'Unknown' && hookName.trim()) return hookName.trim();
        if (email) {
            const prefix = email.split('@')[0];
            return prefix.charAt(0).toUpperCase() + prefix.slice(1);
        }
        return 'Patient';
    };
    const displayName = getDisplayName();
    const firstName = displayName.split(' ')[0];
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'P';

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((u) => {
            setActiveUser(u);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!profile.loading) {
            if (!profile.authenticated) {
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

        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);

        const setupListeners = (uid: string) => {
            const q = query(collection(db, 'threads'), where('patientId', '==', uid));
            unsubThreads = onSnapshot(q, (snapshot) => {
                const total = snapshot.docs.reduce((acc, d) => acc + (d.data().unreadCount || 0), 0);
                setUnreadCount(total);
            });
        };

        if (auth.currentUser) {
            setupListeners(auth.currentUser.uid);
        } else {
            const unsub = auth.onAuthStateChanged(user => {
                if (user) setupListeners(user.uid);
            });
            return () => {
                unsub();
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }

        return () => {
            unsubThreads?.();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    const navigation = [
        { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
        { name: 'My Schedule', href: '/patient/scheduled', icon: CheckCircle2 },
        { name: 'My Appointments', href: '/patient/appointments', icon: FileText },
        { name: 'Calendar', href: '/patient/calendar', icon: Calendar },
        { name: 'Messages', href: '/patient/messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount.toString() : undefined },
        { name: 'Community Feed', href: '/patient/community', icon: Users },
        { name: 'Medications', href: '/my-health/medications', icon: Pill },
        { name: 'Refer & Earn', href: '/patient/referrals', icon: Gift },
        { name: 'Lab Results', href: '/my-health/labs', icon: Activity },
        { name: 'Imaging', href: '/my-health/imaging', icon: FileText },
        { name: 'Billing', href: '/patient/billing', icon: CreditCard },
        { name: 'Settings', href: '/patient/settings', icon: Settings },
    ];


    if (profile.loading) {
        return (
            <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-[#0EA5E9] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F9FF] flex">
            {/* Privacy & Consent Gate — shown once on first login */}
            <ConsentModal />
            {/* MOBILE SIDEBAR OVERLAY */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo */}
                <div className="h-20 flex items-center px-8 border-b border-slate-50 pt-2">
                    <img src="/logo.png" alt="Patriotic EHR" className="h-10 w-auto object-contain" />
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
                <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-700 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            className="p-2 -ml-2 lg:hidden text-slate-400"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight hidden sm:block">
                            Welcome back, <span className="text-[#0EA5E9]">{firstName}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-2 mr-4 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                            <Search className="w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Search medical records..."
                                className="bg-transparent border-none text-xs font-bold focus:ring-0 placeholder:text-slate-300 w-48"
                            />
                        </div>

                        {/* Cart Button */}
                        <button
                            onClick={() => cart.toggleCart()}
                            className="p-2.5 text-slate-400 hover:text-[#0EA5E9] hover:bg-sky-50 rounded-xl transition-all relative"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {cart.getCartCount() > 0 && (
                                <span className="absolute top-1.5 right-1.5 min-w-[12px] h-[12px] bg-[#0EA5E9] rounded-full border border-white text-[8px] flex items-center justify-center font-bold text-white shadow-sm px-0.5" >
                                    {cart.getCartCount()}
                                </span>
                            )}
                        </button>

                        {/* Notification Bell */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setNotifOpen(!notifOpen)}
                                className="p-2.5 text-slate-400 hover:text-[#0EA5E9] hover:bg-sky-50 rounded-xl transition-all relative"
                            >
                                <Bell className="w-5 h-5" />
                                {notificationUnreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                                )}
                            </button>

                            {notifOpen && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                                    <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">Notifications</h3>
                                        <button onClick={() => setNotifOpen(false)} className="text-slate-300 hover:text-slate-500 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-slate-400 text-sm italic">All caught up! No new notifications.</div>
                                        ) : notifications.map((notification) => (
                                            <Link key={notification.id} href={notification.href || '/patient/messages'} onClick={() => {
                                                if (!notification.read) {
                                                    void markRead(notification.id);
                                                }
                                                setNotifOpen(false);
                                            }}
                                                className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors group">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${notification.type === 'message_received' ? 'bg-indigo-50 text-indigo-500' :
                                                    notification.type === 'appointment_booked' ? 'bg-emerald-50 text-emerald-600' :
                                                        notification.type === 'appointment_reminder' ? 'bg-sky-50 text-sky-500' :
                                                            notification.type === 'appointment_cancelled' || notification.type === 'appointment_rescheduled' ? 'bg-amber-50 text-amber-500' :
                                                                'bg-sky-50 text-sky-500'
                                                    }`}>
                                                    {notification.type === 'message_received' && <MessageSquare className="w-4 h-4" />}
                                                    {notification.type === 'appointment_booked' && <CheckCircle2 className="w-4 h-4" />}
                                                    {notification.type === 'appointment_reminder' && <Clock className="w-4 h-4" />}
                                                    {(notification.type === 'appointment_cancelled' || notification.type === 'appointment_rescheduled') && <Clock className="w-4 h-4" />}
                                                    {notification.type !== 'message_received' && notification.type !== 'appointment_booked' && notification.type !== 'appointment_reminder' && notification.type !== 'appointment_cancelled' && notification.type !== 'appointment_rescheduled' && <ShieldCheck className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight mb-0.5">{notification.title}</p>
                                                    <p className="text-[11px] text-slate-400 leading-snug">{notification.body}</p>
                                                    <p className="text-[10px] text-slate-300 mt-1 font-bold uppercase tracking-widest">
                                                        {new Date(notification.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center">
                                        <Link href="/patient/messages" onClick={() => setNotifOpen(false)}
                                            className="text-[11px] font-black text-[#0EA5E9] uppercase tracking-widest hover:underline">
                                            View All Activity →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-8 w-px bg-slate-100 mx-2" />
                        <div className="flex items-center gap-1 text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure
                        </div>
                    </div>

                </header>

                {/* Content area */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                        <CartDrawer />
                    </div>
                </main>
            </div>
        </div>
    );
}
