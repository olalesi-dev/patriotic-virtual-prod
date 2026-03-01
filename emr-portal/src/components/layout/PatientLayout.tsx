"use client";

import {
	collection,
	doc,
	getDoc,
	onSnapshot,
	query,
	where,
} from "firebase/firestore";
import {
	Activity,
	Calendar,
	ChevronRight,
	CreditCard,
	FileText,
	LayoutDashboard,
	LogOut,
	Menu,
	MessageSquare,
	Pill,
	Search,
	Settings,
	ShieldCheck,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { ProviderNotificationBell } from "@/components/common/ProviderNotificationBell";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { auth, db } from "@/lib/firebase";

interface PatientLayoutState {
	userProfile: any;
	loading: boolean;
	unreadCount: number;
}

type PatientLayoutAction =
	| { type: "auth_changed" }
	| { type: "profile_loaded"; payload: any }
	| { type: "set_unread_count"; payload: number }
	| { type: "auth_missing" }
	| { type: "finish_loading" };

const initialPatientLayoutState: PatientLayoutState = {
	userProfile: null,
	loading: true,
	unreadCount: 0,
};

function patientLayoutReducer(
	state: PatientLayoutState,
	action: PatientLayoutAction,
): PatientLayoutState {
	if (action.type === "auth_changed") {
		return {
			...state,
			userProfile: null,
			loading: true,
			unreadCount: 0,
		};
	}

	if (action.type === "profile_loaded") {
		return {
			...state,
			userProfile: action.payload,
		};
	}

	if (action.type === "set_unread_count") {
		return {
			...state,
			unreadCount: action.payload,
		};
	}

	if (action.type === "auth_missing") {
		return {
			userProfile: null,
			loading: false,
			unreadCount: 0,
		};
	}

	return {
		...state,
		loading: false,
	};
}

function usePatientLayoutView({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [layoutState, dispatchLayout] = useReducer(
		patientLayoutReducer,
		initialPatientLayoutState,
	);
	const { userProfile, loading, unreadCount } = layoutState;
	const unreadThreadSnapshotRef = useRef<Record<string, number>>({});
	const hasHydratedPatientThreadsRef = useRef(false);

	useEffect(() => {
		let unsubThreads: any;

		const unsubscribe = auth.onAuthStateChanged(async (user) => {
			if (unsubThreads) {
				unsubThreads();
				unsubThreads = null;
			}

			dispatchLayout({ type: "auth_changed" });
			unreadThreadSnapshotRef.current = {};
			hasHydratedPatientThreadsRef.current = false;

			if (user) {
				// Profile Retrieval (Check Patients then Users collection)
				let profileData: any = {
					name: user.displayName || "Patient",
					firstName: user.displayName
						? user.displayName.split(" ")[0]
						: "Patient",
					role: "Patient", // default fallback
				};

				const docRef = doc(db, "patients", user.uid);
				const docSnap = await getDoc(docRef);

				if (docSnap.exists()) {
					profileData = { ...profileData, ...docSnap.data() };
				} else {
					const userRef = doc(db, "users", user.uid);
					const userSnap = await getDoc(userRef);
					if (userSnap.exists()) {
						profileData = { ...profileData, ...userSnap.data() };
						if (profileData.displayName && !profileData.name) {
							profileData.name = profileData.displayName;
						}
					}
				}

				dispatchLayout({ type: "profile_loaded", payload: profileData });

				// Unread Count Listener
				const q = query(
					collection(db, "threads"),
					where("patientId", "==", user.uid),
				);
				unsubThreads = onSnapshot(q, (snapshot) => {
					const nextUnreadByThread: Record<string, number> = {};
					let total = 0;

						snapshot.docs.forEach((threadDoc) => {
							const data = threadDoc.data();
						const threadUnreadRaw =
							typeof data.patientUnreadCount === "number"
								? data.patientUnreadCount
								: typeof data.unreadCount === "number"
									? data.unreadCount
									: 0;
						const threadUnread =
							threadUnreadRaw > 0 ? threadUnreadRaw : data.unread === true ? 1 : 0;

							nextUnreadByThread[threadDoc.id] = threadUnread;
							total += threadUnread;
						});

						dispatchLayout({ type: "set_unread_count", payload: total });

					if (hasHydratedPatientThreadsRef.current) {
						snapshot.docChanges().forEach((change) => {
							if (change.type === "removed") return;

							const data = change.doc.data();
							const threadUnreadRaw =
								typeof data.patientUnreadCount === "number"
									? data.patientUnreadCount
									: typeof data.unreadCount === "number"
										? data.unreadCount
										: 0;
							const threadUnread =
								threadUnreadRaw > 0 ? threadUnreadRaw : data.unread === true ? 1 : 0;
							const previousUnread =
								unreadThreadSnapshotRef.current[change.doc.id] ?? 0;

							if (threadUnread > previousUnread) {
								const providerName =
									typeof data.providerName === "string" &&
									data.providerName.trim() !== ""
										? data.providerName
										: "Care Team";
								const preview =
									typeof data.lastMessage === "string" &&
									data.lastMessage.trim() !== ""
										? data.lastMessage
										: "You have a new message.";

								toast.message(`New message from ${providerName}`, {
									description: preview,
								});
							}
						});
					} else {
						hasHydratedPatientThreadsRef.current = true;
					}

						unreadThreadSnapshotRef.current = nextUnreadByThread;
					});
				dispatchLayout({ type: "finish_loading" });
			} else {
				dispatchLayout({ type: "auth_missing" });
			}
		});

		return () => {
			unsubscribe();
			if (unsubThreads) unsubThreads();
		};
	}, []);

	const handleLogout = async () => {
		await auth.signOut();
		router.push("/login");
	};

	const getInitials = (name: string) => {
		if (!name || name === "Patient") return "P";
		const parts = name.trim().split(" ");
		if (parts.length > 1) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};

	const getFirstName = (name: string) => {
		if (!name) return "Patient";
		return name.trim().split(" ")[0];
	};

	const navigation = [
		{ name: "Dashboard", href: "/patient", icon: LayoutDashboard },
		{ name: "My Appointments", href: "/patient/appointments", icon: Calendar },
		{
			name: "Messages",
			href: "/patient/messages",
			icon: MessageSquare,
			badge: unreadCount > 0 ? unreadCount.toString() : undefined,
		},
		{ name: "Medications", href: "/my-health/medications", icon: Pill },
		{ name: "Lab Results", href: "/my-health/labs", icon: Activity },
		{ name: "Imaging", href: "/my-health/imaging", icon: FileText },
		{ name: "Billing", href: "/patient/billing", icon: CreditCard },
		{ name: "Settings", href: "/patient/settings", icon: Settings },
	];

	if (loading) {
		return (
			<div className="min-h-screen bg-[#F0F9FF] dark:bg-slate-900 flex items-center justify-center">
				<div className="w-12 h-12 border-4 border-slate-200 border-t-[#0EA5E9] rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F0F9FF] dark:bg-slate-900 flex text-slate-900 dark:text-slate-100">
				{/* MOBILE SIDEBAR OVERLAY */}
				{isSidebarOpen && (
					<button
						type="button"
						aria-label="Close sidebar"
						className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
						onClick={() => setIsSidebarOpen(false)}
						tabIndex={0}
					/>
				)}

			{/* SIDEBAR */}
			<aside
				className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
			>
				{/* Logo */}
				<div className="h-20 flex items-center px-8 border-b border-slate-50 dark:border-slate-800">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-[#0EA5E9] rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
							<span className="text-white font-black italic text-xl">P</span>
						</div>
						<span className="font-black text-slate-800 dark:text-slate-100 tracking-tight text-xl">
							Patriotic
						</span>
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
                                    ${
																			isActive
																				? "bg-sky-50 dark:bg-sky-900/20 text-[#0EA5E9]"
																				: "text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
																		}
                                `}
							>
								<div className="flex items-center gap-4">
									<item.icon
										className={`w-5 h-5 ${isActive ? "text-[#0EA5E9]" : "text-slate-300 dark:text-slate-500 group-hover:text-slate-400 dark:group-hover:text-slate-300"}`}
									/>
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

				{/* User Profile info - Redesigned Dark Theme Box */}
				<div className="mt-auto p-4 mx-4 mb-6 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl relative group overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none"></div>

					<div className="flex items-center gap-3 relative z-10">
						<div className="w-10 h-10 rounded-full bg-[#6366F1] flex flex-shrink-0 items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-[#0F172A]">
							{getInitials(userProfile?.name)}
						</div>
						<div className="flex-1 min-w-0 pr-6">
							<h4 className="text-sm font-bold text-white truncate drop-shadow-sm">
								{userProfile?.name || "Patient"}
							</h4>
							<p className="text-xs font-semibold text-slate-400 capitalize truncate">
								{userProfile?.role || "Patient"}
							</p>
						</div>
					</div>

					{/* Logout Button (Appears on Hover) */}
					<button
						onClick={handleLogout}
						className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-800/0 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all z-20"
						title="Sign Out"
					>
						<LogOut className="w-4 h-4" />
					</button>
				</div>
			</aside>

			{/* MAIN CONTENT */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Header */}
				<header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 px-8 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							className="p-2 -ml-2 lg:hidden text-slate-400 dark:text-slate-300"
							onClick={() => setIsSidebarOpen(true)}
						>
							<Menu className="w-6 h-6" />
						</button>
						<h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight hidden sm:block">
							Welcome back,{" "}
							<span className="text-[#0EA5E9]">
								{getFirstName(userProfile?.name)}
							</span>
						</h2>
					</div>

					<div className="flex items-center gap-2">
						<div className="hidden md:flex items-center gap-2 mr-4 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
							<Search className="w-4 h-4 text-slate-300 dark:text-slate-500" />
							<input
								type="text"
								placeholder="Search medical records..."
								className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-500 w-48"
							/>
						</div>

						<ProviderNotificationBell viewAllHref="/patient/notifications" />

						<ThemeToggle />

						<div className="h-8 w-px bg-slate-100 dark:bg-slate-700 mx-2"></div>

						<div className="flex items-center gap-1 text-slate-300 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
							<ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure
						</div>
					</div>
				</header>

				{/* Content area */}
				<main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#F0F9FF] dark:bg-slate-900">
					<div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}

export function PatientLayout({ children }: { children: React.ReactNode }) {
	return usePatientLayoutView({ children });
}
