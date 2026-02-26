"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Search, Calendar, Video, User, Bell, LayoutDashboard, FileText, Settings,
    Plus, Briefcase, MessageSquare, CreditCard, Users, ChevronLeft, ChevronRight, Menu, LogOut,
    Pill, Microscope, Scan, Bot, BarChart, TrendingUp, ShieldCheck, ClipboardList, Activity
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { GlobalSearch } from './GlobalSearch';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Form State
    const [patient, setPatient] = useState('John Doe');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('10:00');
    const [type, setType] = useState('video');

    const [userProfile, setUserProfile] = useState<any>(null);

    const router = useRouter();

    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                let profileData: any = {
                    name: user.displayName || 'Provider',
                    role: 'Clinician'
                };

                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        profileData = { ...profileData, ...userSnap.data() };
                    } else {
                        // Fallback check against patients collection
                        const patientRef = doc(db, 'patients', user.uid);
                        const patientSnap = await getDoc(patientRef);
                        if (patientSnap.exists()) {
                            const data = patientSnap.data();
                            profileData = { ...profileData, ...data };
                            if (!profileData.name && data.firstName && data.lastName) {
                                profileData.name = `${data.firstName} ${data.lastName}`;
                            } else if (!profileData.name && data.firstName) {
                                profileData.name = data.firstName;
                            }
                            profileData.role = 'Patient (Testing Provider View)';
                        }
                    }
                } catch (e) {
                    console.error("Error fetching user profile", e);
                }

                setUserProfile(profileData);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const getInitials = (name: string) => {
        if (!name) return 'PR';
        const parts = name.trim().split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/login');
    };

    const handleSchedule = () => {
        const newAppointment = {
            id: Date.now(),
            patient,
            date,
            time,
            type,
            status: 'Scheduled'
        };

        const existing = JSON.parse(localStorage.getItem('emr_appointments') || '[]');
        localStorage.setItem('emr_appointments', JSON.stringify([...existing, newAppointment]));

        setIsBookingModalOpen(false);
        if (pathname !== '/calendar') {
            router.push('/calendar');
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">

            {/* SIDEBAR */}
            <aside
                className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-sidebar flex flex-col fixed inset-y-0 z-30 text-white shadow-xl transition-all duration-300 ease-in-out`}
            >
                {/* Logo Area */}
                <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'} border-b border-sidebar-active/50 relative`}>
                    <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shrink-0">
                        <span className="font-bold text-lg text-white">P</span>
                    </div>
                    {!isSidebarCollapsed && (
                        <span className="font-bold text-lg tracking-tight ml-3 whitespace-nowrap overflow-hidden transition-opacity duration-300">Patriotic EMR</span>
                    )}

                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-sm hover:text-brand hover:border-brand transition-colors z-50 ${isSidebarCollapsed ? 'rotate-180 translate-x-8' : ''}`}
                    >
                        <ChevronLeft className="w-3 h-3" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 py-6 ${isSidebarCollapsed ? 'px-2' : 'px-3'} space-y-4 overflow-y-auto overflow-x-hidden scrollbar-hide`}>

                    {/* CLINICAL */}
                    <div className="space-y-1">
                        <NavSection label="Clinical" collapsed={isSidebarCollapsed} />
                        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/dashboard'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/calendar" icon={Calendar} label="Calendar" active={pathname === '/calendar'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/patients" icon={User} label="Patients" active={pathname.startsWith('/patients')} collapsed={isSidebarCollapsed} />
                        <NavItem href="/patient-search" icon={Search} label="Patient Search" active={pathname === '/patient-search'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/inbox" icon={MessageSquare} label="Inbox / Messages" badge="3" active={pathname === '/inbox'} collapsed={isSidebarCollapsed} />
                    </div>

                    {/* ORDERS & Rx */}
                    <div className="space-y-1">
                        <NavSection label="Orders & Rx" collapsed={isSidebarCollapsed} />
                        <NavItem href="/orders/erx" icon={Pill} label="eRx / Prescriptions" active={pathname === '/orders/erx'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/orders/labs" icon={Microscope} label="Lab Orders" active={pathname === '/orders/labs'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/orders/imaging" icon={Scan} label="Imaging Orders" active={pathname === '/orders/imaging'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/orders/pacs" icon={Scan} label="PACS" active={pathname === '/orders/pacs'} collapsed={isSidebarCollapsed} />
                    </div>

                    {/* SERVICES */}
                    <div className="space-y-1">
                        <NavSection label="Services" collapsed={isSidebarCollapsed} />
                        <NavItem href="/services" icon={Briefcase} label="Services Catalog" active={pathname === '/services'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/book" icon={Video} label="Booking" active={pathname === '/book'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/billing" icon={CreditCard} label="Billing" active={pathname === '/billing'} collapsed={isSidebarCollapsed} />
                    </div>

                    {/* AI TOOLS */}
                    <div className="space-y-1">
                        <NavSection label="AI Tools" collapsed={isSidebarCollapsed} />
                        <NavItem href="/ai/queue" icon={Bot} label="AI Action Queue" active={pathname === '/ai/queue'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/protocols" icon={ClipboardList} label="Protocols" active={pathname === '/protocols'} collapsed={isSidebarCollapsed} />
                    </div>

                    {/* ANALYTICS */}
                    <div className="space-y-1">
                        <NavSection label="Analytics" collapsed={isSidebarCollapsed} />
                        <NavItem href="/analytics/clinical" icon={Activity} label="Clinical Dashboard" active={pathname === '/analytics/clinical'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/analytics/business" icon={BarChart} label="Business Dashboard" active={pathname === '/analytics/business'} collapsed={isSidebarCollapsed} />
                    </div>

                    {/* ADMIN */}
                    <div className="space-y-1">
                        <NavSection label="Admin" collapsed={isSidebarCollapsed} />
                        <NavItem href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/admin/users" icon={Users} label="User Management" active={pathname === '/admin/users'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/admin/audit" icon={ShieldCheck} label="Audit Log" active={pathname === '/admin/audit'} collapsed={isSidebarCollapsed} />
                    </div>

                </nav>

                {/* Bottom Action */}
                <div className={`p-4 border-t border-sidebar-active/30 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                    {!isSidebarCollapsed ? (
                        <button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 font-medium py-2.5 rounded-lg transition-colors border border-indigo-500/20 mb-4 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95 duration-200 whitespace-nowrap overflow-hidden"
                        >
                            <Video className="w-4 h-4 shrink-0" />
                            <span>Schedule Call</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="w-10 h-10 flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 rounded-lg transition-colors border border-indigo-500/20 mb-4 hover:shadow-lg active:scale-95 duration-200"
                            title="Schedule Call"
                        >
                            <Video className="w-5 h-5" />
                        </button>
                    )}

                    <div
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 cursor-pointer transition-colors group ${isSidebarCollapsed ? 'justify-center p-0' : ''}`}
                        title="Sign Out"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm shadow-md group-hover:bg-red-500 text-white transition-colors shrink-0">
                            {getInitials(userProfile?.name)}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-medium truncate transition-colors">{userProfile?.name || 'Provider'}</div>
                                <div className="text-xs text-slate-400 group-hover:text-red-400/80 truncate">{userProfile?.role || 'Clinician'}</div>
                            </div>
                        )}
                        {!isSidebarCollapsed && (
                            <LogOut className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out`}>

                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm/50 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
                            {pathname === '/dashboard' ? 'Dashboard' : pathname.replace('/', '')}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:block">
                            <GlobalSearch />
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden lg:inline">Sign Out</span>
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

                        <ThemeToggle />

                        <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors relative hover:text-brand">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                        </button>

                        <button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="bg-brand hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 hover:shadow-md hover:shadow-brand/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New</span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-8 overflow-y-auto animate-fade-in relative">
                    {children}
                </div>

            </main>

            {/* BOOKING MODAL OVERLAY */}
            {
                isBookingModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">New Telehealth Visit</h3>
                                    <p className="text-indigo-200 text-sm mt-1">Schedule a video call with a patient.</p>
                                </div>
                                <button onClick={() => setIsBookingModalOpen(false)} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors">
                                    <Plus className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Patient</label>
                                    <select
                                        value={patient}
                                        onChange={(e) => setPatient(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                    >
                                        <option value="John Doe">John Doe</option>
                                        <option value="Sarah Connor">Sarah Connor</option>
                                        <option value="Michael Brown">Michael Brown</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Time</label>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Visit Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setType('video')}
                                            className={`flex-1 py-2 px-3 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'video'
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-2'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <Video className="w-4 h-4" /> Video Call
                                        </button>
                                        <button
                                            onClick={() => setType('person')}
                                            className={`flex-1 py-2 px-3 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'person'
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-2'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <User className="w-4 h-4" /> In-Person
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Notes</label>
                                    <textarea className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none transition-shadow" placeholder="Reason for visit..."></textarea>
                                </div>
                            </div>

                            <div className="p-6 pt-0 flex gap-3">
                                <button onClick={() => setIsBookingModalOpen(false)} className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSchedule}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95"
                                >
                                    Schedule Visit
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}

function NavItem({ href, icon: Icon, label, active, badge, collapsed }: any) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-all group relative overflow-hidden ${active
                ? 'bg-sidebar-active text-white font-medium shadow-inner shadow-black/20'
                : 'text-slate-400 font-medium hover:bg-sidebar-hover hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? label : ''}
        >
            {active && !collapsed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-r-full"></div>}

            <Icon className={`w-5 h-5 relative z-10 transition-colors shrink-0 ${active ? 'text-indigo-400' : 'group-hover:text-indigo-300'}`} />

            {!collapsed && (
                <>
                    <span className="flex-1 relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
                    {badge && (
                        <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md relative z-10 shadow-sm">
                            {badge}
                        </span>
                    )}
                </>
            )}

            {collapsed && badge && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 border border-sidebar rounded-full z-20"></span>
            )}
        </Link>
    )
}

function NavSection({ label, collapsed }: { label: string, collapsed: boolean }) {
    if (collapsed) {
        return <div className="h-px bg-slate-700/50 my-2 mx-2"></div>;
    }
    return (
        <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                {label}
            </span>
        </div>
    );
}
