"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import {
	Bell,
	Calendar,
	ChevronRight,
	Clock3,
	ExternalLink,
	Globe,
	Layout,
	Lock,
	Palette,
	Plus,
	Save,
	Settings2,
	Trash2,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
	COMMON_TIMEZONES,
	type ConnectedAppKey,
	DAY_LABELS,
	LANGUAGE_OPTIONS,
	type ProviderSettings,
	type SettingsRole,
	settingsLocaleSchema,
	settingsNotificationsSchema,
	settingsProfileSchema,
	settingsThemeSchema,
	toDateTimeLabel,
	type WeekdayKey,
} from "@/lib/settings";

const providerTabs = [
	"Details",
	"Services and availability",
	"Connected apps",
	"Notifications",
] as const;
const patientTabs = [
	"Details",
	"Preferences",
	"Connected apps",
	"Notifications",
] as const;
type ProviderTab = (typeof providerTabs)[number];
type PatientTab = (typeof patientTabs)[number];

type PortalRole = "provider" | "patient";

const providerServiceFormSchema = z.object({
	id: z.string().trim().optional(),
	name: z.string().trim().min(2).max(120),
	enabled: z.boolean(),
	durationMinutes: z.number().int().min(10).max(240),
	priceUsd: z.number().min(0).max(5000),
});

const dayAvailabilityFormSchema = z
	.object({
		enabled: z.boolean(),
		start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
		end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
		visitType: z.enum(["all", "telehealth", "in_person"]),
	})
	.superRefine((value, ctx) => {
		if (!value.enabled) return;
		if (value.start >= value.end) {
			ctx.addIssue({
				code: "custom",
				message: "End time must be after start time.",
				path: ["end"],
			});
		}
	});

const dateOverrideFormSchema = z
	.object({
		id: z.string().trim().optional(),
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		unavailable: z.boolean(),
		start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
		end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
		note: z.string().trim().max(200),
	})
	.superRefine((value, ctx) => {
		if (value.unavailable) return;
		if (value.start >= value.end) {
			ctx.addIssue({
				code: "custom",
				message: "End time must be after start time.",
				path: ["end"],
			});
		}
	});

const connectedAppFormSchema = z.object({
	accountLabel: z.string().trim().min(3).max(80),
});

const profileDialogSchema = settingsProfileSchema.omit({ email: true });

type ProfileDialogValues = z.infer<typeof profileDialogSchema>;
type LocaleDialogValues = z.infer<typeof settingsLocaleSchema>;
type ThemeDialogValues = z.infer<typeof settingsThemeSchema>;
type NotificationDialogValues = z.infer<typeof settingsNotificationsSchema>;
type ServiceDialogValues = z.infer<typeof providerServiceFormSchema>;
type DayAvailabilityValues = z.infer<typeof dayAvailabilityFormSchema>;
type DateOverrideValues = z.infer<typeof dateOverrideFormSchema>;
type ConnectedAppValues = z.infer<typeof connectedAppFormSchema>;

const appDirectory: Array<{
	key: ConnectedAppKey;
	name: string;
	description: string;
}> = [
	{
		key: "gmail",
		name: "Gmail",
		description: "Sync messages and routing notifications.",
	},
	{
		key: "googleCalendar",
		name: "Google Calendar",
		description: "Sync availability and appointment events.",
	},
	{
		key: "outlook",
		name: "Microsoft Outlook",
		description: "Connect Outlook inbox notifications.",
	},
	{
		key: "microsoftCalendar",
		name: "Microsoft Calendar",
		description: "Sync with Office365 scheduling.",
	},
	{
		key: "zoom",
		name: "Zoom",
		description: "Use your Zoom account for telehealth links.",
	},
];

const notificationLabels: Record<
	keyof NotificationDialogValues,
	{ title: string; description: string }
> = {
	scheduling: {
		title: "Scheduling",
		description: "Bookings, reschedules, and cancellations.",
	},
	practitionerScheduling: {
		title: "Practitioner Scheduling",
		description: "Changes to appointments assigned to you.",
	},
	billing: {
		title: "Billing and Payment",
		description: "Payment receipts and billing alerts.",
	},
	clientDocumentation: {
		title: "Client Documentation",
		description: "Notes, forms, and chart updates.",
	},
	workspace: {
		title: "Workspace",
		description: "System announcements and environment updates.",
	},
	communications: {
		title: "Communications",
		description: "Inbox activity and team communication updates.",
	},
};

function normalizeServiceId(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "")
			.slice(0, 48) || `service_${Date.now()}`
	);
}

function resolveTimezoneOptions(currentTimezone: string): string[] {
	const timezoneList = [...COMMON_TIMEZONES] as string[];
	if (timezoneList.includes(currentTimezone)) return timezoneList;
	return [currentTimezone, ...timezoneList];
}

function ModalFrame({
	title,
	subtitle,
	children,
	onClose,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 z-[120] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
			<div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
				<div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
					<div>
						<h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
							{title}
						</h3>
						{subtitle && (
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
								{subtitle}
							</p>
						)}
					</div>
					<button
						onClick={onClose}
						className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}

function SectionCard({
	icon,
	title,
	description,
	action,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
			<div className="flex items-start justify-between gap-4 mb-4">
				<div>
					<div className="flex items-center gap-2">
						<div className="text-slate-500 dark:text-slate-300">{icon}</div>
						<h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
							{title}
						</h2>
					</div>
					{description && (
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
							{description}
						</p>
					)}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

function ProfileGrid({
	values,
	showSpecialty,
}: {
	values: {
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
		title: string;
		specialty: string;
	};
	showSpecialty: boolean;
}) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<InfoItem label="First Name" value={values.firstName} />
			<InfoItem label="Last Name" value={values.lastName} />
			<InfoItem label="Email" value={values.email || "Not set"} />
			<InfoItem label="Phone" value={values.phone || "Not set"} />
			<InfoItem label="Title" value={values.title || "Not set"} />
			{showSpecialty && (
				<InfoItem label="Specialty" value={values.specialty || "Not set"} />
			)}
		</div>
	);
}

function InfoItem({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
				{label}
			</div>
			<div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
				{value}
			</div>
		</div>
	);
}

export function SettingsWorkspace({ role }: { role: PortalRole }) {
	const { settings, loading, error, refresh, savingSection, updateSection } =
		useUserSettings({ expectedRole: role });

	const [activeProviderTab, setActiveProviderTab] =
		useState<ProviderTab>("Details");
	const [activePatientTab, setActivePatientTab] =
		useState<PatientTab>("Details");

	const [profileOpen, setProfileOpen] = useState(false);
	const [localeOpen, setLocaleOpen] = useState(false);
	const [themeOpen, setThemeOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [serviceOpen, setServiceOpen] = useState(false);
	const [overrideOpen, setOverrideOpen] = useState(false);
	const [dayOpen, setDayOpen] = useState(false);
	const [connectAppOpen, setConnectAppOpen] = useState(false);

	const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
	const [editingDayKey, setEditingDayKey] = useState<WeekdayKey | null>(null);
	const [editingOverrideId, setEditingOverrideId] = useState<string | null>(
		null,
	);
	const [editingAppKey, setEditingAppKey] = useState<ConnectedAppKey | null>(
		null,
	);

	const profileForm = useForm<ProfileDialogValues>({
		resolver: zodResolver(profileDialogSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			phone: "",
			title: role === "provider" ? "Provider" : "Patient",
			specialty: role === "provider" ? "Primary Care" : "",
		},
	});

	const localeForm = useForm<LocaleDialogValues>({
		resolver: zodResolver(settingsLocaleSchema),
		defaultValues: {
			language: "en-US",
			timezone: "UTC",
			weekStart: "monday",
		},
	});

	const themeForm = useForm<ThemeDialogValues>({
		resolver: zodResolver(settingsThemeSchema),
		defaultValues: {
			mode: "system",
			accentColor: "#4F46E5",
		},
	});

	const notificationsForm = useForm<NotificationDialogValues>({
		resolver: zodResolver(settingsNotificationsSchema),
		defaultValues: settingsNotificationsSchema.parse({
			scheduling: { inApp: true, email: false },
			practitionerScheduling: { inApp: false, email: true },
			billing: { inApp: true, email: true },
			clientDocumentation: { inApp: true, email: false },
			workspace: { inApp: true, email: false },
			communications: { inApp: true, email: true },
		}),
	});

	const serviceForm = useForm<ServiceDialogValues>({
		resolver: zodResolver(providerServiceFormSchema),
		defaultValues: {
			name: "",
			enabled: true,
			durationMinutes: 30,
			priceUsd: 80,
		},
	});

	const dayForm = useForm<DayAvailabilityValues>({
		resolver: zodResolver(dayAvailabilityFormSchema),
		defaultValues: {
			enabled: true,
			start: "09:00",
			end: "17:00",
			visitType: "all",
		},
	});

	const dateOverrideForm = useForm<DateOverrideValues>({
		resolver: zodResolver(dateOverrideFormSchema),
		defaultValues: {
			date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
			unavailable: false,
			start: "09:00",
			end: "12:00",
			note: "",
		},
	});

	const connectedAppForm = useForm<ConnectedAppValues>({
		resolver: zodResolver(connectedAppFormSchema),
		defaultValues: {
			accountLabel: "",
		},
	});

	const activeTab = role === "provider" ? activeProviderTab : activePatientTab;

	const timezoneOptions = useMemo(
		() => resolveTimezoneOptions(settings?.locale.timezone ?? "UTC"),
		[settings?.locale.timezone],
	);

	if (loading) {
		return (
			<div className="min-h-[55vh] flex items-center justify-center">
				<div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-[#4F46E5] rounded-full animate-spin" />
			</div>
		);
	}

	if (!settings) {
		return (
			<div className="max-w-4xl mx-auto py-12">
				<div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
					<p className="text-sm font-semibold text-rose-700">
						{error ?? "Unable to load settings right now."}
					</p>
					<button
						onClick={() => refresh()}
						className="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	const providerSettings =
		settings.role === "provider" ? (settings as ProviderSettings) : null;

	const openProfileDialog = () => {
		profileForm.reset({
			firstName: settings.profile.firstName,
			lastName: settings.profile.lastName,
			phone: settings.profile.phone,
			title: settings.profile.title,
			specialty: settings.profile.specialty,
		});
		setProfileOpen(true);
	};

	const openLocaleDialog = () => {
		localeForm.reset(settings.locale);
		setLocaleOpen(true);
	};

	const openThemeDialog = () => {
		themeForm.reset(settings.theme);
		setThemeOpen(true);
	};

	const openNotificationsDialog = () => {
		notificationsForm.reset(settings.notifications);
		setNotificationsOpen(true);
	};

	const openServiceDialog = (serviceId?: string) => {
		if (!providerSettings) return;

		if (!serviceId) {
			setEditingServiceId(null);
			serviceForm.reset({
				id: "",
				name: "",
				enabled: true,
				durationMinutes: 30,
				priceUsd: 80,
			});
			setServiceOpen(true);
			return;
		}

		const selected = providerSettings.services.find(
			(service) => service.id === serviceId,
		);
		if (!selected) return;

		setEditingServiceId(serviceId);
		serviceForm.reset({
			id: selected.id,
			name: selected.name,
			enabled: selected.enabled,
			durationMinutes: selected.durationMinutes,
			priceUsd: selected.priceUsd,
		});
		setServiceOpen(true);
	};

	const openDayDialog = (dayKey: WeekdayKey) => {
		if (!providerSettings) return;
		const dayAvailability = providerSettings.availability.weekly[dayKey];
		setEditingDayKey(dayKey);
		dayForm.reset(dayAvailability);
		setDayOpen(true);
	};

	const openOverrideDialog = (overrideId?: string) => {
		if (!providerSettings) return;

		if (!overrideId) {
			setEditingOverrideId(null);
			dateOverrideForm.reset({
				id: "",
				date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
				unavailable: false,
				start: "09:00",
				end: "12:00",
				note: "",
			});
			setOverrideOpen(true);
			return;
		}

		const selected = providerSettings.availability.dateOverrides.find(
			(override) => override.id === overrideId,
		);
		if (!selected) return;

		setEditingOverrideId(selected.id);
		dateOverrideForm.reset({
			id: selected.id,
			date: selected.date,
			unavailable: selected.unavailable,
			start: selected.start,
			end: selected.end,
			note: selected.note ?? "",
		});
		setOverrideOpen(true);
	};

	const openConnectAppDialog = (appKey: ConnectedAppKey) => {
		const appState = settings.connectedApps[appKey];
		setEditingAppKey(appKey);
		connectedAppForm.reset({
			accountLabel: appState.accountLabel ?? "",
		});
		setConnectAppOpen(true);
	};

	const saveProfile = async (value: ProfileDialogValues) => {
		const ok = await updateSection({
			section: "profile",
			value: {
				...settings.profile,
				...value,
			},
		});

		if (!ok) {
			toast.error(error ?? "Could not save profile details.");
			return;
		}

		toast.success("Profile settings updated.");
		setProfileOpen(false);
	};

	const saveLocale = async (value: LocaleDialogValues) => {
		const ok = await updateSection({
			section: "locale",
			value,
		});

		if (!ok) {
			toast.error(error ?? "Could not save locale preferences.");
			return;
		}

		toast.success("Language and timezone updated.");
		setLocaleOpen(false);
	};

	const saveTheme = async (value: ThemeDialogValues) => {
		const ok = await updateSection({
			section: "theme",
			value,
		});
		if (!ok) {
			toast.error(error ?? "Could not save theme preferences.");
			return;
		}
		toast.success("Theme updated.");
		setThemeOpen(false);
	};

	const saveNotifications = async (value: NotificationDialogValues) => {
		const ok = await updateSection({
			section: "notifications",
			value,
		});
		if (!ok) {
			toast.error(error ?? "Could not save notification preferences.");
			return;
		}
		toast.success("Notification preferences updated.");
		setNotificationsOpen(false);
	};

	const saveService = async (value: ServiceDialogValues) => {
		if (!providerSettings) return;

		const id =
			value.id && value.id.trim()
				? normalizeServiceId(value.id)
				: normalizeServiceId(value.name);
		const nextServices = providerSettings.services.filter(
			(service) => service.id !== editingServiceId,
		);
		nextServices.push({
			id,
			name: value.name,
			enabled: value.enabled,
			durationMinutes: value.durationMinutes,
			priceUsd: value.priceUsd,
		});

		const ok = await updateSection({
			section: "services",
			value: nextServices,
		});

		if (!ok) {
			toast.error(error ?? "Could not save service.");
			return;
		}

		toast.success(editingServiceId ? "Service updated." : "Service created.");
		setServiceOpen(false);
		setEditingServiceId(null);
	};

	const removeService = async (serviceId: string) => {
		if (!providerSettings) return;
		const nextServices = providerSettings.services.filter(
			(service) => service.id !== serviceId,
		);
		if (nextServices.length === 0) {
			toast.error("At least one service must remain.");
			return;
		}

		const ok = await updateSection({
			section: "services",
			value: nextServices,
		});

		if (!ok) {
			toast.error(error ?? "Could not remove service.");
			return;
		}

		toast.success("Service removed.");
	};

	const saveDayAvailability = async (value: DayAvailabilityValues) => {
		if (!providerSettings || !editingDayKey) return;
		const nextAvailability = {
			...providerSettings.availability,
			weekly: {
				...providerSettings.availability.weekly,
				[editingDayKey]: value,
			},
		};

		const ok = await updateSection({
			section: "availability",
			value: nextAvailability,
		});
		if (!ok) {
			toast.error(error ?? "Could not save day availability.");
			return;
		}
		toast.success(`${DAY_LABELS[editingDayKey]} availability updated.`);
		setDayOpen(false);
		setEditingDayKey(null);
	};

	const saveDateOverride = async (value: DateOverrideValues) => {
		if (!providerSettings) return;
		const nextOverrides = providerSettings.availability.dateOverrides
			.filter((entry) => entry.id !== editingOverrideId)
			.concat({
				id: editingOverrideId || `override_${Date.now()}`,
				date: value.date,
				unavailable: value.unavailable,
				start: value.start,
				end: value.end,
				note: value.note,
			})
			.sort((a, b) => a.date.localeCompare(b.date));

		const ok = await updateSection({
			section: "availability",
			value: {
				...providerSettings.availability,
				dateOverrides: nextOverrides,
			},
		});

		if (!ok) {
			toast.error(error ?? "Could not save date override.");
			return;
		}

		toast.success(
			editingOverrideId ? "Date override updated." : "Date override created.",
		);
		setOverrideOpen(false);
		setEditingOverrideId(null);
	};

	const removeDateOverride = async (overrideId: string) => {
		if (!providerSettings) return;
		const nextOverrides = providerSettings.availability.dateOverrides.filter(
			(entry) => entry.id !== overrideId,
		);
		const ok = await updateSection({
			section: "availability",
			value: {
				...providerSettings.availability,
				dateOverrides: nextOverrides,
			},
		});
		if (!ok) {
			toast.error(error ?? "Could not remove date override.");
			return;
		}
		toast.success("Date override removed.");
	};

	const connectApp = async (value: ConnectedAppValues) => {
		if (!editingAppKey) return;
		const nextConnectedApps = {
			...settings.connectedApps,
			[editingAppKey]: {
				connected: true,
				accountLabel: value.accountLabel,
				connectedAt: new Date().toISOString(),
			},
		};
		const ok = await updateSection({
			section: "connectedApps",
			value: nextConnectedApps,
		});
		if (!ok) {
			toast.error(error ?? "Could not connect app.");
			return;
		}
		toast.success("App connected.");
		setConnectAppOpen(false);
		setEditingAppKey(null);
	};

	const disconnectApp = async (appKey: ConnectedAppKey) => {
		const nextConnectedApps = {
			...settings.connectedApps,
			[appKey]: {
				connected: false,
				accountLabel: null,
				connectedAt: null,
			},
		};
		const ok = await updateSection({
			section: "connectedApps",
			value: nextConnectedApps,
		});
		if (!ok) {
			toast.error(error ?? "Could not disconnect app.");
			return;
		}
		toast.success("App disconnected.");
	};

	return (
		<div className="font-sans text-slate-900 dark:text-slate-100 max-w-7xl mx-auto px-4 lg:px-8 py-8">
			<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold uppercase tracking-widest">
				<Link
					href={role === "provider" ? "/settings" : "/patient/settings"}
					className="hover:text-indigo-600 transition-colors"
				>
					Settings
				</Link>
				<ChevronRight className="w-3.5 h-3.5" />
				<span className="text-slate-900 dark:text-slate-100">My Profile</span>
			</div>

			<div className="flex items-center gap-3 mb-8">
				<div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
					<Settings2 className="w-5 h-5" />
				</div>
				<div>
					<h1 className="text-3xl font-black tracking-tight">Settings</h1>
					<p className="text-xs uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400 mt-1">
						{role === "provider"
							? "Provider Configuration"
							: "Patient Preferences"}
					</p>
				</div>
			</div>

			{error && (
				<div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
					{error}
				</div>
			)}

			<div className="border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
				<div className="flex gap-8 whitespace-nowrap">
					{(role === "provider" ? providerTabs : patientTabs).map((tab) => {
						const isActive = activeTab === tab;
						return (
							<button
								key={tab}
								onClick={() => {
									if (role === "provider") {
										setActiveProviderTab(tab as ProviderTab);
									} else {
										setActivePatientTab(tab as PatientTab);
									}
								}}
								className={`pb-4 text-sm font-bold border-b-2 transition-all px-1 ${
									isActive
										? "border-indigo-600 text-indigo-600"
										: "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
								}`}
							>
								{tab}
							</button>
						);
					})}
				</div>
			</div>

			<main className="space-y-6 pb-16">
				{activeTab === "Details" && (
					<>
						<SectionCard
							icon={<User className="w-4 h-4" />}
							title="Personal details"
							action={
								<button
									onClick={openProfileDialog}
									className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
								>
									Edit
								</button>
							}
						>
							<ProfileGrid
								values={settings.profile}
								showSpecialty={settings.role === "provider"}
							/>
						</SectionCard>

						<SectionCard
							icon={<Globe className="w-4 h-4" />}
							title="Language and timezone"
							description="Timezone and locale preferences are persisted and used throughout scheduling screens."
							action={
								<button
									onClick={openLocaleDialog}
									className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
								>
									Edit
								</button>
							}
						>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<InfoItem label="Language" value={settings.locale.language} />
								<InfoItem label="Timezone" value={settings.locale.timezone} />
								<InfoItem
									label="Local Time"
									value={toDateTimeLabel(new Date(), settings.locale.timezone)}
								/>
							</div>
						</SectionCard>

						<SectionCard
							icon={<Palette className="w-4 h-4" />}
							title="Theme"
							description="Theme mode and accent color update instantly after saving."
							action={
								<button
									onClick={openThemeDialog}
									className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
								>
									Edit
								</button>
							}
						>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<InfoItem label="Mode" value={settings.theme.mode} />
								<div>
									<div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
										Accent
									</div>
									<div className="flex items-center gap-2 mt-1">
										<span
											className="w-4 h-4 rounded-full border border-slate-200"
											style={{ backgroundColor: settings.theme.accentColor }}
										/>
										<span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
											{settings.theme.accentColor}
										</span>
									</div>
								</div>
							</div>
						</SectionCard>

						<SectionCard
							icon={<Lock className="w-4 h-4" />}
							title="Security"
							description="MFA policy is enforced by identity provider; this section reflects your current sign-in method."
						>
							<p className="text-sm text-slate-600 dark:text-slate-300">
								Use Google OAuth or email/password with MFA enrollment for
								stronger sign-in assurance.
							</p>
						</SectionCard>
					</>
				)}

				{role === "provider" &&
					activeTab === "Services and availability" &&
					providerSettings && (
						<>
							<SectionCard
								icon={<Layout className="w-4 h-4" />}
								title="Assigned services"
								description="Control which services are bookable and their default duration and price."
								action={
									<button
										onClick={() => openServiceDialog()}
										className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
									>
										<Plus className="w-3 h-3" /> New Service
									</button>
								}
							>
								<div className="space-y-3">
									{providerSettings.services.map((service) => (
										<div
											key={service.id}
											className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
										>
											<div>
												<h4 className="font-semibold text-slate-900 dark:text-slate-100">
													{service.name}
												</h4>
												<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
													{service.durationMinutes} minutes • $
													{service.priceUsd.toFixed(2)} •{" "}
													{service.enabled ? "Enabled" : "Disabled"}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<button
													onClick={() => openServiceDialog(service.id)}
													className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700"
												>
													Edit
												</button>
												<button
													onClick={() => removeService(service.id)}
													className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-rose-200 text-rose-600"
												>
													Remove
												</button>
											</div>
										</div>
									))}
								</div>
							</SectionCard>

							<SectionCard
								icon={<Calendar className="w-4 h-4" />}
								title="Date specific hours"
								description="Set one-off date overrides that differ from normal weekly availability."
								action={
									<button
										onClick={() => openOverrideDialog()}
										className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
									>
										<Plus className="w-3 h-3" /> New Override
									</button>
								}
							>
								<div className="space-y-3">
									{providerSettings.availability.dateOverrides.length === 0 && (
										<p className="text-sm text-slate-500 dark:text-slate-400">
											No date overrides set.
										</p>
									)}
									{providerSettings.availability.dateOverrides.map(
										(override) => (
											<div
												key={override.id}
												className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
											>
												<div>
													<h4 className="font-semibold text-slate-900 dark:text-slate-100">
														{override.date}
													</h4>
													<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
														{override.unavailable
															? "Unavailable"
															: `${override.start} - ${override.end}`}
														{override.note ? ` • ${override.note}` : ""}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<button
														onClick={() => openOverrideDialog(override.id)}
														className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700"
													>
														Edit
													</button>
													<button
														onClick={() => removeDateOverride(override.id)}
														className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</div>
										),
									)}
								</div>
							</SectionCard>

							<SectionCard
								icon={<Clock3 className="w-4 h-4" />}
								title="Weekly availability"
								description={`Current scheduling timezone: ${providerSettings.availability.timezone}`}
							>
								<div className="space-y-2">
									{(
										Object.keys(
											providerSettings.availability.weekly,
										) as WeekdayKey[]
									).map((dayKey) => {
										const day = providerSettings.availability.weekly[dayKey];
										return (
											<div
												key={dayKey}
												className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between"
											>
												<div>
													<p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
														{DAY_LABELS[dayKey]}
													</p>
													<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
														{day.enabled
															? `${day.start} - ${day.end} (${day.visitType})`
															: "Unavailable"}
													</p>
												</div>
												<button
													onClick={() => openDayDialog(dayKey)}
													className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700"
												>
													Edit
												</button>
											</div>
										);
									})}
								</div>
							</SectionCard>
						</>
					)}

				{activeTab === "Preferences" && role === "patient" && (
					<>
						<SectionCard
							icon={<Globe className="w-4 h-4" />}
							title="Language and timezone"
							description="Your timezone is used for appointment and reminder display."
							action={
								<button
									onClick={openLocaleDialog}
									className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
								>
									Edit
								</button>
							}
						>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<InfoItem label="Language" value={settings.locale.language} />
								<InfoItem label="Timezone" value={settings.locale.timezone} />
								<InfoItem
									label="Local Time"
									value={toDateTimeLabel(new Date(), settings.locale.timezone)}
								/>
							</div>
						</SectionCard>

						<SectionCard
							icon={<Palette className="w-4 h-4" />}
							title="Theme"
							action={
								<button
									onClick={openThemeDialog}
									className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
								>
									Edit
								</button>
							}
						>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<InfoItem label="Mode" value={settings.theme.mode} />
								<InfoItem label="Accent" value={settings.theme.accentColor} />
							</div>
						</SectionCard>
					</>
				)}

				{activeTab === "Connected apps" && (
					<SectionCard
						icon={<ExternalLink className="w-4 h-4" />}
						title="Connected apps"
						description="Manage external integrations used for messaging and scheduling."
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{appDirectory.map((app) => {
								const state = settings.connectedApps[app.key];
								return (
									<div
										key={app.key}
										className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3"
									>
										<div>
											<h4 className="font-semibold text-slate-900 dark:text-slate-100">
												{app.name}
											</h4>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
												{app.description}
											</p>
										</div>
										<div className="text-xs text-slate-500 dark:text-slate-400">
											{state.connected
												? `Connected${state.accountLabel ? ` as ${state.accountLabel}` : ""}`
												: "Not connected"}
										</div>
										<div className="flex items-center gap-2">
											{state.connected ? (
												<button
													onClick={() => disconnectApp(app.key)}
													className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-rose-200 text-rose-600"
												>
													Disconnect
												</button>
											) : (
												<button
													onClick={() => openConnectAppDialog(app.key)}
													className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-indigo-200 text-indigo-600"
												>
													Connect
												</button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</SectionCard>
				)}

				{activeTab === "Notifications" && (
					<SectionCard
						icon={<Bell className="w-4 h-4" />}
						title="Notification preferences"
						description="Configure in-app and email delivery per notification category."
						action={
							<button
								onClick={openNotificationsDialog}
								className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
							>
								Edit
							</button>
						}
					>
						<div className="space-y-3">
							{(
								Object.keys(notificationLabels) as Array<
									keyof NotificationDialogValues
								>
							).map((key) => {
								const rule = settings.notifications[key];
								return (
									<div
										key={key}
										className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"
									>
										<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
											{notificationLabels[key].title}
										</h4>
										<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
											{notificationLabels[key].description}
										</p>
										<div className="flex gap-6 mt-3 text-xs font-semibold">
											<span
												className={
													rule.inApp ? "text-emerald-600" : "text-slate-400"
												}
											>
												In-app: {rule.inApp ? "On" : "Off"}
											</span>
											<span
												className={
													rule.email ? "text-emerald-600" : "text-slate-400"
												}
											>
												Email: {rule.email ? "On" : "Off"}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</SectionCard>
				)}
			</main>

			{profileOpen && (
				<ModalFrame
					title="Edit Personal Details"
					subtitle="These details are used throughout profile and messaging surfaces."
					onClose={() => setProfileOpen(false)}
				>
					<form
						onSubmit={profileForm.handleSubmit(saveProfile)}
						className="p-6 space-y-4"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Field
								label="First name"
								error={profileForm.formState.errors.firstName?.message}
							>
								<input
									{...profileForm.register("firstName")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
							<Field
								label="Last name"
								error={profileForm.formState.errors.lastName?.message}
							>
								<input
									{...profileForm.register("lastName")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
							<Field
								label="Phone"
								error={profileForm.formState.errors.phone?.message}
							>
								<input
									{...profileForm.register("phone")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
									placeholder="+1 555 000 0000"
								/>
							</Field>
							<Field
								label="Title"
								error={profileForm.formState.errors.title?.message}
							>
								<input
									{...profileForm.register("title")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
									placeholder={role === "provider" ? "Clinician" : "Patient"}
								/>
							</Field>
							{settings.role === "provider" && (
								<Field
									label="Specialty"
									error={profileForm.formState.errors.specialty?.message}
								>
									<input
										{...profileForm.register("specialty")}
										className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
									/>
								</Field>
							)}
						</div>
						<DialogActions
							saving={savingSection === "profile"}
							onCancel={() => setProfileOpen(false)}
						/>
					</form>
				</ModalFrame>
			)}

			{localeOpen && (
				<ModalFrame
					title="Language and Timezone"
					subtitle="Timezone updates are applied to all date/time formatting surfaces."
					onClose={() => setLocaleOpen(false)}
				>
					<form
						onSubmit={localeForm.handleSubmit(saveLocale)}
						className="p-6 space-y-4"
					>
						<Field
							label="Language"
							error={localeForm.formState.errors.language?.message}
						>
							<select
								{...localeForm.register("language")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
							>
								{LANGUAGE_OPTIONS.map((languageCode) => (
									<option key={languageCode} value={languageCode}>
										{languageCode}
									</option>
								))}
							</select>
						</Field>
						<Field
							label="Timezone"
							error={localeForm.formState.errors.timezone?.message}
						>
							<select
								{...localeForm.register("timezone")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
							>
								{timezoneOptions.map((timezone) => (
									<option key={timezone} value={timezone}>
										{timezone}
									</option>
								))}
							</select>
						</Field>
						<Field
							label="Week Starts On"
							error={localeForm.formState.errors.weekStart?.message}
						>
							<select
								{...localeForm.register("weekStart")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
							>
								<option value="monday">Monday</option>
								<option value="sunday">Sunday</option>
							</select>
						</Field>
						<DialogActions
							saving={savingSection === "locale"}
							onCancel={() => setLocaleOpen(false)}
						/>
					</form>
				</ModalFrame>
			)}

			{themeOpen && (
				<ModalFrame
					title="Theme Preferences"
					subtitle="Mode updates are applied instantly."
					onClose={() => setThemeOpen(false)}
				>
					<form
						onSubmit={themeForm.handleSubmit(saveTheme)}
						className="p-6 space-y-4"
					>
						<Field
							label="Theme mode"
							error={themeForm.formState.errors.mode?.message}
						>
							<select {...themeForm.register("mode")} className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700">
								<option value="system">System</option>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
							</select>
						</Field>
						<Field
							label="Accent color"
							error={themeForm.formState.errors.accentColor?.message}
						>
							<div className="flex flex-wrap gap-2">
								{["#4F46E5", "#0EA5E9", "#6366F1", "#059669", "#9333EA"].map(
									(accent) => {
										const selected = themeForm.watch("accentColor") === accent;
										return (
											<button
												key={accent}
												type="button"
												onClick={() =>
													themeForm.setValue("accentColor", accent, {
														shouldValidate: true,
													})
												}
												className={`w-9 h-9 rounded-full border-2 ${selected ? "border-slate-900 dark:border-slate-100" : "border-slate-200 dark:border-slate-700"}`}
												style={{ backgroundColor: accent }}
											/>
										);
									},
								)}
							</div>
						</Field>
						<DialogActions
							saving={savingSection === "theme"}
							onCancel={() => setThemeOpen(false)}
						/>
					</form>
				</ModalFrame>
			)}

			{notificationsOpen && (
				<ModalFrame
					title="Notification Preferences"
					subtitle="Use category-level controls to adjust in-app and email notifications."
					onClose={() => setNotificationsOpen(false)}
				>
					<form
						onSubmit={notificationsForm.handleSubmit(saveNotifications)}
						className="p-6 space-y-4"
					>
						{(
							Object.keys(notificationLabels) as Array<
								keyof NotificationDialogValues
							>
						).map((key) => (
							<div
								key={key}
								className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"
							>
								<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									{notificationLabels[key].title}
								</h4>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
									{notificationLabels[key].description}
								</p>
								<div className="mt-3 flex gap-4">
									<label className="inline-flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											{...notificationsForm.register(`${key}.inApp`)}
										/>
										In-app
									</label>
									<label className="inline-flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											{...notificationsForm.register(`${key}.email`)}
										/>
										Email
									</label>
								</div>
							</div>
						))}
						<DialogActions
							saving={savingSection === "notifications"}
							onCancel={() => setNotificationsOpen(false)}
						/>
					</form>
				</ModalFrame>
			)}

			{serviceOpen && providerSettings && (
				<ModalFrame
					title={editingServiceId ? "Edit Service" : "New Service"}
					onClose={() => {
						setServiceOpen(false);
						setEditingServiceId(null);
					}}
				>
					<form
						onSubmit={serviceForm.handleSubmit(saveService)}
						className="p-6 space-y-4"
					>
						<Field
							label="Service Name"
							error={serviceForm.formState.errors.name?.message}
						>
							<input
								{...serviceForm.register("name")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
							/>
						</Field>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Field
								label="Duration (minutes)"
								error={serviceForm.formState.errors.durationMinutes?.message}
							>
								<input
									type="number"
									min={10}
									max={240}
									{...serviceForm.register("durationMinutes", {
										valueAsNumber: true,
									})}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
							<Field
								label="Price (USD)"
								error={serviceForm.formState.errors.priceUsd?.message}
							>
								<input
									type="number"
									min={0}
									step="0.01"
									{...serviceForm.register("priceUsd", { valueAsNumber: true })}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
						</div>
						<label className="inline-flex items-center gap-2 text-sm font-medium">
							<input type="checkbox" {...serviceForm.register("enabled")} />
							Enabled for booking
						</label>
						<DialogActions
							saving={savingSection === "services"}
							onCancel={() => {
								setServiceOpen(false);
								setEditingServiceId(null);
							}}
						/>
					</form>
				</ModalFrame>
			)}

			{dayOpen && providerSettings && editingDayKey && (
				<ModalFrame
					title={`Edit ${DAY_LABELS[editingDayKey]} Availability`}
					onClose={() => {
						setDayOpen(false);
						setEditingDayKey(null);
					}}
				>
					<form
						onSubmit={dayForm.handleSubmit(saveDayAvailability)}
						className="p-6 space-y-4"
					>
						<label className="inline-flex items-center gap-2 text-sm font-medium">
							<input type="checkbox" {...dayForm.register("enabled")} />
							Available
						</label>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Field
								label="Start"
								error={dayForm.formState.errors.start?.message}
							>
								<input
									type="time"
									{...dayForm.register("start")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
							<Field label="End" error={dayForm.formState.errors.end?.message}>
								<input
									type="time"
									{...dayForm.register("end")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
						</div>
						<Field
							label="Visit Type"
							error={dayForm.formState.errors.visitType?.message}
						>
							<select
								{...dayForm.register("visitType")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
							>
								<option value="all">All</option>
								<option value="telehealth">Telehealth</option>
								<option value="in_person">In-person</option>
							</select>
						</Field>
						<DialogActions
							saving={savingSection === "availability"}
							onCancel={() => {
								setDayOpen(false);
								setEditingDayKey(null);
							}}
						/>
					</form>
				</ModalFrame>
			)}

			{overrideOpen && providerSettings && (
				<ModalFrame
					title={editingOverrideId ? "Edit Date Override" : "New Date Override"}
					onClose={() => {
						setOverrideOpen(false);
						setEditingOverrideId(null);
					}}
				>
					<form
						onSubmit={dateOverrideForm.handleSubmit(saveDateOverride)}
						className="p-6 space-y-4"
					>
						<Field
							label="Date"
							error={dateOverrideForm.formState.errors.date?.message}
						>
							<input
								type="date"
								{...dateOverrideForm.register("date")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
							/>
						</Field>
						<label className="inline-flex items-center gap-2 text-sm font-medium">
							<input
								type="checkbox"
								{...dateOverrideForm.register("unavailable")}
							/>
							Mark entire date as unavailable
						</label>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Field
								label="Start"
								error={dateOverrideForm.formState.errors.start?.message}
							>
								<input
									type="time"
									{...dateOverrideForm.register("start")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
							<Field
								label="End"
								error={dateOverrideForm.formState.errors.end?.message}
							>
								<input
									type="time"
									{...dateOverrideForm.register("end")}
									className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								/>
							</Field>
						</div>
						<Field
							label="Note"
							error={dateOverrideForm.formState.errors.note?.message}
						>
							<input
								{...dateOverrideForm.register("note")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
							/>
						</Field>
						<DialogActions
							saving={savingSection === "availability"}
							onCancel={() => {
								setOverrideOpen(false);
								setEditingOverrideId(null);
							}}
						/>
					</form>
				</ModalFrame>
			)}

			{connectAppOpen && editingAppKey && (
				<ModalFrame
					title={`Connect ${appDirectory.find((app) => app.key === editingAppKey)?.name ?? "App"}`}
					subtitle="Provide account label used for this integration."
					onClose={() => {
						setConnectAppOpen(false);
						setEditingAppKey(null);
					}}
				>
					<form
						onSubmit={connectedAppForm.handleSubmit(connectApp)}
						className="p-6 space-y-4"
					>
						<Field
							label="Account Label"
							error={connectedAppForm.formState.errors.accountLabel?.message}
						>
							<input
								{...connectedAppForm.register("accountLabel")}
								className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
								placeholder="clinic@domain.com"
							/>
						</Field>
						<DialogActions
							saving={savingSection === "connectedApps"}
							onCancel={() => {
								setConnectAppOpen(false);
								setEditingAppKey(null);
							}}
						/>
					</form>
				</ModalFrame>
			)}
		</div>
	);
}

function Field({
	label,
	error,
	children,
}: {
	label: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
				{label}
			</label>
			{children}
			{error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
		</div>
	);
}

function DialogActions({
	saving,
	onCancel,
}: {
	saving: boolean;
	onCancel: () => void;
}) {
	return (
		<div className="pt-2 flex items-center justify-end gap-2">
			<button
				type="button"
				onClick={onCancel}
				className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={saving}
				className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
			>
				<Save className="w-3.5 h-3.5" />
				{saving ? "Saving..." : "Save"}
			</button>
		</div>
	);
}
