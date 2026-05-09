import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetchJson } from '@/lib/api-client';
import type { PatientSummary, ProviderSummary, TeamSummary } from '@/lib/team-types';

export interface AppointmentWorkspaceResponse {
    success?: boolean;
    teams?: TeamSummary[];
    providers?: ProviderSummary[];
    patients?: PatientSummary[];
    error?: string;
}

export interface AppointmentWorkspaceData {
    teams: TeamSummary[];
    providers: ProviderSummary[];
    patients: PatientSummary[];
}

export async function fetchAppointmentWorkspace(user: FirebaseUser | null): Promise<AppointmentWorkspaceData> {
    if (!user) {
        throw new Error('Please sign in to manage appointments.');
    }

    const payload = await apiFetchJson<AppointmentWorkspaceResponse>('/api/teams', {
        method: 'GET',
        user,
        cache: 'no-store'
    });

    if (!payload.success) {
        throw new Error(payload.error || 'Failed to load appointment workspace.');
    }

    return {
        teams: payload.teams ?? [],
        providers: payload.providers ?? [],
        patients: payload.patients ?? []
    };
}
