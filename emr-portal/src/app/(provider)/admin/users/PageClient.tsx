"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Check,
    CheckCircle2,
    Edit2,
    Key,
    Loader2,
    Mail,
    Phone,
    RefreshCw,
    Save,
    Search,
    Shield,
    ShieldAlert,
    Trash2,
    User,
    UserPlus,
    Users,
    X,
    XCircle
} from 'lucide-react';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';
import { apiFetchJson } from '@/lib/api-client';
import {
    adminCreateUserSchema,
    adminUpdateUserSchema,
    createAdminUserFormDefaults,
    createAdminUserUpdateDefaults,
    DOSESPOT_CLINICIAN_SPECIALTIES,
    DOSESPOT_PDMP_ROLE_TYPES,
    DOSESPOT_PHONE_TYPES,
    formatDoseSpotEnumLabel,
    normalizeDoseSpotPdmpRoleType,
    type AdminCreateUserInput,
    type AdminUpdateUserInput
} from '@/lib/dosespot-clinician-profile';
import { syncDoseSpotClinician } from '@/lib/dosespot-clinician-sync';
import { ensureDoseSpotPatientLink } from '@/lib/dosespot-patient-sync';
import { shouldUsePatientsCollection } from '@/lib/user-record-scope';

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    roles?: string[];
    personaGroupId?: string | null;
    disabled: boolean;
    creationTime: string;
    lastSignInTime: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    sex?: string;
    prefix?: string;
    middleName?: string;
    suffix?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    primaryPhoneType?: string;
    primaryFax?: string;
    npiNumber?: string;
    deaNumber?: string;
    stateLicenseNumber?: string;
    stateLicenseState?: string;
    clinicianSpecialtyType?: string;
    pdmpRoleType?: string;
    epcsRequested?: boolean;
    active?: boolean;
    doseSpotClinicianId?: string;
    doseSpotPatientId?: string;
    doseSpot?: {
        synced?: boolean;
        registrationStatus?: string | null;
        syncStatus?: string | null;
        lastSyncError?: string | null;
        lastError?: string | null;
        candidatePatientIds?: number[];
    };
}

type ActionDialogState =
    | { type: 'toggle-status'; user: UserData }
    | { type: 'delete-user'; user: UserData }
    | { type: 'reset-password'; user: UserData }
    | { type: 'reset-password-result'; user: UserData; link: string };

function isProviderLike(role: string | null | undefined): boolean {
    return ['provider', 'doctor', 'clinician'].includes((role ?? '').trim().toLowerCase());
}

function isPatientLike(role: string | null | undefined): boolean {
    return (role ?? '').trim().toLowerCase() === 'patient';
}

function isDoseSpotClinicianSynced(user: Pick<UserData, 'doseSpotClinicianId' | 'doseSpot'>): boolean {
    const clinicianId = (user.doseSpotClinicianId ?? '').trim();
    return user.doseSpot?.synced === true || clinicianId.length > 0;
}

function isDoseSpotPatientSynced(user: Pick<UserData, 'doseSpotPatientId' | 'doseSpot'>): boolean {
    const patientId = (user.doseSpotPatientId ?? '').trim();
    const lastError = (user.doseSpot?.lastError ?? '').trim();
    return user.doseSpot?.syncStatus === 'ready' || (patientId.length > 0 && lastError.length === 0);
}

function formatDoseSpotFieldList(fields: string[]): string {
    const labels: Record<string, string> = {
        firstName: 'first name',
        lastName: 'last name',
        dateOfBirth: 'date of birth',
        address1: 'address',
        city: 'city',
        state: 'state',
        zipCode: 'ZIP code',
        primaryPhone: 'phone'
    };

    return fields.map((field) => labels[field] ?? field).join(', ');
}

function getPatientDoseSpotIssueMessage(result: {
    lastError?: string | null;
    missingFields: string[];
    candidatePatientIds: number[];
    message: string;
}): string {
    if (result.lastError) {
        return result.lastError;
    }

    if (result.missingFields.length > 0) {
        return `Missing DoseSpot fields: ${formatDoseSpotFieldList(result.missingFields)}`;
    }

    if (result.candidatePatientIds.length > 0) {
        return `${result.message} Matches: ${result.candidatePatientIds.join(', ')}`;
    }

    return result.message;
}

function getPatientDoseSpotStatusLabel(user: UserData): string {
    const syncStatus = user.doseSpot?.syncStatus ?? null;
    if (syncStatus === 'ready' || user.doseSpotPatientId) {
        return 'Synced';
    }
    if (syncStatus === 'blocked') {
        return 'Blocked';
    }
    if (syncStatus === 'ambiguous_match') {
        return 'Needs review';
    }
    if (syncStatus === 'pending_retry') {
        return 'Retry needed';
    }
    return 'Not synced';
}

function mergeFirestoreProfile(base: UserData, source: Record<string, unknown>): UserData {
    const doseSpotSource = typeof source.doseSpot === 'object' && source.doseSpot !== null
        ? source.doseSpot as {
            synced?: unknown;
            registrationStatus?: unknown;
            syncStatus?: unknown;
            lastSyncError?: unknown;
            lastError?: unknown;
            candidatePatientIds?: unknown;
        }
        : null;

    return {
        ...base,
        phone: typeof source.phone === 'string' ? source.phone : (base.phone ?? ''),
        firstName: typeof source.firstName === 'string' ? source.firstName : (base.firstName ?? ''),
        lastName: typeof source.lastName === 'string' ? source.lastName : (base.lastName ?? ''),
        dob: typeof source.dob === 'string' ? source.dob : (typeof source.dateOfBirth === 'string' ? source.dateOfBirth : (base.dob ?? '')),
        sex: typeof source.sex === 'string' ? source.sex : (typeof source.gender === 'string' ? source.gender : (base.sex ?? '')),
        prefix: typeof source.prefix === 'string' ? source.prefix : '',
        middleName: typeof source.middleName === 'string' ? source.middleName : '',
        suffix: typeof source.suffix === 'string' ? source.suffix : '',
        address1: typeof source.address1 === 'string' ? source.address1 : (typeof source.address === 'string' ? source.address : ''),
        address2: typeof source.address2 === 'string' ? source.address2 : '',
        city: typeof source.city === 'string' ? source.city : '',
        state: typeof source.state === 'string' ? source.state : '',
        zipCode: typeof source.zipCode === 'string' ? source.zipCode : (typeof source.zip === 'string' ? source.zip : ''),
        primaryPhoneType: typeof source.primaryPhoneType === 'string' ? source.primaryPhoneType : 'Work',
        primaryFax: typeof source.primaryFax === 'string' ? source.primaryFax : '',
        npiNumber: typeof source.npiNumber === 'string' ? source.npiNumber : (typeof source.npi === 'string' ? source.npi : ''),
        deaNumber: typeof source.deaNumber === 'string' ? source.deaNumber : '',
        stateLicenseNumber: typeof source.stateLicenseNumber === 'string' ? source.stateLicenseNumber : '',
        stateLicenseState: typeof source.stateLicenseState === 'string' ? source.stateLicenseState : '',
        clinicianSpecialtyType: typeof source.clinicianSpecialtyType === 'string' ? source.clinicianSpecialtyType : (typeof source.specialty === 'string' ? source.specialty : ''),
        pdmpRoleType: normalizeDoseSpotPdmpRoleType(typeof source.pdmpRoleType === 'string' ? source.pdmpRoleType : ''),
        epcsRequested: typeof source.epcsRequested === 'boolean' ? source.epcsRequested : true,
        active: typeof source.active === 'boolean' ? source.active : !base.disabled,
        roles: Array.isArray(source.roles) ? source.roles : (base.roles ?? []),
        personaGroupId: typeof source.personaGroupId === 'string' ? source.personaGroupId : (base.personaGroupId ?? null),
        doseSpotClinicianId: source.doseSpotClinicianId != null ? String(source.doseSpotClinicianId) : (base.doseSpotClinicianId ?? ''),
        doseSpotPatientId: source.doseSpotPatientId != null ? String(source.doseSpotPatientId) : (base.doseSpotPatientId ?? ''),
        doseSpot: doseSpotSource
            ? {
                synced: typeof doseSpotSource.synced === 'boolean'
                    ? doseSpotSource.synced
                    : (base.doseSpot?.synced ?? false),
                registrationStatus: typeof doseSpotSource.registrationStatus === 'string'
                    ? doseSpotSource.registrationStatus ?? null
                    : (base.doseSpot?.registrationStatus ?? null),
                syncStatus: typeof doseSpotSource.syncStatus === 'string'
                    ? doseSpotSource.syncStatus ?? null
                    : (base.doseSpot?.syncStatus ?? null),
                lastSyncError: typeof doseSpotSource.lastSyncError === 'string'
                    ? doseSpotSource.lastSyncError ?? null
                    : (base.doseSpot?.lastSyncError ?? null),
                lastError: typeof doseSpotSource.lastError === 'string'
                    ? doseSpotSource.lastError ?? null
                    : (base.doseSpot?.lastError ?? null),
                candidatePatientIds: Array.isArray(doseSpotSource.candidatePatientIds)
                    ? doseSpotSource.candidatePatientIds
                        .map((value) => {
                            if (typeof value === 'number' && Number.isFinite(value)) return value;
                            if (typeof value === 'string') {
                                const parsed = Number.parseInt(value, 10);
                                return Number.isFinite(parsed) ? parsed : null;
                            }
                            return null;
                        })
                        .filter((value): value is number => value !== null)
                    : (base.doseSpot?.candidatePatientIds ?? [])
            }
            : (base.doseSpot ?? {
                synced: false,
                registrationStatus: null,
                syncStatus: null,
                lastSyncError: null,
                lastError: null,
                candidatePatientIds: []
            })
    };
}

function mapUserToEditValues(user: UserData): AdminUpdateUserInput {
    return {
        ...createAdminUserUpdateDefaults(),
        firstName: user.firstName ?? user.displayName.split(' ')[0] ?? '',
        lastName: user.lastName ?? user.displayName.split(' ').slice(1).join(' ') ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        dob: user.dob ?? '',
        sex: (user.sex as AdminUpdateUserInput['sex']) ?? '',
        role: (user.role as AdminUpdateUserInput['role']) ?? 'patient',
        roles: user.roles?.length ? user.roles : [user.role || 'patient'],
        personaGroupId: user.personaGroupId || null,
        prefix: user.prefix ?? '',
        middleName: user.middleName ?? '',
        suffix: user.suffix ?? '',
        address1: user.address1 ?? '',
        address2: user.address2 ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        zipCode: user.zipCode ?? '',
        primaryPhoneType: (user.primaryPhoneType as AdminUpdateUserInput['primaryPhoneType']) ?? 'Work',
        primaryFax: user.primaryFax ?? '',
        npiNumber: user.npiNumber ?? '',
        deaNumber: user.deaNumber ?? '',
        stateLicenseNumber: user.stateLicenseNumber ?? '',
        stateLicenseState: user.stateLicenseState ?? '',
        clinicianSpecialtyType: (user.clinicianSpecialtyType as AdminUpdateUserInput['clinicianSpecialtyType']) ?? '',
        pdmpRoleType: normalizeDoseSpotPdmpRoleType(user.pdmpRoleType) as AdminUpdateUserInput['pdmpRoleType'],
        epcsRequested: user.epcsRequested ?? true,
        active: user.active ?? !user.disabled
    };
}

export default function UserManagementPage() {
    const queryClient = useQueryClient();
    const [personaGroups, setPersonaGroups] = useState<any[]>([]);
    const [systemRoles, setSystemRoles] = useState<string[]>(['patient', 'provider', 'admin', 'staff', 'radiologist']);
    
    React.useEffect(() => {
        import('firebase/firestore').then(({ collection, onSnapshot }) => {
            return onSnapshot(collection(db, 'personaGroups'), (snap) => {
                setPersonaGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        });
    }, []);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string | null>(null);
    const [sortCol, setSortCol] = useState<'name' | 'role' | 'created' | 'login'>('created');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editPhone, setEditPhone] = useState('');
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [savingPhone, setSavingPhone] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);

    const createForm = useForm<AdminCreateUserInput>({
        resolver: zodResolver(adminCreateUserSchema),
        defaultValues: createAdminUserFormDefaults()
    });
    const editForm = useForm<AdminUpdateUserInput>({
        resolver: zodResolver(adminUpdateUserSchema),
        defaultValues: createAdminUserUpdateDefaults()
    });

    const createRole = createForm.watch('role');
    const editRole = editForm.watch('role');

    const toggleSort = (col: 'name' | 'role' | 'created' | 'login') => {
        if (sortCol === col) {
            setSortDir((prev) => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
    };

    const usersQueryKey = ['admin-users'] as const;

    const updateUsersCache = (updater: (items: UserData[]) => UserData[]) => {
        queryClient.setQueryData<UserData[]>(usersQueryKey, (current) => (
            Array.isArray(current) ? updater(current) : current
        ));
    };

    const usersQuery = useQuery({
        queryKey: usersQueryKey,
        queryFn: async () => {
            const data = await apiFetchJson<{
                success?: boolean;
                users?: UserData[];
                error?: string;
            }>('/api/admin/users', {
                method: 'GET',
                cache: 'no-store',
                user: auth.currentUser,
            });

            if (!data.success || !data.users) {
                throw new Error(data.error || 'Failed to load users.');
            }

            return data.users;
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ uid, body }: { uid: string; body: Record<string, unknown> }) => (
            apiFetchJson<{ success?: boolean; error?: string }>(`/api/admin/users/${uid}`, {
                method: 'PATCH',
                body,
                user: auth.currentUser,
            })
        ),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: usersQueryKey });
        }
    });

    const createUserMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) => apiFetchJson<{
            success?: boolean;
            error?: string;
            uid?: string;
            user?: {
                uid: string;
                email?: string;
                displayName?: string;
                role?: string;
            };
        }>('/api/admin/users', {
            method: 'POST',
            body,
            user: auth.currentUser,
        }),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: usersQueryKey });
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (uid: string) => apiFetchJson<{ success?: boolean; error?: string }>(`/api/admin/users/${uid}`, {
            method: 'DELETE',
            user: auth.currentUser,
        }),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: usersQueryKey });
        }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: (uid: string) => apiFetchJson<{
            success?: boolean;
            error?: string;
            link?: string;
        }>(`/api/admin/users/${uid}/reset`, {
            method: 'POST',
            user: auth.currentUser,
        })
    });

    const syncClinicianMutation = useMutation({
        mutationFn: async (clinicianUid: string) => {
            if (!auth.currentUser) {
                throw new Error('Please sign in again to sync DoseSpot clinicians.');
            }

            return syncDoseSpotClinician(auth.currentUser, { clinicianUid });
        },
        onSuccess: (result) => {
            const syncErrorMessage = result.synced
                ? null
                : (result.missingFields.length > 0
                    ? `Missing DoseSpot fields: ${result.missingFields.join(', ')}`
                    : result.message);
            setSelectedUser((current) => current && current.uid === result.clinicianUid
                ? {
                    ...current,
                    doseSpotClinicianId: result.clinicianId ? String(result.clinicianId) : current.doseSpotClinicianId,
                    doseSpot: {
                        ...(current.doseSpot ?? {}),
                        synced: result.synced,
                        registrationStatus: result.registrationStatus,
                        lastSyncError: syncErrorMessage
                    }
                }
                : current);
            void queryClient.invalidateQueries({ queryKey: usersQueryKey });
            if (result.synced) {
                toast.success(result.message);
            } else {
                toast.error(syncErrorMessage ?? result.message);
            }
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'DoseSpot sync failed.';
            toast.error(message);
        }
    });

    const syncPatientMutation = useMutation({
        mutationFn: async (patientUid: string) => {
            if (!auth.currentUser) {
                throw new Error('Please sign in again to sync DoseSpot patients.');
            }

            return ensureDoseSpotPatientLink(auth.currentUser, {
                patientUid,
                updateExisting: true
            });
        },
        onSuccess: (result) => {
            setSelectedUser((current) => current && current.uid === result.patientUid
                ? {
                    ...current,
                    doseSpotPatientId: result.doseSpotPatientId ? String(result.doseSpotPatientId) : '',
                    doseSpot: {
                        ...(current.doseSpot ?? {}),
                        syncStatus: result.syncStatus,
                        lastError: result.lastError ?? null,
                        candidatePatientIds: result.candidatePatientIds
                    }
                }
                : current);
            void queryClient.invalidateQueries({ queryKey: usersQueryKey });

            if (result.syncStatus === 'ready') {
                toast.success(result.message);
                return;
            }

            toast.error(getPatientDoseSpotIssueMessage(result));
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'DoseSpot patient sync failed.';
            toast.error(message);
        }
    });

    const users = usersQuery.data ?? [];
    const loading = usersQuery.isLoading;
    const effectiveError = createError ?? (usersQuery.error instanceof Error ? usersQuery.error.message : null);
    const selectedProviderDoseSpotSynced = selectedUser ? isDoseSpotClinicianSynced(selectedUser) : false;
    const selectedPatientDoseSpotSynced = selectedUser ? isDoseSpotPatientSynced(selectedUser) : false;

    const handleSelectUser = async (user: UserData) => {
        setSelectedUser(user);
        setIsEditingPhone(false);
        setDetailLoading(true);

        try {
            const [userSnap, patientSnap] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                shouldUsePatientsCollection(user.role)
                    ? getDoc(doc(db, 'patients', user.uid))
                    : Promise.resolve(null)
            ]);

            const merged = mergeFirestoreProfile(
                user,
                {
                    ...((patientSnap && patientSnap.exists()) ? patientSnap.data() : {}),
                    ...(userSnap.exists() ? userSnap.data() : {})
                }
            );

            setEditPhone(merged.phone ?? '');
            setSelectedUser(merged);
            return merged;
        } catch {
            setEditPhone(user.phone ?? '');
            return user;
        } finally {
            setDetailLoading(false);
        }
    };

    const openCreateModal = () => {
        createForm.reset(createAdminUserFormDefaults());
        setCreateError(null);
        setIsCreateModalOpen(true);
    };

    const openEditModal = (user: UserData) => {
        editForm.reset(mapUserToEditValues(user));
        setEditError(null);
        setIsEditModalOpen(true);
    };

    const handleCreateUser = createForm.handleSubmit(async (values) => {
        try {
            setCreateError(null);
            const data = await createUserMutation.mutateAsync(values);
            if (!data.success) {
                throw new Error(data.error || 'Failed to create user.');
            }
            const createdUid = data.uid;
            if (createdUid) {
                const now = new Date().toISOString();
                updateUsersCache((items) => [
                    {
                        uid: createdUid,
                        email: data.user?.email ?? values.email,
                        displayName: data.user?.displayName ?? `${values.firstName} ${values.lastName}`.trim(),
                        role: data.user?.role ?? values.role,
                        disabled: false,
                        creationTime: now,
                        lastSignInTime: '',
                        phone: values.phone,
                        firstName: values.firstName,
                        lastName: values.lastName,
                        dob: values.dob,
                        sex: values.sex,
                        prefix: values.prefix,
                        middleName: values.middleName,
                        suffix: values.suffix,
                        address1: values.address1,
                        address2: values.address2,
                        city: values.city,
                        state: values.state,
                        zipCode: values.zipCode,
                        primaryPhoneType: values.primaryPhoneType,
                        primaryFax: values.primaryFax,
                        npiNumber: values.npiNumber,
                        deaNumber: values.deaNumber,
                        stateLicenseNumber: values.stateLicenseNumber,
                        stateLicenseState: values.stateLicenseState,
                        clinicianSpecialtyType: values.clinicianSpecialtyType,
                        pdmpRoleType: values.pdmpRoleType,
                        epcsRequested: values.epcsRequested,
                        active: values.active,
                        doseSpotClinicianId: '',
                        doseSpotPatientId: '',
                        doseSpot: {
                            synced: false,
                            registrationStatus: null,
                            syncStatus: null,
                            lastSyncError: null,
                            lastError: null,
                            candidatePatientIds: []
                        }
                    },
                    ...items
                ]);
            }
            setIsCreateModalOpen(false);
            createForm.reset(createAdminUserFormDefaults());
            toast.success('User created successfully.');
        } catch (error) {
            setCreateError(error instanceof Error ? error.message : 'Failed to create user.');
        }
    });

    const handleSaveEdit = editForm.handleSubmit(async (values) => {
        if (!selectedUser) return;

        try {
            setEditError(null);
            const data = await updateUserMutation.mutateAsync({
                uid: selectedUser.uid,
                body: values
            });
            if (!data.success) {
                throw new Error(data.error || 'Failed to update user.');
            }

            const updated = {
                ...selectedUser,
                ...values,
                displayName: `${values.firstName} ${values.lastName}`.trim()
            };
            updateUsersCache((items) => items.map((item) => (
                item.uid === selectedUser.uid
                    ? {
                        ...item,
                        ...updated,
                        role: values.role
                    }
                    : item
            )));
            setSelectedUser(updated);
            setEditPhone(values.phone);
            setIsEditModalOpen(false);
            toast.success('User updated successfully.');
        } catch (error) {
            setEditError(error instanceof Error ? error.message : 'Failed to update user.');
        }
    });

    const handleSavePhone = async () => {
        if (!selectedUser) return;

        setSavingPhone(true);
        try {
            const writes = [
                setDoc(doc(db, 'users', selectedUser.uid), { phone: editPhone, updatedAt: new Date() }, { merge: true })
            ];

            if (shouldUsePatientsCollection(selectedUser.role)) {
                writes.push(
                    setDoc(doc(db, 'patients', selectedUser.uid), { phone: editPhone, updatedAt: new Date() }, { merge: true })
                );
            } else {
                writes.push(deleteDoc(doc(db, 'patients', selectedUser.uid)));
            }

            await Promise.all(writes);
            setSelectedUser((current) => current ? { ...current, phone: editPhone } : current);
            setIsEditingPhone(false);
            toast.success('Phone number updated.');
        } catch {
            toast.error('Failed to save phone number.');
        } finally {
            setSavingPhone(false);
        }
    };

    const handleToggleStatus = async (user: UserData) => {
        const nextDisabled = !user.disabled;
        const previousUsers = queryClient.getQueryData<UserData[]>(usersQueryKey);
        const previousSelectedUser = selectedUser;

        updateUsersCache((items) => items.map((item) => (
            item.uid === user.uid
                ? { ...item, disabled: nextDisabled }
                : item
        )));
        setSelectedUser((current) => current?.uid === user.uid
            ? { ...current, disabled: nextDisabled, active: !nextDisabled }
            : current);

        try {
            const data = await updateUserMutation.mutateAsync({
                uid: user.uid,
                body: { disabled: nextDisabled }
            });
            if (!data.success) {
                throw new Error(data.error || 'Failed to update user status.');
            }
            toast.success(nextDisabled ? 'User disabled.' : 'User enabled.');
        } catch (error) {
            queryClient.setQueryData(usersQueryKey, previousUsers);
            setSelectedUser(previousSelectedUser);
            toast.error(error instanceof Error ? error.message : 'Failed to update user status.');
        }
    };

    const handleDeleteUser = async (uid: string) => {
        const previousUsers = queryClient.getQueryData<UserData[]>(usersQueryKey);
        const previousSelectedUser = selectedUser;

        updateUsersCache((items) => items.filter((item) => item.uid !== uid));
        if (selectedUser?.uid === uid) {
            setSelectedUser(null);
        }

        try {
            const data = await deleteUserMutation.mutateAsync(uid);
            if (!data.success) {
                throw new Error(data.error || 'Failed to delete user.');
            }
            toast.success('User deleted.');
        } catch (error) {
            queryClient.setQueryData(usersQueryKey, previousUsers);
            setSelectedUser(previousSelectedUser);
            toast.error(error instanceof Error ? error.message : 'Failed to delete user.');
        }
    };

    const handleGenerateResetLink = async (user: UserData) => {
        try {
            const data = await resetPasswordMutation.mutateAsync(user.uid);
            if (data.success && data.link) {
                setActionDialog({ type: 'reset-password-result', user, link: data.link });
                toast.success('Password reset link generated.');
                return;
            }
            throw new Error(data.error || 'Failed to generate reset link.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to generate reset link.');
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
        const role = user.role?.toLowerCase() || '';
        const matchesRole = !filterRole ||
            (filterRole === 'disabled' ? user.disabled :
                filterRole === 'admin' ? ['admin', 'systems admin'].includes(role) :
                    filterRole === 'provider' ? ['doctor', 'provider'].includes(role) :
                        role === filterRole);
        return matchesSearch && matchesRole;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortCol === 'name') {
            valA = (a.displayName || a.email || '').toLowerCase();
            valB = (b.displayName || b.email || '').toLowerCase();
        } else if (sortCol === 'role') {
            valA = (a.role || '').toLowerCase();
            valB = (b.role || '').toLowerCase();
        } else if (sortCol === 'created') {
            valA = a.creationTime ? new Date(a.creationTime).getTime() : 0;
            valB = b.creationTime ? new Date(b.creationTime).getTime() : 0;
        } else if (sortCol === 'login') {
            valA = a.lastSignInTime ? new Date(a.lastSignInTime).getTime() : 0;
            valB = b.lastSignInTime ? new Date(b.lastSignInTime).getTime() : 0;
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-bold">
                        <Users className="h-6 w-6 text-brand" />
                        User Management
                    </h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                        Manage system access, provider enrollment data, and DoseSpot sync state.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-all active:scale-95 hover:bg-brand-600"
                >
                    <UserPlus className="h-4 w-4" />
                    Add New User
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <StatCard label="Total Users" value={users.length} icon={Users} color="text-brand" bg="bg-brand/10" active={filterRole === null} onClick={() => setFilterRole(null)} />
                <StatCard label="Admins" value={users.filter((user) => ['admin', 'systems admin'].includes(user.role?.toLowerCase())).length} icon={Shield} color="text-purple-500" bg="bg-purple-500/10" active={filterRole === 'admin'} onClick={() => setFilterRole('admin')} />
                <StatCard label="Providers" value={users.filter((user) => ['doctor', 'provider'].includes(user.role?.toLowerCase())).length} icon={User} color="text-blue-500" bg="bg-blue-500/10" active={filterRole === 'provider'} onClick={() => setFilterRole('provider')} />
                <StatCard label="Disabled" value={users.filter((user) => user.disabled).length} icon={AlertCircle} color="text-red-500" bg="bg-red-500/10" active={filterRole === 'disabled'} onClick={() => setFilterRole('disabled')} />
            </div>

            <div className="flex items-start gap-6">
                <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter by name or email..."
                                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-brand dark:border-slate-700 dark:bg-slate-900"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                        {filterRole && (
                            <button onClick={() => setFilterRole(null)} className="flex items-center gap-1 text-xs font-bold text-slate-400 transition-colors hover:text-brand">
                                <XCircle className="h-3 w-3" />
                                Clear filter: {filterRole}
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
                                    <th className="cursor-pointer px-6 py-4 transition-colors hover:text-brand" onClick={() => toggleSort('name')}>
                                        <div className="flex items-center gap-1">User {sortCol === 'name' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div>
                                    </th>
                                    <th className="cursor-pointer px-6 py-4 transition-colors hover:text-brand" onClick={() => toggleSort('role')}>
                                        <div className="flex items-center gap-1">Role {sortCol === 'role' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div>
                                    </th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="cursor-pointer px-6 py-4 transition-colors hover:text-brand" onClick={() => toggleSort('created')}>
                                        <div className="flex items-center gap-1">Created {sortCol === 'created' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div>
                                    </th>
                                    <th className="cursor-pointer px-6 py-4 transition-colors hover:text-brand" onClick={() => toggleSort('login')}>
                                        <div className="flex items-center gap-1">Last Login {sortCol === 'login' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={index} className="animate-pulse">
                                            <td colSpan={6} className="h-16 bg-slate-100/10 px-6 py-4" />
                                        </tr>
                                    ))
                                ) : sortedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="h-8 w-8 opacity-20" />
                                                <span>No users found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sortedUsers.map((user) => (
                                        <tr
                                            key={user.uid}
                                            className={`group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30 ${selectedUser?.uid === user.uid ? 'border-l-2 border-brand bg-brand/5' : ''}`}
                                            onClick={() => void handleSelectUser(user)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${user.disabled ? 'bg-slate-100 text-slate-400' : 'bg-brand/10 text-brand dark:bg-brand/20'}`}>
                                                        {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${user.disabled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                                            {user.displayName}
                                                        </p>
                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{getRoleBadges(user)}</td>
                                            <td className="px-6 py-4">
                                                {user.disabled ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-red-500"><XCircle className="h-3.5 w-3.5" /> Disabled</span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {user.creationTime ? new Date(user.creationTime).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={async () => {
                                                            const merged = await handleSelectUser(user);
                                                            openEditModal(merged);
                                                        }}
                                                        className="rounded-lg p-2 text-brand transition-colors hover:bg-brand/10"
                                                        title="Edit account"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setActionDialog({ type: 'reset-password', user });
                                                        }}
                                                        className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50"
                                                        title="Generate reset link"
                                                    >
                                                        <Key className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setActionDialog({ type: 'toggle-status', user })}
                                                        className={`rounded-lg p-2 transition-colors ${user.disabled ? 'text-emerald-500 hover:bg-emerald-50' : 'text-orange-500 hover:bg-orange-50'}`}
                                                        title={user.disabled ? 'Enable account' : 'Disable account'}
                                                    >
                                                        {user.disabled ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setActionDialog({ type: 'delete-user', user })}
                                                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selectedUser && (
                    <div className="w-80 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between border-b border-brand/10 bg-brand/5 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-black text-brand">
                                    {selectedUser.displayName?.charAt(0) || selectedUser.email?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedUser.displayName}</p>
                                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <DetailField label="Roles" value={getRoleBadges(selectedUser)} />
                            <DetailField label="Status" value={selectedUser.disabled
                                ? <span className="flex items-center gap-1 text-xs font-black text-red-500"><XCircle className="h-3.5 w-3.5" /> Disabled</span>
                                : <span className="flex items-center gap-1 text-xs font-black text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>} />
                            {selectedUser.dob && <DetailField label="Date of Birth" value={<span className="text-xs text-slate-600 dark:text-slate-300">{selectedUser.dob}</span>} />}
                            {selectedUser.sex && <DetailField label="Sex" value={<span className="text-xs text-slate-600 dark:text-slate-300">{selectedUser.sex}</span>} />}
                            <DetailField label="Created" value={<span className="text-xs text-slate-600 dark:text-slate-300">{selectedUser.creationTime ? new Date(selectedUser.creationTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>} />
                            <DetailField label="Last Login" value={<span className="text-xs text-slate-600 dark:text-slate-300">{selectedUser.lastSignInTime ? new Date(selectedUser.lastSignInTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Never'}</span>} />

                            <div>
                                <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</p>
                                {detailLoading ? (
                                    <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                                ) : isEditingPhone ? (
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={editPhone}
                                                onChange={(event) => setEditPhone(event.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                                autoFocus
                                                className="w-full rounded-lg border border-brand bg-slate-50 py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 dark:bg-slate-900/50"
                                            />
                                        </div>
                                        <button onClick={() => void handleSavePhone()} disabled={savingPhone} className="rounded-lg bg-brand p-1.5 text-white transition-colors hover:bg-brand-600 disabled:opacity-50">
                                            {savingPhone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                        <button onClick={() => { setIsEditingPhone(false); setEditPhone(selectedUser.phone || ''); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="group/phone flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                            {editPhone || <span className="italic text-slate-400">Not set</span>}
                                        </div>
                                        <button onClick={() => setIsEditingPhone(true)} className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-brand/5 hover:text-brand group-hover/phone:opacity-100">
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isProviderLike(selectedUser.role) && (
                                <>
                                    <DetailField
                                        label="DoseSpot Sync"
                                        value={selectedProviderDoseSpotSynced
                                            ? <span className="flex items-center gap-1 text-xs font-black text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /> Synced</span>
                                            : <span className="text-xs font-black text-amber-500">Not synced</span>}
                                    />
                                    <DetailField
                                        label="Registration Status"
                                        value={<span className="text-xs text-slate-600 dark:text-slate-300">{selectedUser.doseSpot?.registrationStatus || 'Not available yet'}</span>}
                                    />
                                    <DetailField
                                        label="DoseSpot Clinician ID"
                                        value={<span className="text-xs font-mono text-slate-600 dark:text-slate-300">{selectedUser.doseSpotClinicianId || 'Not linked'}</span>}
                                    />
                                    {selectedUser.doseSpot?.lastSyncError && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                                            {selectedUser.doseSpot.lastSyncError}
                                        </div>
                                    )}
                                </>
                            )}

                            {isPatientLike(selectedUser.role) && (
                                <>
                                    <DetailField
                                        label="DoseSpot Sync"
                                        value={selectedUser.doseSpot?.syncStatus === 'ready' || selectedUser.doseSpotPatientId
                                            ? <span className="flex items-center gap-1 text-xs font-black text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /> {getPatientDoseSpotStatusLabel(selectedUser)}</span>
                                            : selectedUser.doseSpot?.syncStatus === 'blocked'
                                                ? <span className="flex items-center gap-1 text-xs font-black text-red-500"><XCircle className="h-3.5 w-3.5" /> {getPatientDoseSpotStatusLabel(selectedUser)}</span>
                                                : <span className="text-xs font-black text-amber-500">{getPatientDoseSpotStatusLabel(selectedUser)}</span>}
                                    />
                                    <DetailField
                                        label="DoseSpot Patient ID"
                                        value={<span className="text-xs font-mono text-slate-600 dark:text-slate-300">{selectedUser.doseSpotPatientId || 'Not linked'}</span>}
                                    />
                                    {selectedUser.doseSpot?.candidatePatientIds && selectedUser.doseSpot.candidatePatientIds.length > 0 && (
                                        <DetailField
                                            label="Candidate Matches"
                                            value={<span className="text-xs font-mono text-slate-600 dark:text-slate-300">{selectedUser.doseSpot.candidatePatientIds.join(', ')}</span>}
                                        />
                                    )}
                                    {selectedUser.doseSpot?.lastError && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                                            {selectedUser.doseSpot.lastError}
                                        </div>
                                    )}
                                </>
                            )}

                            <DetailField label="UID" value={<span className="break-all font-mono text-[10px] text-slate-400">{selectedUser.uid}</span>} />
                        </div>

                        <div className="flex flex-col gap-2 px-5 pb-5">
                            {isProviderLike(selectedUser.role) && !selectedProviderDoseSpotSynced && (
                                <button
                                    onClick={() => void syncClinicianMutation.mutateAsync(selectedUser.uid)}
                                    disabled={syncClinicianMutation.isPending}
                                    title="Sync to DoseSpot"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 py-2.5 text-xs font-black text-sky-700 transition-all hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {syncClinicianMutation.isPending && syncClinicianMutation.variables === selectedUser.uid
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <RefreshCw className="h-3.5 w-3.5" />}
                                    Sync to DoseSpot
                                </button>
                            )}
                            {isPatientLike(selectedUser.role) && !selectedPatientDoseSpotSynced && (
                                <button
                                    onClick={() => void syncPatientMutation.mutateAsync(selectedUser.uid)}
                                    disabled={syncPatientMutation.isPending}
                                    title="Sync patient demographics to DoseSpot"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 py-2.5 text-xs font-black text-sky-700 transition-all hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {syncPatientMutation.isPending && syncPatientMutation.variables === selectedUser.uid
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <RefreshCw className="h-3.5 w-3.5" />}
                                    Sync to DoseSpot
                                </button>
                            )}
                            <button
                                onClick={() => openEditModal(selectedUser)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-black text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-600"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Account
                            </button>
                            <button
                                onClick={() => setActionDialog({ type: 'toggle-status', user: selectedUser })}
                                className={`w-full rounded-xl border py-2.5 text-xs font-black transition-all ${selectedUser.disabled ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                            >
                                {selectedUser.disabled ? 'Enable Account' : 'Disable Account'}
                            </button>
                            <button
                                onClick={() => setActionDialog({ type: 'delete-user', user: selectedUser })}
                                className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-black text-red-500 transition-all hover:bg-red-100"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                        <div className="relative bg-brand p-6 text-white">
                            <h3 className="flex items-center gap-2 text-xl font-bold">
                                <Edit2 className="h-5 w-5" />
                                Edit Account
                            </h3>
                            <p className="mt-1 text-sm text-brand-100">
                                Editing: <strong>{selectedUser.displayName}</strong>
                            </p>
                            <button onClick={() => setIsEditModalOpen(false)} className="absolute right-6 top-6 rounded-full p-2 transition-colors hover:bg-white/10">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="max-h-[calc(90vh-96px)] space-y-4 overflow-y-auto p-6">
                            {editError && (
                                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    {editError}
                                </div>
                            )}
                            <UserFormFields
                                form={editForm}
                                isCreate={false}
                                showProviderFields={editRole === 'provider'}
                                showDoseSpotAddressFields={editRole === 'provider' || editRole === 'patient'}
                                personaGroups={personaGroups}
                                systemRoles={systemRoles}
                            />
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 rounded-xl py-2.5 font-bold text-slate-600 transition-all hover:bg-slate-100 dark:text-slate-300">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateUserMutation.isPending}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 font-bold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-600 disabled:opacity-50"
                                >
                                    {updateUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                        <div className="relative bg-brand p-6 text-white">
                            <h3 className="flex items-center gap-2 text-xl font-bold">
                                <UserPlus className="h-6 w-6" />
                                Create New Account
                            </h3>
                            <p className="mt-1 text-sm text-brand-100">Register a new user and capture the provider fields needed for DoseSpot sync.</p>
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute right-6 top-6 rounded-full p-2 transition-colors hover:bg-white/10">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="max-h-[calc(90vh-96px)] space-y-4 overflow-y-auto p-6">
                            {effectiveError && (
                                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    {effectiveError}
                                </div>
                            )}
                            <UserFormFields
                                form={createForm}
                                isCreate
                                showProviderFields={createRole === 'provider'}
                                showDoseSpotAddressFields={createRole === 'provider' || createRole === 'patient'}
                                personaGroups={personaGroups}
                                systemRoles={systemRoles}
                            />
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 rounded-xl py-2.5 font-bold text-slate-600 transition-all hover:bg-slate-100 dark:text-slate-300">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createUserMutation.isPending}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 font-bold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-600 disabled:opacity-50"
                                >
                                    {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    {createUserMutation.isPending ? 'Creating...' : 'Finalize Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {actionDialog && (
                <ActionDialog
                    state={actionDialog}
                    loading={
                        (actionDialog.type === 'toggle-status' && updateUserMutation.isPending) ||
                        (actionDialog.type === 'delete-user' && deleteUserMutation.isPending) ||
                        (actionDialog.type === 'reset-password' && resetPasswordMutation.isPending)
                    }
                    onClose={() => setActionDialog(null)}
                    onConfirm={async () => {
                        if (actionDialog.type === 'toggle-status') {
                            await handleToggleStatus(actionDialog.user);
                            setActionDialog(null);
                            return;
                        }

                        if (actionDialog.type === 'delete-user') {
                            await handleDeleteUser(actionDialog.user.uid);
                            setActionDialog(null);
                            return;
                        }

                        if (actionDialog.type === 'reset-password') {
                            await handleGenerateResetLink(actionDialog.user);
                        }
                    }}
                />
            )}
        </div>
    );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <div>{value}</div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-all dark:bg-slate-800 ${active ? 'border-brand ring-4 ring-brand/5 shadow-md shadow-brand/5' : 'border-slate-200 shadow-sm hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
        >
            <div className={`rounded-xl p-3 ${bg} ${color}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
            </div>
        </button>
    );
}

function ActionDialog({
    state,
    loading,
    onClose,
    onConfirm
}: {
    state: ActionDialogState;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}) {
    const isResultDialog = state.type === 'reset-password-result';

    const title = isResultDialog
        ? 'Password Reset Link'
        : state.type === 'delete-user'
            ? 'Delete User'
            : state.type === 'toggle-status'
                ? (state.user.disabled ? 'Enable User' : 'Disable User')
                : 'Generate Reset Link';

    const description = isResultDialog
        ? 'Share this link securely with the user. It will not be shown again after you close this dialog.'
        : state.type === 'delete-user'
            ? `Delete ${state.user.displayName}? This action cannot be undone.`
            : state.type === 'toggle-status'
                ? `${state.user.disabled ? 'Enable' : 'Disable'} ${state.user.displayName}'s account?`
                : `Generate a password reset link for ${state.user.displayName}?`;

    const confirmLabel = state.type === 'delete-user'
        ? 'Delete User'
        : state.type === 'toggle-status'
            ? (state.user.disabled ? 'Enable Account' : 'Disable Account')
            : 'Generate Link';

    const confirmClassName = state.type === 'delete-user'
        ? 'bg-red-500 hover:bg-red-600'
        : state.type === 'toggle-status' && !state.user.disabled
            ? 'bg-orange-500 hover:bg-orange-600'
            : 'bg-brand hover:bg-brand-600';

    const handleCopy = async () => {
        if (state.type !== 'reset-password-result') return;
        try {
            await navigator.clipboard.writeText(state.link);
            toast.success('Reset link copied.');
        } catch {
            toast.error('Failed to copy reset link.');
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-700">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 p-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{state.user.displayName}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{state.user.email}</p>
                    </div>

                    {state.type === 'reset-password-result' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500">Reset Link</label>
                            <textarea
                                readOnly
                                value={state.link}
                                className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 border-t border-slate-100 p-5 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl py-2.5 font-bold text-slate-600 transition-all hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        {isResultDialog ? 'Close' : 'Cancel'}
                    </button>

                    {isResultDialog ? (
                        <button
                            type="button"
                            onClick={() => void handleCopy()}
                            className="flex-1 rounded-xl bg-brand py-2.5 font-bold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-600"
                        >
                            Copy Link
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void onConfirm()}
                            disabled={loading}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-white shadow-lg transition-all disabled:opacity-50 ${confirmClassName}`}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {loading ? 'Working...' : confirmLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function getRoleBadges(user: UserData) {
    const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role || 'patient'];
    return (
        <div className="flex flex-wrap gap-1">
            {user.personaGroupId && (
                <span title="Inherits roles from Persona Group" className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Group
                </span>
            )}
            {roles.map((role, i) => {
                switch (role?.toLowerCase()) {
                    case 'admin':
                    case 'systems admin':
                        return <span key={i} className="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Admin</span>;
                    case 'staff':
                        return <span key={i} className="rounded-full border border-cyan-200 bg-cyan-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">Staff</span>;
                    case 'doctor':
                    case 'provider':
                        return <span key={i} className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Provider</span>;
                    case 'patient':
                        return <span key={i} className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Patient</span>;
                    default:
                        return <span key={i} className="rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{role}</span>;
                }
            })}
        </div>
    );
}

function UserFormFields({
    form,
    isCreate,
    showProviderFields,
    showDoseSpotAddressFields,
    personaGroups = [],
    systemRoles = []
}: {
    form: any;
    isCreate: boolean;
    showProviderFields: boolean;
    showDoseSpotAddressFields: boolean;
    personaGroups?: any[];
    systemRoles?: string[];
}) {
    const { register, formState: { errors } } = form;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField label="First Name" placeholder="e.g. John" error={errors.firstName?.message} icon={<User className="h-4 w-4 text-slate-400" />} {...register('firstName')} />
                <TextField label="Last Name" placeholder="e.g. Watson" error={errors.lastName?.message} icon={<User className="h-4 w-4 text-slate-400" />} {...register('lastName')} />
                <TextField label="Email Address" type="email" placeholder="john@example.com" error={errors.email?.message} icon={<Mail className="h-4 w-4 text-slate-400" />} {...register('email')} />
                <TextField label="Phone Number" type="tel" placeholder="+1 (555) 000-0000" error={errors.phone?.message} icon={<Phone className="h-4 w-4 text-slate-400" />} {...register('phone')} />
                <TextField label="Date of Birth" type="date" error={errors.dob?.message} {...register('dob')} />
                <SelectField label="Sex" error={errors.sex?.message} {...register('sex')}>
                    <option value="">Select sex...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                </SelectField>
                {isCreate && (
                    <TextField label="Initial Password" type="password" placeholder="Minimum 8 characters" error={(errors as { password?: { message?: string } }).password?.message} icon={<Key className="h-4 w-4 text-slate-400" />} {...register('password' as 'password')} />
                )}
                <SelectField label="Legacy Primary Role" error={errors.role?.message} {...register('role')}>
                    <option value="patient">Patient</option>
                    <option value="provider">Provider (Doctor)</option>
                    <option value="admin">Systems Administrator</option>
                    <option value="staff">Staff</option>
                </SelectField>
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                    <SelectField label="Persona Group" error={errors.personaGroupId?.message} {...register('personaGroupId')}>
                        <option value="">-- No Persona Group (Direct Roles Only) --</option>
                        {personaGroups.map(pg => (
                            <option key={pg.id} value={pg.id}>{pg.name} ({pg.roles?.join(', ')})</option>
                        ))}
                    </SelectField>
                    <SelectField multiple label="Direct Access Roles (Hold Ctrl to select multiple)" error={errors.roles?.message} className="row-span-2" style={{ height: 'auto' }} {...register('roles')}>
                        {systemRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </SelectField>
                </div>
            </div>

            {showDoseSpotAddressFields && (
                <section className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">DoseSpot Patient Demographics</h4>
                        <p className="mt-1 text-xs text-slate-500">These address fields are required before a patient can be synced to DoseSpot.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <TextField label="Address Line 1" placeholder="539 Main St." error={errors.address1?.message} className="md:col-span-2" {...register('address1')} />
                        <TextField label="Address Line 2" placeholder="Suite 204" error={errors.address2?.message} {...register('address2')} />
                        <TextField label="City" placeholder="Dedham" error={errors.city?.message} {...register('city')} />
                        <TextField label="State" placeholder="MA" error={errors.state?.message} {...register('state')} />
                        <TextField label="ZIP Code" placeholder="02026" error={errors.zipCode?.message} {...register('zipCode')} />
                    </div>
                </section>
            )}

            {showProviderFields && (
                <>
                    <section className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">DoseSpot Provider Identity</h4>
                            <p className="mt-1 text-xs text-slate-500">These fields are used to create the clinician in DoseSpot and should be complete before sync.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <TextField label="Prefix" placeholder="Dr." error={errors.prefix?.message} {...register('prefix')} />
                            <TextField label="Middle Name" placeholder="Marie" error={errors.middleName?.message} {...register('middleName')} />
                            <TextField label="Suffix" placeholder="MD" error={errors.suffix?.message} {...register('suffix')} />
                            <SelectField label="Primary Phone Type" error={errors.primaryPhoneType?.message} {...register('primaryPhoneType')}>
                                {DOSESPOT_PHONE_TYPES.map((option) => (
                                    <option key={option} value={option}>{formatDoseSpotEnumLabel(option)}</option>
                                ))}
                            </SelectField>
                            <TextField label="Primary Fax" placeholder="+1 (555) 111-2222" error={errors.primaryFax?.message} {...register('primaryFax')} />
                        </div>
                    </section>

                    <section className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">Prescribing Credentials</h4>
                            <p className="mt-1 text-xs text-slate-500">These are the credential fields DoseSpot expects for clinician creation.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <TextField label="NPI Number" placeholder="1234567890" error={errors.npiNumber?.message} {...register('npiNumber')} />
                            <TextField label="DEA Number" placeholder="AB1234567" error={errors.deaNumber?.message} {...register('deaNumber')} />
                            <TextField label="State License Number" placeholder="LIC-12345" error={errors.stateLicenseNumber?.message} {...register('stateLicenseNumber')} />
                            <TextField label="License State" placeholder="MA" error={errors.stateLicenseState?.message} {...register('stateLicenseState')} />
                            <SelectField label="Clinician Specialty" error={errors.clinicianSpecialtyType?.message} {...register('clinicianSpecialtyType')}>
                                <option value="">Select specialty...</option>
                                {DOSESPOT_CLINICIAN_SPECIALTIES.map((option) => (
                                    <option key={option} value={option}>{formatDoseSpotEnumLabel(option)}</option>
                                ))}
                            </SelectField>
                            <SelectField label="PDMP Role Type" error={errors.pdmpRoleType?.message} {...register('pdmpRoleType')}>
                                <option value="">Select PDMP role...</option>
                                {DOSESPOT_PDMP_ROLE_TYPES.map((option) => (
                                    <option key={option} value={option}>{formatDoseSpotEnumLabel(option)}</option>
                                ))}
                            </SelectField>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" {...register('epcsRequested')} />
                                Request EPCS enrollment
                            </label>
                            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" {...register('active')} />
                                Mark clinician active
                            </label>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

const sharedInputClassName = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-brand dark:border-slate-700 dark:bg-slate-900/50';

const TextField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    icon?: React.ReactNode;
    className?: string;
}>(({ label, error, icon, className, ...props }, ref) => (
    <div className={className}>
        <label className="mb-1.5 ml-1 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</label>
        <div className="relative">
            {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
            <input ref={ref} {...props} className={`${sharedInputClassName} ${icon ? 'pl-10' : ''}`} />
        </div>
        {error ? <p className="mt-1 text-xs font-medium text-red-500">{error}</p> : null}
    </div>
));
TextField.displayName = 'TextField';

const SelectField = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    error?: string;
}>(({ label, error, className, children, ...props }, ref) => (
    <div className={className}>
        <label className="mb-1.5 ml-1 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</label>
        <select ref={ref} {...props} className={sharedInputClassName}>
            {children}
        </select>
        {error ? <p className="mt-1 text-xs font-medium text-red-500">{error}</p> : null}
    </div>
));
SelectField.displayName = 'SelectField';
