"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import type { User as FirebaseUser } from 'firebase/auth';
import { Plus, Send, Shield, Trash2, UserPlus, Users, UserX } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { auth } from '@/lib/firebase';
import type { PatientSummary, ProviderSummary, TeamSummary } from '@/lib/team-types';

interface TeamsApiResponse {
    success?: boolean;
    teams?: TeamSummary[];
    providers?: ProviderSummary[];
    patients?: PatientSummary[];
    team?: TeamSummary | null;
    error?: string;
}

const createTeamSchema = z.object({
    name: z.string().trim().min(2, 'Team name is required.').max(80),
    description: z.string().trim().max(220).optional()
});

const teamDoctorSchema = z.object({
    teamId: z.string().trim().min(1, 'Select a team.'),
    doctorId: z.string().trim().min(1, 'Select a provider.')
});

const assignPatientSchema = z.object({
    teamId: z.string().trim().min(1, 'Select a team.'),
    patientId: z.string().trim().min(1, 'Select a patient.')
});

type CreateTeamValues = z.infer<typeof createTeamSchema>;
type TeamDoctorValues = z.infer<typeof teamDoctorSchema>;
type AssignPatientValues = z.infer<typeof assignPatientSchema>;

async function buildHeaders(activeUser: FirebaseUser): Promise<Record<string, string>> {
    const idToken = await activeUser.getIdToken();
    return {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    };
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export default function ProviderTeamPage() {
    const [teams, setTeams] = useState<TeamSummary[]>([]);
    const [providers, setProviders] = useState<ProviderSummary[]>([]);
    const [patients, setPatients] = useState<PatientSummary[]>([]);
    const [activeUser, setActiveUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMutating, setIsMutating] = useState<string | null>(null);

    const createTeamForm = useForm<CreateTeamValues>({
        resolver: zodResolver(createTeamSchema),
        defaultValues: {
            name: '',
            description: ''
        }
    });

    const addDoctorForm = useForm<TeamDoctorValues>({
        resolver: zodResolver(teamDoctorSchema),
        defaultValues: {
            teamId: '',
            doctorId: ''
        }
    });

    const inviteDoctorForm = useForm<TeamDoctorValues>({
        resolver: zodResolver(teamDoctorSchema),
        defaultValues: {
            teamId: '',
            doctorId: ''
        }
    });

    const assignPatientForm = useForm<AssignPatientValues>({
        resolver: zodResolver(assignPatientSchema),
        defaultValues: {
            teamId: '',
            patientId: ''
        }
    });

    const loadTeamsWorkspace = React.useCallback(async (user: FirebaseUser) => {
        setLoading(true);
        setError(null);

        try {
            const headers = await buildHeaders(user);
            const response = await fetch('/api/teams', {
                method: 'GET',
                headers,
                cache: 'no-store'
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to load team workspace.');
            }

            const nextTeams = payload.teams ?? [];
            const nextProviders = payload.providers ?? [];
            const nextPatients = payload.patients ?? [];

            setTeams(nextTeams);
            setProviders(nextProviders);
            setPatients(nextPatients);

            const ownerTeam = nextTeams.find((team) => team.ownerId === user.uid) ?? nextTeams[0];
            if (ownerTeam) {
                const nextTeamId = ownerTeam.id;
                addDoctorForm.setValue('teamId', nextTeamId);
                inviteDoctorForm.setValue('teamId', nextTeamId);
                assignPatientForm.setValue('teamId', nextTeamId);
            }

            const firstProvider = nextProviders.find((provider) => provider.id !== user.uid);
            if (firstProvider) {
                addDoctorForm.setValue('doctorId', firstProvider.id);
                inviteDoctorForm.setValue('doctorId', firstProvider.id);
            }

            const firstPatient = nextPatients[0];
            if (firstPatient) {
                assignPatientForm.setValue('patientId', firstPatient.id);
            }

            setError(null);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to load team workspace.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [addDoctorForm, assignPatientForm, inviteDoctorForm]);

    React.useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            setActiveUser(user);
            if (!user) {
                setTeams([]);
                setProviders([]);
                setPatients([]);
                setLoading(false);
                return;
            }

            loadTeamsWorkspace(user).catch(() => undefined);
        });

        return () => unsubscribeAuth();
    }, [loadTeamsWorkspace]);

    const ownerTeams = useMemo(() => {
        if (!activeUser) return [];
        return teams.filter((team) => team.ownerId === activeUser.uid);
    }, [activeUser, teams]);

    const providerOptions = useMemo(() => {
        if (!activeUser) return providers;
        return providers.filter((provider) => provider.id !== activeUser.uid);
    }, [activeUser, providers]);

    const patientMap = useMemo(() => {
        return new Map(patients.map((patient) => [patient.id, patient]));
    }, [patients]);

    const handleCreateTeam = createTeamForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to create teams.');
            return;
        }

        const optimisticId = `optimistic-team-${Date.now()}`;
        const optimisticTeam: TeamSummary = {
            id: optimisticId,
            name: values.name.trim(),
            description: asNonEmptyString(values.description ?? ''),
            ownerId: activeUser.uid,
            ownerName: activeUser.displayName ?? activeUser.email?.split('@')[0] ?? 'Provider',
            memberIds: [activeUser.uid],
            members: [
                {
                    id: activeUser.uid,
                    name: activeUser.displayName ?? activeUser.email?.split('@')[0] ?? 'Provider',
                    email: activeUser.email,
                    role: 'provider'
                }
            ],
            patientIds: [],
            pendingInviteDoctorIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const previousTeams = teams;
        setTeams((current) => [optimisticTeam, ...current]);
        setIsMutating('create-team');

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers,
                body: JSON.stringify(values)
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success || !payload.team) {
                throw new Error(payload.error || 'Failed to create team.');
            }

            setTeams((current) => [
                payload.team as TeamSummary,
                ...current.filter((team) => team.id !== optimisticId)
            ]);
            createTeamForm.reset({ name: '', description: '' });
            toast.success('Team created successfully.');
        } catch (createError) {
            const message = createError instanceof Error ? createError.message : 'Failed to create team.';
            setTeams(previousTeams);
            toast.error(message);
        } finally {
            setIsMutating(null);
        }
    });

    const handleAddDoctor = addDoctorForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to update team members.');
            return;
        }

        const provider = providers.find((item) => item.id === values.doctorId);
        const previousTeams = teams;
        setIsMutating(`add-${values.teamId}-${values.doctorId}`);

        setTeams((current) => current.map((team) => {
            if (team.id !== values.teamId) return team;
            if (team.memberIds.includes(values.doctorId)) return team;

            return {
                ...team,
                memberIds: [...team.memberIds, values.doctorId],
                members: [
                    ...team.members,
                    {
                        id: values.doctorId,
                        name: provider?.name ?? 'Provider',
                        email: provider?.email ?? null,
                        role: provider?.role ?? null
                    }
                ]
            };
        }));

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch(`/api/teams/${values.teamId}/members`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ doctorId: values.doctorId })
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success || !payload.team) {
                throw new Error(payload.error || 'Failed to add provider to team.');
            }

            setTeams((current) => current.map((team) => (
                team.id === values.teamId
                    ? payload.team as TeamSummary
                    : team
            )));
            toast.success('Provider added to team.');
        } catch (addError) {
            const message = addError instanceof Error ? addError.message : 'Failed to add provider to team.';
            setTeams(previousTeams);
            toast.error(message);
        } finally {
            setIsMutating(null);
        }
    });

    const handleInviteDoctor = inviteDoctorForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to invite providers.');
            return;
        }

        const previousTeams = teams;
        setIsMutating(`invite-${values.teamId}-${values.doctorId}`);

        setTeams((current) => current.map((team) => (
            team.id === values.teamId
                ? {
                    ...team,
                    pendingInviteDoctorIds: Array.from(new Set([...team.pendingInviteDoctorIds, values.doctorId]))
                }
                : team
        )));

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch(`/api/teams/${values.teamId}/invite`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ doctorId: values.doctorId })
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to send invitation.');
            }

            if (payload.team) {
                setTeams((current) => current.map((team) => (
                    team.id === values.teamId
                        ? payload.team as TeamSummary
                        : team
                )));
            }
            toast.success('Invitation sent.');
        } catch (inviteError) {
            const message = inviteError instanceof Error ? inviteError.message : 'Failed to send invitation.';
            setTeams(previousTeams);
            toast.error(message);
        } finally {
            setIsMutating(null);
        }
    });

    const handleRemoveMember = async (teamId: string, memberId: string) => {
        if (!activeUser) {
            toast.error('Please sign in again to update team members.');
            return;
        }

        const previousTeams = teams;
        setIsMutating(`remove-${teamId}-${memberId}`);

        setTeams((current) => current.map((team) => (
            team.id === teamId
                ? {
                    ...team,
                    memberIds: team.memberIds.filter((id) => id !== memberId),
                    members: team.members.filter((member) => member.id !== memberId)
                }
                : team
        )));

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
                method: 'DELETE',
                headers
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to remove member from team.');
            }

            toast.success('Provider removed from team.');
        } catch (removeError) {
            const message = removeError instanceof Error ? removeError.message : 'Failed to remove member from team.';
            setTeams(previousTeams);
            toast.error(message);
        } finally {
            setIsMutating(null);
        }
    };

    const handleAssignPatient = assignPatientForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to assign patient.');
            return;
        }

        const previousTeams = teams;
        const previousPatients = patients;
        setIsMutating(`assign-${values.teamId}-${values.patientId}`);

        setTeams((current) => current.map((team) => {
            const withoutPatient = team.patientIds.filter((patientId) => patientId !== values.patientId);
            if (team.id !== values.teamId) {
                return {
                    ...team,
                    patientIds: withoutPatient
                };
            }

            return {
                ...team,
                patientIds: Array.from(new Set([...withoutPatient, values.patientId]))
            };
        }));

        setPatients((current) => current.map((patient) => (
            patient.id === values.patientId
                ? { ...patient, teamId: values.teamId }
                : patient
        )));

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch(`/api/teams/${values.teamId}/patients`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ patientId: values.patientId })
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to assign patient to team.');
            }

            toast.success('Patient assigned to team.');
        } catch (assignError) {
            const message = assignError instanceof Error ? assignError.message : 'Failed to assign patient to team.';
            setTeams(previousTeams);
            setPatients(previousPatients);
            toast.error(message);
        } finally {
            setIsMutating(null);
        }
    });

    const handleUnassignPatient = async (teamId: string, patientId: string) => {
        if (!activeUser) {
            toast.error('Please sign in again to unassign patient.');
            return;
        }

        const previousTeams = teams;
        const previousPatients = patients;
        setIsMutating(`unassign-${teamId}-${patientId}`);

        setTeams((current) => current.map((team) => (
            team.id === teamId
                ? { ...team, patientIds: team.patientIds.filter((id) => id !== patientId) }
                : team
        )));

        setPatients((current) => current.map((patient) => (
            patient.id === patientId
                ? { ...patient, teamId: null }
                : patient
        )));

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch(`/api/teams/${teamId}/patients`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ patientId })
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to unassign patient from team.');
            }

            toast.success('Patient unassigned from team.');
        } catch (unassignError) {
            const message = unassignError instanceof Error ? unassignError.message : 'Failed to unassign patient from team.';
            setTeams(previousTeams);
            setPatients(previousPatients);
            toast.error(message);
        } finally {
            setIsMutating(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[55vh] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl">
            <header className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Workspace</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage provider teams, invitations, and patient team assignment.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (activeUser) {
                                loadTeamsWorkspace(activeUser).catch(() => undefined);
                            }
                        }}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        Refresh
                    </button>
                </div>
                {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
            </header>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Create team</h2>
                    </div>
                    <form onSubmit={handleCreateTeam} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Team name</label>
                            <input
                                {...createTeamForm.register('name')}
                                disabled={isMutating === 'create-team'}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                placeholder="Cardiology Team A"
                            />
                            {createTeamForm.formState.errors.name?.message && (
                                <p className="text-xs text-rose-500 mt-1">{createTeamForm.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description</label>
                            <textarea
                                {...createTeamForm.register('description')}
                                disabled={isMutating === 'create-team'}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-20"
                                placeholder="Optional team notes"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isMutating === 'create-team'}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {isMutating === 'create-team' ? 'Creating...' : 'Create team'}
                        </button>
                    </form>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Invite provider</h2>
                    </div>
                    <form onSubmit={handleInviteDoctor} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Team</label>
                            <select
                                {...inviteDoctorForm.register('teamId')}
                                disabled={isMutating?.startsWith('invite-') || ownerTeams.length === 0}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            >
                                {ownerTeams.length === 0 && <option value="">No owner teams</option>}
                                {ownerTeams.map((team) => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Provider</label>
                            <select
                                {...inviteDoctorForm.register('doctorId')}
                                disabled={isMutating?.startsWith('invite-') || providerOptions.length === 0}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            >
                                {providerOptions.length === 0 && <option value="">No provider found</option>}
                                {providerOptions.map((provider) => (
                                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={isMutating?.startsWith('invite-') || ownerTeams.length === 0}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Send invite
                            </button>
                        </div>
                    </form>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add provider directly</h2>
                    </div>
                    <form onSubmit={handleAddDoctor} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Team</label>
                            <select
                                {...addDoctorForm.register('teamId')}
                                disabled={isMutating?.startsWith('add-') || ownerTeams.length === 0}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            >
                                {ownerTeams.length === 0 && <option value="">No owner teams</option>}
                                {ownerTeams.map((team) => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Provider</label>
                            <select
                                {...addDoctorForm.register('doctorId')}
                                disabled={isMutating?.startsWith('add-') || providerOptions.length === 0}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            >
                                {providerOptions.length === 0 && <option value="">No provider found</option>}
                                {providerOptions.map((provider) => (
                                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={isMutating?.startsWith('add-') || ownerTeams.length === 0}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Add provider
                            </button>
                        </div>
                    </form>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assign patient</h2>
                    </div>
                    <form onSubmit={handleAssignPatient} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Team</label>
                            <select
                                {...assignPatientForm.register('teamId')}
                                disabled={isMutating?.startsWith('assign-') || teams.length === 0}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            >
                                {teams.length === 0 && <option value="">No teams</option>}
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Patient</label>
                            <select
                                {...assignPatientForm.register('patientId')}
                                disabled={isMutating?.startsWith('assign-') || patients.length === 0}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            >
                                {patients.length === 0 && <option value="">No patients</option>}
                                {patients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.name}
                                        {patient.teamId ? ' (assigned)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={isMutating?.startsWith('assign-') || teams.length === 0}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                <Shield className="w-3.5 h-3.5" />
                                Assign patient
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <section className="space-y-4">
                {teams.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
                        <Users className="w-6 h-6 mx-auto text-slate-400" />
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No teams available yet.</p>
                    </div>
                )}

                {teams.map((team) => {
                    const isOwner = activeUser?.uid === team.ownerId;
                    const assignedPatients = team.patientIds
                        .map((patientId) => patientMap.get(patientId))
                        .filter((patient): patient is PatientSummary => Boolean(patient));

                    return (
                        <article key={team.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{team.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Owner: {team.ownerName}
                                        {isOwner ? ' (you)' : ''}
                                    </p>
                                    {team.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{team.description}</p>
                                    )}
                                </div>
                                {team.pendingInviteDoctorIds.length > 0 && (
                                    <span className="inline-flex rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 text-[11px] font-semibold">
                                        {team.pendingInviteDoctorIds.length} pending invite(s)
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Providers</h4>
                                    <div className="space-y-2">
                                        {team.members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-100">{member.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{member.email ?? member.role ?? 'Provider'}</p>
                                                </div>
                                                {isOwner && member.id !== team.ownerId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void handleRemoveMember(team.id, member.id);
                                                        }}
                                                        disabled={isMutating === `remove-${team.id}-${member.id}`}
                                                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 dark:border-rose-800 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" /> Remove
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Patients</h4>
                                    <div className="space-y-2">
                                        {assignedPatients.length === 0 && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">No patients assigned.</p>
                                        )}
                                        {assignedPatients.map((patient) => (
                                            <div key={patient.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-100">{patient.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{patient.email ?? patient.id}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void handleUnassignPatient(team.id, patient.id);
                                                    }}
                                                    disabled={isMutating === `unassign-${team.id}-${patient.id}`}
                                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Unassign
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>
        </div>
    );
}
