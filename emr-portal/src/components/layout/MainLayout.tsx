"use client";

import React, { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Calendar, Video, User, LayoutDashboard, Settings,
    Plus, Briefcase, MessageSquare, CreditCard, Users, ChevronLeft, LogOut, ShoppingBag,
    Pill, Microscope, Scan, Bot, BarChart, ShieldCheck, ClipboardList, Activity, Clock, Database, DatabaseZap, ShieldAlert, Megaphone,
    ChevronDown, ChevronRight, Puzzle, Key, Network
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { GlobalNotificationDrawer } from '@/components/common/GlobalNotificationDrawer';
import { GlobalBanner } from '@/components/common/GlobalBanner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { GlobalSearch } from './GlobalSearch';
import { AITextarea } from '@/components/ui/AITextarea';
import { auth } from '@/lib/firebase';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserIdentityMenu } from '@/components/common/UserIdentityMenu';
import { apiFetchJson } from '@/lib/api-client';
import { PatientDetailResponse } from '@/lib/patient-registry-types';
import { usePracticeModules, initializeModulesListener } from '@/hooks/usePracticeModules';
import { SPECIALTY_MODULES } from '@/lib/module-registry';

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingNote, setBookingNote] = useState('');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeUser, setActiveUser] = useState<FirebaseUser | null>(auth.currentUser);

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'Clinical': true, 'CRM': true, 'Social': true, 'Orders & Rx': true,
        'Services': true, 'Specialty Modules': true, 'AI Tools': true,
        'Analytics': true, 'Admin': true, 'Integrations': true
    });

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('nav_expanded');
            if (saved) {
                setExpandedSections(JSON.parse(saved));
            }
        } catch (e) { }
    }, []);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const newState = { ...prev, [section]: !prev[section] };
            localStorage.setItem('nav_expanded', JSON.stringify(newState));
            return newState;
        });
    };

    const toggleAllSections = (expand: boolean) => {
        const sections = ['Clinical', 'CRM', 'Social', 'Orders & Rx', 'Services', 'Specialty Modules', 'AI Tools', 'Analytics', 'Admin', 'Integrations'];
        const newState = sections.reduce((acc, curr) => ({ ...acc, [curr]: expand }), {});
        setExpandedSections(newState);
        localStorage.setItem('nav_expanded', JSON.stringify(newState));
    };

    // Form State
    const [patient, setPatient] = useState('John Doe');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('10:00');
    const [type, setType] = useState('video');

    const router = useRouter();
    usePushNotifications(activeUser);

    const profile = useUserProfile();
    const patientDetailId = React.useMemo(() => {
        const match = pathname.match(/^\/patients\/([^/]+)$/);
        return match?.[1] ?? null;
    }, [pathname]);

    const patientHeaderQuery = useQuery({
        queryKey: ['patient-detail', activeUser?.uid ?? 'anonymous', patientDetailId],
        enabled: Boolean(patientDetailId && activeUser),
        staleTime: 60_000,
        queryFn: async () => {
            const payload = await apiFetchJson<PatientDetailResponse>(`/api/patients/${patientDetailId}`, {
                method: 'GET',
                user: activeUser
            });

            if (!payload.success || !payload.patient) {
                throw new Error(payload.error || 'Failed to load patient header.');
            }

            return payload.patient;
        }
    });

    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((nextUser) => {
            setActiveUser(nextUser);
        });

        const unsubModules = initializeModulesListener();

        return () => {
            unsubscribe();
            unsubModules();
        };
    }, []);

    const { enabledModules } = usePracticeModules();

    React.useEffect(() => {
        if (!profile.loading) {
            if (!profile.authenticated) {
                router.replace('/login');
            } else if (profile.normalizedRole !== 'provider') {
                router.replace('/patient');
            }
        }
    }, [profile, router]);


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

    if (profile.loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const pageTitle = (() => {
        if (pathname === '/dashboard') return 'Dashboard';
        if (patientHeaderQuery.data?.name) return patientHeaderQuery.data.name;

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0) return 'Dashboard';

        return segments
            .map((segment, index) => {
                if (index > 0 && /^[A-Za-z0-9_-]{10,}$/.test(segment)) {
                    return '';
                }

                return segment
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, (char) => char.toUpperCase());
            })
            .filter(Boolean)
            .join(' / ');
    })();

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white dark:text-slate-100">

            {/* SIDEBAR */}
            <aside
                className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-sidebar flex flex-col fixed inset-y-0 z-30 text-white shadow-xl transition-all duration-300 ease-in-out`}
            >
                {/* Logo Area */}
                <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'} border-b border-sidebar-active/50 relative`}>
                    {isSidebarCollapsed ? (
                        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center bg-gradient-to-br from-brand to-brand-600 shadow-lg shrink-0">
                            <span className="font-bold text-lg text-white">P</span>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg w-full max-w-[170px] flex items-center justify-center shadow-sm">
                            <img src="/logo.png" alt="Patriotic EHR" className="h-7 w-auto object-contain transition-opacity duration-300" />
                        </div>
                    )}

                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-500 shadow-sm hover:text-brand hover:border-brand transition-colors z-50 ${isSidebarCollapsed ? 'rotate-180 translate-x-8' : ''}`}
                    >
                        <ChevronLeft className="w-3 h-3" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 py-4 flex flex-col space-y-4 overflow-y-auto overflow-x-hidden custom-scrollbar`}>

                    {/* Expand/Collapse Toggle inside small margin */}
                    {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between px-6 pb-2 border-b border-sidebar-active/30 mb-2">
                            <span className="text-[10px] text-sidebar-muted uppercase tracking-widest font-black">Menu</span>
                            <div className="flex gap-2">
                                <button onClick={() => toggleAllSections(true)} className="text-[10px] font-bold text-sidebar-muted hover:text-white transition-colors" title="Expand All">
                                    Expand
                                </button>
                                <span className="text-sidebar-muted opacity-50">|</span>
                                <button onClick={() => toggleAllSections(false)} className="text-[10px] font-bold text-sidebar-muted hover:text-white transition-colors" title="Collapse All">
                                    Collapse
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={!isSidebarCollapsed ? "px-3 space-y-4" : "px-2 space-y-4"}>

                        {/* CLINICAL */}
                        <CollapsibleGroup label="Clinical" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Clinical']} onToggle={() => toggleSection('Clinical')}>
                            <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/dashboard'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/calendar" icon={Calendar} label="Calendar" active={pathname.startsWith('/calendar')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/patients" icon={User} label="Patients" active={pathname.startsWith('/patients')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/team" icon={Users} label="Team" active={pathname.startsWith('/team')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/inbox" icon={MessageSquare} label="Inbox / Messages" badge="3" active={pathname.startsWith('/inbox')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/waitlist" icon={Clock} label="Patient Waitlist" active={pathname.startsWith('/waitlist')} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* CRM */}
                        <CollapsibleGroup label="CRM" collapsed={isSidebarCollapsed} isExpanded={expandedSections['CRM']} onToggle={() => toggleSection('CRM')}>
                            <NavItem href="/crm" icon={Database} label="CRM Dashboard" active={pathname === '/crm'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/crm/patients" icon={User} label="Patients" active={pathname.startsWith('/crm/patients')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/crm/facilities" icon={Briefcase} label="Facilities" active={pathname.startsWith('/crm/facilities')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/crm/vendors" icon={Users} label="Vendors" active={pathname.startsWith('/crm/vendors')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/crm/campaigns" icon={BarChart} label="Campaigns" active={pathname.startsWith('/crm/campaigns')} collapsed={isSidebarCollapsed} />
                            <NavItem href="/crm/grants" icon={ClipboardList} label="Grant Proposals" active={pathname.startsWith('/crm/grants')} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* COMMUNITY */}
                        <CollapsibleGroup label="Social" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Social']} onToggle={() => toggleSection('Social')}>
                            <NavItem href="/community" icon={Users} label="Community Feed" active={pathname.startsWith('/community')} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* ORDERS & Rx */}
                        <CollapsibleGroup label="Orders & Rx" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Orders & Rx']} onToggle={() => toggleSection('Orders & Rx')}>
                            <NavItem href="/orders/erx" icon={Pill} label="eRx / Prescriptions" active={pathname === '/orders/erx'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/orders/labs" icon={Microscope} label="Lab Orders" active={pathname === '/orders/labs'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/orders/imaging" icon={Scan} label="Imaging Orders" active={pathname === '/orders/imaging'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/orders/pacs" icon={Scan} label="PACS" active={pathname === '/orders/pacs'} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* SERVICES */}
                        <CollapsibleGroup label="Services" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Services']} onToggle={() => toggleSection('Services')}>
                            <NavItem href="/services" icon={Briefcase} label="Services Catalog" active={pathname === '/services'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/book" icon={Video} label="Booking" active={pathname === '/book'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/billing" icon={CreditCard} label="Billing" active={pathname === '/billing'} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* SPECIALTY MODULES (DYNAMIC) */}
                        {enabledModules.length > 0 && (
                            <CollapsibleGroup label="Specialty Modules" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Specialty Modules']} onToggle={() => toggleSection('Specialty Modules')}>
                                {SPECIALTY_MODULES.filter(m => enabledModules.includes(m.id)).map(module => (
                                    <NavItem 
                                        key={module.id} 
                                        href={`/modules/${module.id}/${module.pages[0].id}`} 
                                        icon={module.icon} 
                                        label={module.name} 
                                        active={pathname.startsWith(`/modules/${module.id}`)} 
                                        collapsed={isSidebarCollapsed} 
                                    />
                                ))}
                            </CollapsibleGroup>
                        )}

                        {/* AI TOOLS */}
                        <CollapsibleGroup label="AI Tools" collapsed={isSidebarCollapsed} isExpanded={expandedSections['AI Tools']} onToggle={() => toggleSection('AI Tools')}>
                            <NavItem href="/ai/queue" icon={Bot} label="AI Action Queue" active={pathname === '/ai/queue'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/protocols" icon={ClipboardList} label="Protocols" active={pathname === '/protocols'} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* ANALYTICS */}
                        <CollapsibleGroup label="Analytics" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Analytics']} onToggle={() => toggleSection('Analytics')}>
                            <NavItem href="/analytics/clinical" icon={Activity} label="Clinical Dashboard" active={pathname === '/analytics/clinical'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/analytics/business" icon={BarChart} label="Business Dashboard" active={pathname === '/analytics/business'} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* ADMIN */}
                        <CollapsibleGroup label="Admin" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Admin']} onToggle={() => toggleSection('Admin')}>
                            <NavItem href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/modules" icon={Activity} label="Specialty Modules" active={pathname === '/admin/modules'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/community-moderation" icon={ShieldAlert} label="Community Moderation" active={pathname === '/admin/community-moderation'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/store" icon={ShoppingBag} label="Store Management" active={pathname === '/admin/store'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/communications" icon={Megaphone} label="Communications" active={pathname === '/admin/communications'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/users" icon={Users} label="User Management" active={pathname === '/admin/users'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/audit" icon={ShieldCheck} label="Audit Log" active={pathname === '/admin/audit'} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

                        {/* INTEGRATIONS HUB */}
                        <CollapsibleGroup label="Integrations" collapsed={isSidebarCollapsed} isExpanded={expandedSections['Integrations']} onToggle={() => toggleSection('Integrations')}>
                            <NavItem href="/admin/integrations" icon={Network} label="Integrations Hub" active={pathname === '/admin/integrations'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/integrations/doxy" icon={Video} label="Doxy.me" active={pathname === '/admin/integrations/doxy'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/integrations/radiantlogiq" icon={DatabaseZap} label="RadiantLogiq" active={pathname === '/admin/integrations/radiantlogiq'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/integrations/powerscribe" icon={Activity} label="PowerScribe 360" active={pathname === '/admin/integrations/powerscribe'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/integrations/radai" icon={Bot} label="Rad AI" active={pathname === '/admin/integrations/radai'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/integrations/plugins" icon={Puzzle} label="Plugins & Extensions" active={pathname === '/admin/integrations/plugins'} collapsed={isSidebarCollapsed} />
                            <NavItem href="/admin/integrations/apis" icon={Key} label="API Keys" active={pathname === '/admin/integrations/apis'} collapsed={isSidebarCollapsed} />
                        </CollapsibleGroup>

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

                    <UserIdentityMenu collapsed={isSidebarCollapsed} />
                </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out`}>

                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-800 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm/50 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 capitalize">
                            {pageTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:block">
                            <GlobalSearch />
                        </div>

                        <button
                            onClick={async () => {
                                await auth.signOut();
                                router.push('/login');
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden lg:inline">Sign Out</span>
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>

                        <ThemeToggle />

                        <GlobalNotificationDrawer />

                        <button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="bg-brand hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 hover:shadow-md hover:shadow-brand/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New</span>
                        </button>
                    </div>
                </header>

                <GlobalBanner surface="emr" />

                {/* Page Content */}
                <div className="flex-1 p-8 overflow-y-auto animate-fade-in relative">
                    {children}
                </div>

            </main>

            {/* BOOKING MODAL OVERLAY */}
            {
                isBookingModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
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
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300 mb-1">Patient</label>
                                    <select
                                        value={patient}
                                        onChange={(e) => setPatient(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                    >
                                        <option value="John Doe">John Doe</option>
                                        <option value="Sarah Connor">Sarah Connor</option>
                                        <option value="Michael Brown">Michael Brown</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300 mb-1">Time</label>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300 mb-1">Visit Type</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setType('video')}
                                            className={`flex-1 py-2 px-3 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'video'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800'
                                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                }`}
                                        >
                                            <Video className="w-4 h-4" /> Video Call
                                        </button>
                                        <button
                                            onClick={() => setType('person')}
                                            className={`flex-1 py-2 px-3 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${type === 'person'
                                                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800'
                                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                                }`}
                                        >
                                            <User className="w-4 h-4" /> In-Person
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300 mb-1">Notes</label>
                                    <AITextarea 
                                        value={bookingNote}
                                        onValueChange={setBookingNote}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-100 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none transition-shadow" 
                                        placeholder="Reason for visit..."
                                    />
                                </div>
                            </div>

                            <div className="p-6 pt-0 flex gap-3">
                                <button onClick={() => setIsBookingModalOpen(false)} className="flex-1 py-2.5 text-slate-600 dark:text-slate-300 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
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
                ? 'bg-sidebar-active text-sidebar-foreground font-medium shadow-inner shadow-black/20'
                : 'text-sidebar-muted font-medium hover:bg-sidebar-hover hover:text-sidebar-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? label : ''}
        >
            {active && !collapsed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-r-full"></div>}

            <Icon className={`w-5 h-5 relative z-10 transition-colors shrink-0 ${active ? 'text-white' : 'group-hover:text-white'}`} />

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

function CollapsibleGroup({ label, collapsed, isExpanded, onToggle, children }: any) {
    if (collapsed) {
        return (
            <div className="space-y-1 mb-4">
                <NavSection label={label} collapsed={collapsed} />
                {children}
            </div>
        );
    }
    return (
        <div className="space-y-1 mb-4">
            <NavSection label={label} collapsed={collapsed} isExpanded={isExpanded} onToggle={onToggle} />
            <div 
                className={`grid transition-all duration-300 ease-in-out ${isExpanded === false ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
            >
                <div className="overflow-hidden space-y-1">
                    {children}
                </div>
            </div>
        </div>
    );
}

function NavSection({ label, collapsed, isExpanded, onToggle }: { label: string, collapsed: boolean, isExpanded?: boolean, onToggle?: () => void }) {
    if (collapsed) {
        return <div className="my-2 h-px bg-sidebar-hover/80 mx-2"></div>;
    }
    return (
        <div 
            className="flex items-center justify-between px-3 pt-3 pb-1 cursor-pointer group select-none"
            onClick={onToggle}
            title={onToggle ? `Toggle ${label}` : undefined}
        >
            <span className="text-[10px] font-black text-sidebar-muted uppercase tracking-widest leading-none group-hover:text-white transition-colors duration-200">
                {label}
            </span>
            {onToggle && (
                <span className="text-sidebar-muted group-hover:text-white transition-transform duration-200 flex items-center justify-center">
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                </span>
            )}
        </div>
    );
}
