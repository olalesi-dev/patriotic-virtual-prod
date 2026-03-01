"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import type { User as FirebaseUser } from 'firebase/auth';
import { Edit3, Plus, Send, Shield, Trash2, UserPlus, Users, UserX, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { MultiSelectCombobox } from '@/components/common/MultiSelectCombobox';
import { auth } from '@/lib/firebase';
import { getRandomTeamColor, getTeamColorPalette, normalizeTeamColor } from '@/lib/team-colors';
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
    description: z.string().trim().max(220).optional(),
    color: z.string().trim().optional()
});

const updateTeamSchema = z.object({
    teamId: z.string().trim().min(1, 'Team id is required.'),
    name: z.string().trim().min(2, 'Team name is required.').max(80),
    description: z.string().trim().max(220).optional(),
    color: z.string().trim().optional()
});

const teamDoctorSchema = z.object({
    teamId: z.string().trim().min(1, 'Select a team.'),
    doctorIds: z.array(z.string().trim().min(1)).min(1, 'Select at least one provider.')
});

const assignPatientSchema = z.object({
    teamId: z.string().trim().min(1, 'Select a team.'),
    patientId: z.string().trim().min(1, 'Select a patient.')
});

type CreateTeamValues = z.infer<typeof createTeamSchema>;
type UpdateTeamValues = z.infer<typeof updateTeamSchema>;
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
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

    const createTeamForm = useForm<CreateTeamValues>({
        resolver: zodResolver(createTeamSchema),
        defaultValues: {
            name: '',
            description: '',
            color: ''
        }
    });

    const editTeamForm = useForm<UpdateTeamValues>({
        resolver: zodResolver(updateTeamSchema),
        defaultValues: {
            teamId: '',
            name: '',
            description: '',
            color: ''
        }
    });

    const addDoctorForm = useForm<TeamDoctorValues>({
        resolver: zodResolver(teamDoctorSchema),
        defaultValues: {
            teamId: '',
            doctorIds: []
        }
    });

    const inviteDoctorForm = useForm<TeamDoctorValues>({
        resolver: zodResolver(teamDoctorSchema),
        defaultValues: {
            teamId: '',
            doctorIds: []
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
            } else {
                addDoctorForm.setValue('teamId', '');
                inviteDoctorForm.setValue('teamId', '');
                assignPatientForm.setValue('teamId', '');
            }

            const firstProvider = nextProviders.find((provider) => provider.id !== user.uid);
            if (firstProvider) {
                addDoctorForm.setValue('doctorIds', [firstProvider.id]);
                inviteDoctorForm.setValue('doctorIds', [firstProvider.id]);
            }

            const selectedPatientId = assignPatientForm.getValues('patientId');
            const selectedTeamId = assignPatientForm.getValues('teamId');
            const selectedPatient = nextPatients.find((patient) => patient.id === selectedPatientId);
            if (!selectedPatient) {
                assignPatientForm.setValue('patientId', '');
            } else if (selectedTeamId && selectedPatient.teamId === selectedTeamId) {
                assignPatientForm.setValue('patientId', '');
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

    const teamColorPalette = useMemo(() => getTeamColorPalette(), []);

    const openEditTeamDialog = (team: TeamSummary) => {
        editTeamForm.reset({
            teamId: team.id,
            name: team.name,
            description: team.description ?? '',
            color: normalizeTeamColor(team.color) ?? ''
        });
        setEditingTeamId(team.id);
    };

    const closeEditTeamDialog = () => {
        setEditingTeamId(null);
    };

    const ownerTeams = useMemo(() => {
        if (!activeUser) return [];
        return teams.filter((team) => team.ownerId === activeUser.uid);
    }, [activeUser, teams]);

    const providerOptions = useMemo(() => {
        if (!activeUser) return providers;
        return providers.filter((provider) => provider.id !== activeUser.uid);
    }, [activeUser, providers]);

    const providerById = useMemo(() => {
        return new Map(providerOptions.map((provider) => [provider.id, provider]));
    }, [providerOptions]);

    const addDoctorTeamId = addDoctorForm.watch('teamId');
    const inviteDoctorTeamId = inviteDoctorForm.watch('teamId');
    const assignPatientTeamId = assignPatientForm.watch('teamId');
    const createTeamColorSelection = normalizeTeamColor(createTeamForm.watch('color'));
    const editTeamColorSelection = normalizeTeamColor(editTeamForm.watch('color'));

    const addDoctorTeam = useMemo(
        () => teams.find((team) => team.id === addDoctorTeamId) ?? null,
        [addDoctorTeamId, teams]
    );

    const inviteDoctorTeam = useMemo(
        () => teams.find((team) => team.id === inviteDoctorTeamId) ?? null,
        [inviteDoctorTeamId, teams]
    );

    const addProviderChoices = useMemo(() => {
        const existingMemberIds = new Set(addDoctorTeam?.memberIds ?? []);
        return providerOptions.map((provider) => ({
            value: provider.id,
            label: provider.name,
            description: provider.email ?? provider.role ?? 'Provider',
            disabled: existingMemberIds.has(provider.id)
        }));
    }, [addDoctorTeam, providerOptions]);

    const inviteProviderChoices = useMemo(() => {
        const existingMemberIds = new Set(inviteDoctorTeam?.memberIds ?? []);
        const pendingInviteIds = new Set(inviteDoctorTeam?.pendingInviteDoctorIds ?? []);
        return providerOptions.map((provider) => ({
            value: provider.id,
            label: provider.name,
            description: provider.email ?? provider.role ?? 'Provider',
            disabled: existingMemberIds.has(provider.id) || pendingInviteIds.has(provider.id)
        }));
    }, [inviteDoctorTeam, providerOptions]);

    const teamNameById = useMemo(() => {
        return new Map(teams.map((team) => [team.id, team.name]));
    }, [teams]);

    const patientTeamIdByMembership = useMemo(() => {
        const map = new Map<string, string>();
        teams.forEach((team) => {
            team.patientIds.forEach((patientId) => {
                if (!map.has(patientId)) {
                    map.set(patientId, team.id);
                }
            });
        });
        return map;
    }, [teams]);

    const assignPatientChoices = useMemo(() => {
        return patients.map((patient) => {
            const resolvedTeamId = patientTeamIdByMembership.get(patient.id) ?? patient.teamId ?? null;
            const isAlreadyInSelectedTeam = Boolean(assignPatientTeamId) && resolvedTeamId === assignPatientTeamId;
            const assignmentLabel = resolvedTeamId
                ? `Assigned: ${teamNameById.get(resolvedTeamId) ?? 'Another team'}`
                : 'Unassigned';

            return {
                value: patient.id,
                label: patient.name,
                description: isAlreadyInSelectedTeam ? `${assignmentLabel} (current team)` : assignmentLabel,
                disabled: isAlreadyInSelectedTeam
            };
        });
    }, [assignPatientTeamId, patientTeamIdByMembership, patients, teamNameById]);

    const patientMap = useMemo(() => {
        return new Map(patients.map((patient) => [patient.id, patient]));
    }, [patients]);

    React.useEffect(() => {
        const selectedPatientId = assignPatientForm.getValues('patientId');
        if (!selectedPatientId) return;

        const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
        if (!selectedPatient) {
            assignPatientForm.setValue('patientId', '');
            return;
        }

        const selectedPatientTeamId = patientTeamIdByMembership.get(selectedPatient.id) ?? selectedPatient.teamId ?? null;
        if (assignPatientTeamId && selectedPatientTeamId === assignPatientTeamId) {
            assignPatientForm.setValue('patientId', '');
        }
    }, [assignPatientForm, assignPatientTeamId, patientTeamIdByMembership, patients]);

    const handleCreateTeam = createTeamForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to create teams.');
            return;
        }

        const nextColor = normalizeTeamColor(values.color) ?? getRandomTeamColor();
        const optimisticId = `optimistic-team-${Date.now()}`;
        const optimisticTeam: TeamSummary = {
            id: optimisticId,
            name: values.name.trim(),
            description: asNonEmptyString(values.description ?? ''),
            color: nextColor,
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
                body: JSON.stringify({
                    ...values,
                    color: nextColor
                })
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success || !payload.team) {
                throw new Error(payload.error || 'Failed to create team.');
            }

            setTeams((current) => [
                payload.team as TeamSummary,
                ...current.filter((team) => team.id !== optimisticId)
            ]);
            createTeamForm.reset({ name: '', description: '', color: '' });
            toast.success('Team created successfully.');
        } catch (createError) {
            const message = createError instanceof Error ? createError.message : 'Failed to create team.';
            setTeams(previousTeams);
            toast.error(message);
        } finally {
            setIsMutating(null);
        }
    });

    const handleUpdateTeam = editTeamForm.handleSubmit(async (values) => {
        if (!activeUser) {
            toast.error('Please sign in again to update team.');
            return;
        }

        const nextColor = normalizeTeamColor(values.color) ?? getRandomTeamColor();
        const nextDescription = asNonEmptyString(values.description ?? '');
        const previousTeams = teams;
        setIsMutating(`edit-${values.teamId}`);

        setTeams((current) => current.map((team) => (
            team.id === values.teamId
                ? {
                    ...team,
                    name: values.name.trim(),
                    description: nextDescription,
                    color: nextColor
                }
                : team
        )));

        try {
            const headers = await buildHeaders(activeUser);
            const response = await fetch(`/api/teams/${values.teamId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    name: values.name.trim(),
                    description: nextDescription,
                    color: nextColor
                })
            });

            const payload = await response.json() as TeamsApiResponse;
            if (!response.ok || !payload.success || !payload.team) {
                throw new Error(payload.error || 'Failed to update team.');
            }

            setTeams((current) => current.map((team) => (
                team.id === values.teamId
                    ? payload.team as TeamSummary
                    : team
            )));
            toast.success('Team updated.');
            closeEditTeamDialog();
        } catch (updateError) {
            const message = updateError instanceof Error ? updateError.message : 'Failed to update team.';
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

        const uniqueDoctorIds = Array.from(new Set(values.doctorIds.map((doctorId) => doctorId.trim()).filter(Boolean)));
        if (uniqueDoctorIds.length === 0) {
            toast.error('Select at least one provider.');
            return;
        }

        const previousTeams = teams;
        setIsMutating(`add-${values.teamId}`);

        setTeams((current) => current.map((team) => {
            if (team.id !== values.teamId) return team;
            const nextMemberIds = [...team.memberIds];
            const nextMembers = [...team.members];

            uniqueDoctorIds.forEach((doctorId) => {
                if (nextMemberIds.includes(doctorId)) return;

                const provider = providerById.get(doctorId);
                nextMemberIds.push(doctorId);
                nextMembers.push({
                    id: doctorId,
                    name: provider?.name ?? 'Provider',
                    email: provider?.email ?? null,
                    role: provider?.role ?? null
                });
            });
            return {
                ...team,
                memberIds: nextMemberIds,
                members: nextMembers
            };
        }));

        try {
            const headers = await buildHeaders(activeUser);
            const results = await Promise.allSettled(uniqueDoctorIds.map(async (doctorId) => {
                const response = await fetch(`/api/teams/${values.teamId}/members`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctorId })
                });

                const payload = await response.json() as TeamsApiResponse;
                if (!response.ok || !payload.success) {
                    throw new Error(payload.error || `Failed to add provider (${doctorId}).`);
                }
                return payload.team ?? null;
            }));

            const successfulResults = results.filter((result): result is PromiseFulfilledResult<TeamSummary | null> => (
                result.status === 'fulfilled'
            ));
            const failedResults = results.filter((result): result is PromiseRejectedResult => (
                result.status === 'rejected'
            ));

            if (successfulResults.length === 0) {
                throw new Error(failedResults[0]?.reason instanceof Error ? failedResults[0].reason.message : 'Failed to add providers to team.');
            }

            const latestTeam = [...successfulResults]
                .reverse()
                .find((result) => Boolean(result.value))
                ?.value;

            if (latestTeam) {
                setTeams((current) => current.map((team) => (
                    team.id === values.teamId
                        ? latestTeam
                        : team
                )));
            }

            addDoctorForm.setValue('doctorIds', []);
            const successCount = successfulResults.length;
            if (failedResults.length > 0) {
                toast.warning(`Added ${successCount} provider${successCount > 1 ? 's' : ''}. ${failedResults.length} request${failedResults.length > 1 ? 's' : ''} failed.`);
            } else {
                toast.success(`Added ${successCount} provider${successCount > 1 ? 's' : ''} to team.`);
            }
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

        const uniqueDoctorIds = Array.from(new Set(values.doctorIds.map((doctorId) => doctorId.trim()).filter(Boolean)));
        if (uniqueDoctorIds.length === 0) {
            toast.error('Select at least one provider.');
            return;
        }

        const previousTeams = teams;
        setIsMutating(`invite-${values.teamId}`);

        setTeams((current) => current.map((team) => (
            team.id === values.teamId
                ? {
                    ...team,
                    pendingInviteDoctorIds: Array.from(new Set([...team.pendingInviteDoctorIds, ...uniqueDoctorIds]))
                }
                : team
        )));

        try {
            const headers = await buildHeaders(activeUser);
            const results = await Promise.allSettled(uniqueDoctorIds.map(async (doctorId) => {
                const response = await fetch(`/api/teams/${values.teamId}/invite`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctorId })
                });

                const payload = await response.json() as TeamsApiResponse;
                if (!response.ok || !payload.success) {
                    throw new Error(payload.error || `Failed to send invitation (${doctorId}).`);
                }
                return payload.team ?? null;
            }));

            const successfulResults = results.filter((result): result is PromiseFulfilledResult<TeamSummary | null> => (
                result.status === 'fulfilled'
            ));
            const failedResults = results.filter((result): result is PromiseRejectedResult => (
                result.status === 'rejected'
            ));

            if (successfulResults.length === 0) {
                throw new Error(failedResults[0]?.reason instanceof Error ? failedResults[0].reason.message : 'Failed to send invitations.');
            }

            const latestTeam = [...successfulResults]
                .reverse()
                .find((result) => Boolean(result.value))
                ?.value;

            if (latestTeam) {
                setTeams((current) => current.map((team) => (
                    team.id === values.teamId
                        ? latestTeam
                        : team
                )));
            }

            inviteDoctorForm.setValue('doctorIds', []);
            const successCount = successfulResults.length;
            if (failedResults.length > 0) {
                toast.warning(`Sent ${successCount} invite${successCount > 1 ? 's' : ''}. ${failedResults.length} request${failedResults.length > 1 ? 's' : ''} failed.`);
            } else {
                toast.success(`Sent ${successCount} invitation${successCount > 1 ? 's' : ''}.`);
            }
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
            assignPatientForm.setValue('patientId', '');
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
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Team color</label>
                            <div className="flex flex-wrap items-center gap-2">
                                {teamColorPalette.map((color) => {
                                    const isSelected = createTeamColorSelection === color;
                                    return (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => createTeamForm.setValue('color', color, { shouldValidate: true })}
                                            className={`h-7 w-7 rounded-full border-2 transition ${isSelected ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                                            style={{ backgroundColor: color }}
                                            aria-label={`Select team color ${color}`}
                                        />
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => createTeamForm.setValue('color', '', { shouldValidate: true })}
                                    className="h-7 rounded-md border border-slate-300 dark:border-slate-700 px-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    Random
                                </button>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">If not selected, a random color is assigned automatically.</p>
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
                            <label htmlFor="invite-provider-ids" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Providers</label>
                            <Controller
                                control={inviteDoctorForm.control}
                                name="doctorIds"
                                render={({ field }) => (
                                    <MultiSelectCombobox
                                        id="invite-provider-ids"
                                        value={field.value ?? []}
                                        onChange={field.onChange}
                                        options={inviteProviderChoices}
                                        placeholder="Select providers to invite..."
                                        searchPlaceholder="Search providers by name or email..."
                                        emptyLabel="No providers available for invitation."
                                        disabled={isMutating?.startsWith('invite-') || providerOptions.length === 0}
                                    />
                                )}
                            />
                            {inviteDoctorForm.formState.errors.doctorIds?.message && (
                                <p className="text-xs text-rose-500 mt-1">{inviteDoctorForm.formState.errors.doctorIds.message}</p>
                            )}
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={isMutating?.startsWith('invite-') || providerOptions.length === 0}
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
                            <label htmlFor="add-provider-ids" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Providers</label>
                            <Controller
                                control={addDoctorForm.control}
                                name="doctorIds"
                                render={({ field }) => (
                                    <MultiSelectCombobox
                                        id="add-provider-ids"
                                        value={field.value ?? []}
                                        onChange={field.onChange}
                                        options={addProviderChoices}
                                        placeholder="Select providers to add..."
                                        searchPlaceholder="Search providers by name or email..."
                                        emptyLabel="No providers available to add."
                                        disabled={isMutating?.startsWith('add-') || providerOptions.length === 0}
                                    />
                                )}
                            />
                            {addDoctorForm.formState.errors.doctorIds?.message && (
                                <p className="text-xs text-rose-500 mt-1">{addDoctorForm.formState.errors.doctorIds.message}</p>
                            )}
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
                            <label htmlFor="assign-patient-id" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Patient</label>
                            <Controller
                                control={assignPatientForm.control}
                                name="patientId"
                                render={({ field }) => (
                                    <MultiSelectCombobox
                                        id="assign-patient-id"
                                        value={field.value ? [field.value] : []}
                                        onChange={(nextValue) => {
                                            const nextPatientId = nextValue[nextValue.length - 1] ?? '';
                                            field.onChange(nextPatientId);
                                        }}
                                        options={assignPatientChoices}
                                        placeholder="Select a patient to assign..."
                                        searchPlaceholder="Search patients by name..."
                                        emptyLabel="No patients available."
                                        disabled={isMutating?.startsWith('assign-') || patients.length === 0}
                                    />
                                )}
                            />
                            {assignPatientForm.formState.errors.patientId?.message && (
                                <p className="text-xs text-rose-500 mt-1">{assignPatientForm.formState.errors.patientId.message}</p>
                            )}
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
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="inline-block h-3 w-3 rounded-full border border-slate-200 dark:border-slate-600"
                                            style={{ backgroundColor: team.color }}
                                        />
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{team.name}</h3>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Owner: {team.ownerName}
                                        {isOwner ? ' (you)' : ''}
                                    </p>
                                    {team.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{team.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {team.pendingInviteDoctorIds.length > 0 && (
                                        <span className="inline-flex rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 text-[11px] font-semibold">
                                            {team.pendingInviteDoctorIds.length} pending invite(s)
                                        </span>
                                    )}
                                    {isOwner && (
                                        <button
                                            type="button"
                                            onClick={() => openEditTeamDialog(team)}
                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                    )}
                                </div>
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

            {editingTeamId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit team</h3>
                            <button
                                type="button"
                                onClick={closeEditTeamDialog}
                                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateTeam} className="space-y-4 px-5 py-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Team name</label>
                                <input
                                    {...editTeamForm.register('name')}
                                    disabled={Boolean(isMutating?.startsWith('edit-'))}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                                    placeholder="Team name"
                                />
                                {editTeamForm.formState.errors.name?.message && (
                                    <p className="text-xs text-rose-500 mt-1">{editTeamForm.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    {...editTeamForm.register('description')}
                                    disabled={Boolean(isMutating?.startsWith('edit-'))}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-20"
                                    placeholder="Optional team notes"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Team color</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    {teamColorPalette.map((color) => {
                                        const isSelected = editTeamColorSelection === color;
                                        return (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => editTeamForm.setValue('color', color, { shouldValidate: true })}
                                                className={`h-7 w-7 rounded-full border-2 transition ${isSelected ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                                                style={{ backgroundColor: color }}
                                                aria-label={`Select team color ${color}`}
                                            />
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => editTeamForm.setValue('color', '', { shouldValidate: true })}
                                        className="h-7 rounded-md border border-slate-300 dark:border-slate-700 px-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        Random
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                <button
                                    type="button"
                                    onClick={closeEditTeamDialog}
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={Boolean(isMutating?.startsWith('edit-'))}
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {isMutating?.startsWith('edit-') ? 'Saving...' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
