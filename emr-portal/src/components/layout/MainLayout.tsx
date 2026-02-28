"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import {
    Activity, BarChart, Bot, Briefcase, Calendar, ChevronLeft, ChevronRight,
    ClipboardList, CreditCard, FileText, LayoutDashboard, LogOut, Menu, MessageSquare,
    Microscope, Pill, Plus, Scan, Search, Settings, ShieldCheck, TrendingUp, User,
    Users, Video
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ProviderNotificationBell } from '@/components/common/ProviderNotificationBell';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import {
    PROVIDER_APPOINTMENT_CREATED_EVENT,
    type ProviderDashboardAppointmentEventPayload
} from '@/lib/dashboard-events';
import { auth, db } from '@/lib/firebase';
import { GlobalSearch } from './GlobalSearch';

interface BookingPatientOption {
    id: string;
    name: string;
    email: string | null;
}

const scheduleVisitSchema = z.object({
    patientId: z.string().trim().min(1, 'Please select a patient.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date is required.'),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Valid time is required.'),
    visitType: z.enum(['video', 'in_person']),
    notes: z.string().trim().min(2, 'Please add visit notes.').max(500)
}).superRefine((values, ctx) => {
    const scheduledAt = new Date(`${values.date}T${values.time}:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Invalid date/time.', path: ['date'] });
        return;
    }
    if (scheduledAt.getTime() < Date.now() - 60_000) {
        ctx.addIssue({ code: 'custom', message: 'Visit must be in the future.', path: ['date'] });
    }
});

type ScheduleVisitValues = z.infer<typeof scheduleVisitSchema>;

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [bookingPatients, setBookingPatients] = useState<BookingPatientOption[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);

    const [userProfile, setUserProfile] = useState<any>(null);
    const [providerUnreadCount, setProviderUnreadCount] = useState(0);
    const threadUnreadSnapshotRef = useRef<Record<string, number>>({});
    const hasHydratedProviderThreadsRef = useRef(false);

    const router = useRouter();
    const scheduleForm = useForm<ScheduleVisitValues>({
        resolver: zodResolver(scheduleVisitSchema),
        defaultValues: {
            patientId: '',
            date: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            time: '10:00',
            visitType: 'video',
            notes: ''
        }
    });

    const asNonEmptyString = (value: unknown): string | null => {
        if (typeof value !== 'string') return null;
        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
    };

    const loadBookingPatients = React.useCallback(async () => {
        setLoadingPatients(true);
        try {
            const [patientsSnapshot, usersSnapshot] = await Promise.all([
                getDocs(query(collection(db, 'patients'), limit(150))),
                getDocs(query(collection(db, 'users'), where('role', '==', 'patient'), limit(150)))
            ]);

            const optionsById = new Map<string, BookingPatientOption>();
            const pushOption = (
                id: string,
                rawName: unknown,
                rawEmail: unknown,
                rawFirstName?: unknown,
                rawLastName?: unknown
            ) => {
                const fullName = asNonEmptyString(rawName)
                    ?? [asNonEmptyString(rawFirstName), asNonEmptyString(rawLastName)].filter(Boolean).join(' ')
                    ?? asNonEmptyString(rawEmail)?.split('@')[0]
                    ?? `Patient ${id.slice(0, 6)}`;

                optionsById.set(id, {
                    id,
                    name: fullName,
                    email: asNonEmptyString(rawEmail)
                });
            };

            patientsSnapshot.docs.forEach((patientDoc) => {
                const data = patientDoc.data();
                pushOption(
                    patientDoc.id,
                    data.name ?? data.displayName,
                    data.email,
                    data.firstName,
                    data.lastName
                );
            });

            usersSnapshot.docs.forEach((userDoc) => {
                const data = userDoc.data();
                pushOption(
                    userDoc.id,
                    data.name ?? data.displayName,
                    data.email,
                    data.firstName,
                    data.lastName
                );
            });

            const nextOptions = Array.from(optionsById.values())
                .sort((first, second) => first.name.localeCompare(second.name));
            setBookingPatients(nextOptions);

            if (!scheduleForm.getValues('patientId') && nextOptions.length > 0) {
                scheduleForm.setValue('patientId', nextOptions[0].id, { shouldValidate: true });
            }
        } catch (loadPatientsError) {
            console.error('Error loading booking patients:', loadPatientsError);
            toast.error('Unable to load patient list for scheduling.');
        } finally {
            setLoadingPatients(false);
        }
    }, [scheduleForm]);

    React.useEffect(() => {
        let unsubProviderThreads: (() => void) | null = null;

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (unsubProviderThreads) {
                unsubProviderThreads();
                unsubProviderThreads = null;
            }

            threadUnreadSnapshotRef.current = {};
            hasHydratedProviderThreadsRef.current = false;
            setProviderUnreadCount(0);

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
                loadBookingPatients().catch(() => undefined);

                const providerThreadsQuery = query(
                    collection(db, 'threads'),
                    where('providerId', '==', user.uid)
                );

                unsubProviderThreads = onSnapshot(providerThreadsQuery, (snapshot) => {
                    const nextUnreadByThread: Record<string, number> = {};
                    let nextTotalUnread = 0;

                    snapshot.docs.forEach((threadDoc) => {
                        const data = threadDoc.data();
                        const unreadCountRaw = typeof data.providerUnreadCount === 'number'
                            ? data.providerUnreadCount
                            : (typeof data.unreadCount === 'number' ? data.unreadCount : 0);
                        const unreadCount = unreadCountRaw > 0 ? unreadCountRaw : (data.unread === true ? 1 : 0);

                        nextUnreadByThread[threadDoc.id] = unreadCount;
                        nextTotalUnread += unreadCount;
                    });

                    setProviderUnreadCount(nextTotalUnread);

                    if (hasHydratedProviderThreadsRef.current) {
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === 'removed') return;

                            const data = change.doc.data();
                            const unreadCountRaw = typeof data.providerUnreadCount === 'number'
                                ? data.providerUnreadCount
                                : (typeof data.unreadCount === 'number' ? data.unreadCount : 0);
                            const unreadCount = unreadCountRaw > 0 ? unreadCountRaw : (data.unread === true ? 1 : 0);
                            const previousUnread = threadUnreadSnapshotRef.current[change.doc.id] ?? 0;

                            if (unreadCount > previousUnread) {
                                const patientName = typeof data.patientName === 'string' && data.patientName.trim() !== ''
                                    ? data.patientName
                                    : (typeof data.patient === 'string' && data.patient.trim() !== '' ? data.patient : 'Patient');
                                const preview = typeof data.lastMessage === 'string' && data.lastMessage.trim() !== ''
                                    ? data.lastMessage
                                    : 'You have a new patient message.';

                                toast.message(`New message from ${patientName}`, {
                                    description: preview
                                });
                            }
                        });
                    } else {
                        hasHydratedProviderThreadsRef.current = true;
                    }

                    threadUnreadSnapshotRef.current = nextUnreadByThread;
                });
            } else {
                setBookingPatients([]);
            }
        });

        return () => {
            unsubscribe();
            if (unsubProviderThreads) {
                unsubProviderThreads();
            }
        };
    }, [loadBookingPatients]);

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

    const openBookingModal = () => {
        setIsBookingModalOpen(true);
        if (bookingPatients.length === 0) {
            loadBookingPatients().catch(() => undefined);
        }
    };

    const handleSchedule = scheduleForm.handleSubmit(async (values) => {
        const activeUser = auth.currentUser;
        if (!activeUser) {
            toast.error('Please sign in again to schedule a visit.');
            return;
        }

        const selectedPatient = bookingPatients.find((patientOption) => patientOption.id === values.patientId);
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticAppointment: ProviderDashboardAppointmentEventPayload = {
            id: optimisticId,
            patient: selectedPatient?.name ?? 'Patient',
            displayTime: values.time,
            type: values.visitType === 'video' ? 'Telehealth Visit' : 'In-Person Visit',
            statusKey: 'pending',
            statusLabel: 'Pending',
            startAt: new Date(`${values.date}T${values.time}:00`).toISOString(),
            notes: values.notes,
            meetingUrl: values.visitType === 'video' ? 'pending' : null
        };

        setIsSchedulingVisit(true);
        window.dispatchEvent(
            new CustomEvent(PROVIDER_APPOINTMENT_CREATED_EVENT, {
                detail: {
                    mode: 'optimistic',
                    optimisticId,
                    appointment: optimisticAppointment
                }
            })
        );

        try {
            const idToken = await activeUser.getIdToken();
            const response = await fetch('/api/dashboard/appointments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patientId: values.patientId,
                    patientName: selectedPatient?.name ?? '',
                    date: values.date,
                    time: values.time,
                    visitType: values.visitType,
                    notes: values.notes
                })
            });

            const payload = await response.json() as {
                success?: boolean;
                error?: string;
                appointment?: ProviderDashboardAppointmentEventPayload;
            };

            if (!response.ok || !payload.success || !payload.appointment) {
                throw new Error(payload.error || 'Failed to schedule appointment.');
            }

            window.dispatchEvent(
                new CustomEvent(PROVIDER_APPOINTMENT_CREATED_EVENT, {
                    detail: {
                        mode: 'committed',
                        optimisticId,
                        appointment: payload.appointment
                    }
                })
            );

            toast.success('Appointment scheduled successfully.');
            scheduleForm.reset({
                patientId: values.patientId,
                date: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                time: '10:00',
                visitType: 'video',
                notes: ''
            });
            setIsBookingModalOpen(false);

            if (pathname !== '/dashboard') {
                router.push('/dashboard');
            }
        } catch (scheduleError) {
            window.dispatchEvent(
                new CustomEvent(PROVIDER_APPOINTMENT_CREATED_EVENT, {
                    detail: {
                        mode: 'rollback',
                        optimisticId
                    }
                })
            );

            const message = scheduleError instanceof Error ? scheduleError.message : 'Failed to schedule appointment.';
            toast.error(message);
        } finally {
            setIsSchedulingVisit(false);
        }
    });

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">

            {/* SIDEBAR */}
            <aside
                className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-sidebar flex flex-col fixed inset-y-0 z-30 text-sidebar-foreground shadow-xl transition-all duration-300 ease-in-out`}
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
                        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 shadow-sm hover:text-brand hover:border-brand transition-colors z-50 ${isSidebarCollapsed ? 'rotate-180 translate-x-8' : ''}`}
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
                        <NavItem href="/team" icon={Users} label="Team" active={pathname === '/team'} collapsed={isSidebarCollapsed} />
                        <NavItem href="/patient-search" icon={Search} label="Patient Search" active={pathname === '/patient-search'} collapsed={isSidebarCollapsed} />
                        <NavItem
                            href="/inbox"
                            icon={MessageSquare}
                            label="Inbox / Messages"
                            badge={providerUnreadCount > 0 ? providerUnreadCount.toString() : undefined}
                            active={pathname === '/inbox'}
                            collapsed={isSidebarCollapsed}
                        />
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
                            onClick={openBookingModal}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 font-medium py-2.5 rounded-lg transition-colors border border-indigo-500/20 mb-4 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95 duration-200 whitespace-nowrap overflow-hidden"
                        >
                            <Video className="w-4 h-4 shrink-0" />
                            <span>Schedule Call</span>
                        </button>
                    ) : (
                        <button
                            onClick={openBookingModal}
                            className="w-10 h-10 flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 rounded-lg transition-colors border border-indigo-500/20 mb-4 hover:shadow-lg active:scale-95 duration-200"
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
                                <div className="text-xs text-sidebar-muted group-hover:text-red-400/80 truncate">{userProfile?.role || 'Clinician'}</div>
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

                        <ProviderNotificationBell />

                        <button
                            onClick={openBookingModal}
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

                            <form onSubmit={handleSchedule}>
                                <input type="hidden" {...scheduleForm.register('visitType')} />
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Patient</label>
                                        <select
                                            {...scheduleForm.register('patientId')}
                                            disabled={loadingPatients || isSchedulingVisit}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow disabled:opacity-60"
                                        >
                                            {bookingPatients.length === 0 && (
                                                <option value="">No patients found</option>
                                            )}
                                            {bookingPatients.map((patientOption) => (
                                                <option key={patientOption.id} value={patientOption.id}>
                                                    {patientOption.name}
                                                    {patientOption.email ? ` (${patientOption.email})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {scheduleForm.formState.errors.patientId?.message && (
                                            <p className="mt-1 text-xs font-semibold text-rose-500">{scheduleForm.formState.errors.patientId.message}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
                                            <input
                                                type="date"
                                                {...scheduleForm.register('date')}
                                                disabled={isSchedulingVisit}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow disabled:opacity-60"
                                            />
                                            {scheduleForm.formState.errors.date?.message && (
                                                <p className="mt-1 text-xs font-semibold text-rose-500">{scheduleForm.formState.errors.date.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Time</label>
                                            <input
                                                type="time"
                                                {...scheduleForm.register('time')}
                                                disabled={isSchedulingVisit}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow disabled:opacity-60"
                                            />
                                            {scheduleForm.formState.errors.time?.message && (
                                                <p className="mt-1 text-xs font-semibold text-rose-500">{scheduleForm.formState.errors.time.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Visit Type</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => scheduleForm.setValue('visitType', 'video', { shouldValidate: true })}
                                                className={`flex-1 py-2 px-3 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${scheduleForm.watch('visitType') === 'video'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-2'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <Video className="w-4 h-4" /> Video Call
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => scheduleForm.setValue('visitType', 'in_person', { shouldValidate: true })}
                                                className={`flex-1 py-2 px-3 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${scheduleForm.watch('visitType') === 'in_person'
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
                                        <textarea
                                            {...scheduleForm.register('notes')}
                                            disabled={isSchedulingVisit}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none transition-shadow disabled:opacity-60"
                                            placeholder="Reason for visit..."
                                        />
                                        {scheduleForm.formState.errors.notes?.message && (
                                            <p className="mt-1 text-xs font-semibold text-rose-500">{scheduleForm.formState.errors.notes.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 pt-0 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isSchedulingVisit}
                                        onClick={() => setIsBookingModalOpen(false)}
                                        className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSchedulingVisit}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-60"
                                    >
                                        {isSchedulingVisit ? 'Scheduling...' : 'Schedule Visit'}
                                    </button>
                                </div>
                            </form>
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
                ? 'bg-sidebar-active text-sidebar-foreground font-medium shadow-inner shadow-black/10'
                : 'text-sidebar-muted font-medium hover:bg-sidebar-hover hover:text-sidebar-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? label : ''}
        >
            {active && !collapsed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-r-full"></div>}

            <Icon className={`w-5 h-5 relative z-10 transition-colors shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-indigo-500 dark:group-hover:text-indigo-300'}`} />

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
        return <div className="h-px bg-sidebar-active/60 my-2 mx-2"></div>;
    }
    return (
        <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-black text-sidebar-muted uppercase tracking-widest leading-none">
                {label}
            </span>
        </div>
    );
}
