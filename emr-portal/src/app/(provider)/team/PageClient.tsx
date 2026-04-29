"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Send, Shield, Trash2, UserPlus, Users, UserX } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiFetchJson } from '@/lib/api-client';
import type { PatientSummary, ProviderSummary, TeamSummary } from '@/lib/team-types';
import { AITextarea } from '@/components/ui/AITextarea';

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

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

interface TeamsWorkspaceData {
    teams: TeamSummary[];
    providers: ProviderSummary[];
    patients: PatientSummary[];
}

export default function ProviderTeamPage() {
    const queryClient = useQueryClient();
    const { user: activeUser, isReady } = useAuthUser();
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

    const teamsWorkspaceKey = React.useMemo(
        () => ['teams-workspace', activeUser?.uid ?? 'anonymous'] as const,
        [activeUser?.uid]
    );

    const teamsWorkspaceQuery = useQuery({
        queryKey: teamsWorkspaceKey,
        enabled: isReady && Boolean(activeUser),
        queryFn: async () => {
            const payload = await apiFetchJson<TeamsApiResponse>('/api/teams', {
                method: 'GET',
                user: activeUser,
                cache: 'no-store'
            });

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to load team workspace.');
            }

            return {
                teams: payload.teams ?? [],
                providers: payload.providers ?? [],
                patients: payload.patients ?? []
            } satisfies TeamsWorkspaceData;
        }
    });

    const teams = React.useMemo(
        () => teamsWorkspaceQuery.data?.teams ?? [],
        [teamsWorkspaceQuery.data?.teams]
    );
    const providers = React.useMemo(
        () => teamsWorkspaceQuery.data?.providers ?? [],
        [teamsWorkspaceQuery.data?.providers]
    );
    const patients = React.useMemo(
        () => teamsWorkspaceQuery.data?.patients ?? [],
        [teamsWorkspaceQuery.data?.patients]
    );
    const loading = !isReady || teamsWorkspaceQuery.isLoading;
    const error = teamsWorkspaceQuery.error instanceof Error
        ? teamsWorkspaceQuery.error.message
        : (activeUser || !isReady ? null : 'Please sign in to manage teams.');

    React.useEffect(() => {
        if (!activeUser) return;

        const ownerTeam = teams.find((team) => team.ownerId === activeUser.uid) ?? teams[0];
        if (ownerTeam) {
            const nextTeamId = ownerTeam.id;
            addDoctorForm.setValue('teamId', nextTeamId);
            inviteDoctorForm.setValue('teamId', nextTeamId);
            assignPatientForm.setValue('teamId', nextTeamId);
        }

        const allowedProviderRoles = new Set(['provider', 'doctor', 'clinician']);
        const filteredProviderOptions = providers.filter((provider) => (
            provider.id !== activeUser.uid
            && provider.role
            && allowedProviderRoles.has(provider.role.toLowerCase())
        ));
        const firstProvider = filteredProviderOptions[0];
        if (firstProvider) {
            addDoctorForm.setValue('doctorId', firstProvider.id);
            inviteDoctorForm.setValue('doctorId', firstProvider.id);
        }

        const providerIds = new Set(filteredProviderOptions.map((provider) => provider.id));
        const filteredPatientOptions = patients.filter((patient) => !providerIds.has(patient.id));
        const firstPatient = filteredPatientOptions[0];
        if (firstPatient) {
            assignPatientForm.setValue('patientId', firstPatient.id);
        }
    }, [activeUser, addDoctorForm, assignPatientForm, inviteDoctorForm, patients, providers, teams]);

    const createTeamMutation = useMutation({
        mutationFn: async (values: CreateTeamValues) => {
            if (!activeUser) {
                throw new Error('Please sign in again to create teams.');
            }

            const payload = await apiFetchJson<TeamsApiResponse>('/api/teams', {
                method: 'POST',
                user: activeUser,
                body: values
            });

            if (!payload.success || !payload.team) {
                throw new Error(payload.error || 'Failed to create team.');
            }

            return payload.team as TeamSummary;
        },
        onMutate: async (values) => {
            if (!activeUser) {
                throw new Error('Please sign in again to create teams.');
            }

            await queryClient.cancelQueries({ queryKey: teamsWorkspaceKey });
            const previousWorkspace = queryClient.getQueryData<TeamsWorkspaceData>(teamsWorkspaceKey);
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

            queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => ({
                teams: [optimisticTeam, ...(current?.teams ?? [])],
                providers: current?.providers ?? [],
                patients: current?.patients ?? []
            }));

            return { previousWorkspace, optimisticId };
        },
        onSuccess: (team, _values, context) => {
            queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => ({
                teams: [
                    team,
                    ...(current?.teams ?? []).filter((existingTeam) => existingTeam.id !== context?.optimisticId)
                ],
                providers: current?.providers ?? [],
                patients: current?.patients ?? []
            }));
            createTeamForm.reset({ name: '', description: '' });
            toast.success('Team created successfully.');
        },
        onError: (mutationError, _values, context) => {
            if (context?.previousWorkspace) {
                queryClient.setQueryData(teamsWorkspaceKey, context.previousWorkspace);
            }
            toast.error(mutationError instanceof Error ? mutationError.message : 'Failed to create team.');
        },
        onSettled: () => {
            setIsMutating(null);
            void queryClient.invalidateQueries({ queryKey: teamsWorkspaceKey });
        }
    });

    const mutateTeamMember = useMutation({
        mutationFn: async ({
            path,
            method,
            body
        }: {
            path: string;
            method: 'POST' | 'DELETE';
            body?: Record<string, unknown>;
        }) => {
            if (!activeUser) {
                throw new Error('Please sign in again to update team members.');
            }

            return apiFetchJson<TeamsApiResponse>(path, {
                method,
                user: activeUser,
                body
            });
        },
        onSettled: () => {
            setIsMutating(null);
            void queryClient.invalidateQueries({ queryKey: teamsWorkspaceKey });
        }
    });

    const ownerTeams = useMemo(() => {
        if (!activeUser) return [];
        return teams.filter((team) => team.ownerId === activeUser.uid);
    }, [activeUser, teams]);

    const providerOptions = useMemo(() => {
        const allowedRoles = new Set(['provider', 'doctor', 'clinician']);
        if (!activeUser) {
            return providers.filter((provider) => (
                provider.role ? allowedRoles.has(provider.role.toLowerCase()) : false
            ));
        }
        return providers.filter((provider) => (
            provider.id !== activeUser.uid
            && provider.role
            && allowedRoles.has(provider.role.toLowerCase())
        ));
    }, [activeUser, providers]);

    const providerIdSet = useMemo(() => {
        return new Set(providerOptions.map((provider) => provider.id));
    }, [providerOptions]);

    const patientOptions = useMemo(() => {
        return patients.filter((patient) => !providerIdSet.has(patient.id));
    }, [patients, providerIdSet]);

    const patientMap = useMemo(() => {
        return new Map(patients.map((patient) => [patient.id, patient]));
    }, [patients]);

    const handleCreateTeam = createTeamForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to create teams.');
            return;
        }
        setIsMutating('create-team');
        await createTeamMutation.mutateAsync(values);
    });

    const handleAddDoctor = addDoctorForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to update team members.');
            return;
        }

        const provider = providers.find((item) => item.id === values.doctorId);
        setIsMutating(`add-${values.teamId}-${values.doctorId}`);

        await queryClient.cancelQueries({ queryKey: teamsWorkspaceKey });
        const previousWorkspace = queryClient.getQueryData<TeamsWorkspaceData>(teamsWorkspaceKey);

        queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => {
            if (!current) return current;

            return {
                ...current,
                teams: current.teams.map((team) => {
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
                })
            };
        });

        try {
            const payload = await mutateTeamMember.mutateAsync({
                path: `/api/teams/${values.teamId}/members`,
                method: 'POST',
                body: { doctorId: values.doctorId }
            });

            if (!payload.success || !payload.team) {
                throw new Error(payload.error || 'Failed to add provider to team.');
            }

            queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => (
                current
                    ? {
                        ...current,
                        teams: current.teams.map((team) => (
                            team.id === values.teamId
                                ? payload.team as TeamSummary
                                : team
                        ))
                    }
                    : current
            ));
            toast.success('Provider added to team.');
        } catch (addError) {
            const message = addError instanceof Error ? addError.message : 'Failed to add provider to team.';
            if (previousWorkspace) {
                queryClient.setQueryData(teamsWorkspaceKey, previousWorkspace);
            }
            toast.error(message);
        }
    });

    const handleInviteDoctor = inviteDoctorForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to invite providers.');
            return;
        }

        setIsMutating(`invite-${values.teamId}-${values.doctorId}`);

        await queryClient.cancelQueries({ queryKey: teamsWorkspaceKey });
        const previousWorkspace = queryClient.getQueryData<TeamsWorkspaceData>(teamsWorkspaceKey);

        queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => (
            current
                ? {
                    ...current,
                    teams: current.teams.map((team) => (
                        team.id === values.teamId
                            ? {
                                ...team,
                                pendingInviteDoctorIds: Array.from(new Set([...team.pendingInviteDoctorIds, values.doctorId]))
                            }
                            : team
                    ))
                }
                : current
        ));

        try {
            const payload = await mutateTeamMember.mutateAsync({
                path: `/api/teams/${values.teamId}/invite`,
                method: 'POST',
                body: { doctorId: values.doctorId }
            });

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to send invitation.');
            }

            if (payload.team) {
                queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => (
                    current
                        ? {
                            ...current,
                            teams: current.teams.map((team) => (
                                team.id === values.teamId
                                    ? payload.team as TeamSummary
                                    : team
                            ))
                        }
                        : current
                ));
            }
            toast.success('Invitation sent.');
        } catch (inviteError) {
            const message = inviteError instanceof Error ? inviteError.message : 'Failed to send invitation.';
            if (previousWorkspace) {
                queryClient.setQueryData(teamsWorkspaceKey, previousWorkspace);
            }
            toast.error(message);
        }
    });

    const handleRemoveMember = async (teamId: string, memberId: string) => {
        if (!activeUser) {
            toast.error('Please sign in again to update team members.');
            return;
        }

        setIsMutating(`remove-${teamId}-${memberId}`);

        await queryClient.cancelQueries({ queryKey: teamsWorkspaceKey });
        const previousWorkspace = queryClient.getQueryData<TeamsWorkspaceData>(teamsWorkspaceKey);

        queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => (
            current
                ? {
                    ...current,
                    teams: current.teams.map((team) => (
                        team.id === teamId
                            ? {
                                ...team,
                                memberIds: team.memberIds.filter((id) => id !== memberId),
                                members: team.members.filter((member) => member.id !== memberId)
                            }
                            : team
                    ))
                }
                : current
        ));

        try {
            const payload = await mutateTeamMember.mutateAsync({
                path: `/api/teams/${teamId}/members/${memberId}`,
                method: 'DELETE'
            });

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to remove member from team.');
            }

            toast.success('Provider removed from team.');
        } catch (removeError) {
            const message = removeError instanceof Error ? removeError.message : 'Failed to remove member from team.';
            if (previousWorkspace) {
                queryClient.setQueryData(teamsWorkspaceKey, previousWorkspace);
            }
            toast.error(message);
        }
    };

    const handleAssignPatient = assignPatientForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to assign patient.');
            return;
        }

        setIsMutating(`assign-${values.teamId}-${values.patientId}`);

        await queryClient.cancelQueries({ queryKey: teamsWorkspaceKey });
        const previousWorkspace = queryClient.getQueryData<TeamsWorkspaceData>(teamsWorkspaceKey);

        queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => {
            if (!current) return current;

            return {
                ...current,
                teams: current.teams.map((team) => {
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
                }),
                patients: current.patients.map((patient) => (
                    patient.id === values.patientId
                        ? { ...patient, teamId: values.teamId }
                        : patient
                ))
            };
        });

        try {
            const payload = await mutateTeamMember.mutateAsync({
                path: `/api/teams/${values.teamId}/patients`,
                method: 'POST',
                body: { patientId: values.patientId }
            });

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to assign patient to team.');
            }

            toast.success('Patient assigned to team.');
        } catch (assignError) {
            const message = assignError instanceof Error ? assignError.message : 'Failed to assign patient to team.';
            if (previousWorkspace) {
                queryClient.setQueryData(teamsWorkspaceKey, previousWorkspace);
            }
            toast.error(message);
        }
    });

    const handleUnassignPatient = async (teamId: string, patientId: string) => {
        if (!activeUser) {
            toast.error('Please sign in again to unassign patient.');
            return;
        }

        setIsMutating(`unassign-${teamId}-${patientId}`);

        await queryClient.cancelQueries({ queryKey: teamsWorkspaceKey });
        const previousWorkspace = queryClient.getQueryData<TeamsWorkspaceData>(teamsWorkspaceKey);

        queryClient.setQueryData<TeamsWorkspaceData>(teamsWorkspaceKey, (current) => (
            current
                ? {
                    ...current,
                    teams: current.teams.map((team) => (
                        team.id === teamId
                            ? { ...team, patientIds: team.patientIds.filter((id) => id !== patientId) }
                            : team
                    )),
                    patients: current.patients.map((patient) => (
                        patient.id === patientId
                            ? { ...patient, teamId: null }
                            : patient
                    ))
                }
                : current
        ));

        try {
            const payload = await mutateTeamMember.mutateAsync({
                path: `/api/teams/${teamId}/patients`,
                method: 'DELETE',
                body: { patientId }
            });

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to unassign patient from team.');
            }

            toast.success('Patient unassigned from team.');
        } catch (unassignError) {
            const message = unassignError instanceof Error ? unassignError.message : 'Failed to unassign patient from team.';
            if (previousWorkspace) {
                queryClient.setQueryData(teamsWorkspaceKey, previousWorkspace);
            }
            toast.error(message);
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
                        onClick={() => void teamsWorkspaceQuery.refetch()}
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
                            <AITextarea
                                value={createTeamForm.watch('description') || ''}
                                onValueChange={(val) => createTeamForm.setValue('description', val)}
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
                                disabled={isMutating?.startsWith('assign-') || patientOptions.length === 0}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            >
                                {patientOptions.length === 0 && <option value="">No patients</option>}
                                {patientOptions.map((patient) => (
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
