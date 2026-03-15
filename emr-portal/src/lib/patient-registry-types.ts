export type PatientRegistryStatusKey =
    | 'active'
    | 'pending_intake'
    | 'wait_list'
    | 'inactive'
    | 'lead';

export interface PatientRegistryTeam {
    id: string;
    name: string;
}

export interface PatientRegistryTag {
    label: string;
    color: string;
}

export interface PatientRegistryRow {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    dob: string | null;
    sex: string | null;
    state: string | null;
    mrn: string;
    statusKey: PatientRegistryStatusKey;
    statusLabel: string;
    statusColor: string;
    serviceLine: string;
    teamIds: string[];
    teams: PatientRegistryTeam[];
    tags: PatientRegistryTag[];
    isDemo: boolean;
    allergies: string[];
    alerts: Array<{ label: string; type: 'warning' | 'error' | 'info' | 'success' }>;
    problemList: Array<{ code: string; description: string }>;
    activeMedications: Array<{ name: string; dosage: string; frequency: string }>;
    recentEncounters: Array<{ id: string; date: string; title: string; provider: string; type: string; status: string }>;
    upcomingAppointments: Array<{ date: string; time: string; title: string; type: 'Video' | 'In-person' }>;
    weightTrend: number[];
    consents: Array<{ title: string; date: string; status: 'Signed' | 'Acknowledged' | 'Pending' }>;
    careTeam: Array<{ role: string; name: string }>;
    notes: any[];
    orders: any[];
    imaging: any[];
    lastActivityAt: string | null;
}

export interface PatientRegistryFacetOption {
    value: string;
    label: string;
    count: number;
}

export interface PatientRegistryViewState {
    query: string;
    statuses: string[];
    teamIds: string[];
    tags: string[];
    pageSize: number;
    sortField: 'name' | 'lastActivityAt' | 'statusLabel';
    sortDir: 'asc' | 'desc';
    columnVisibility: Record<string, boolean>;
}

export interface PatientRegistryResponse {
    success: boolean;
    patients: PatientRegistryRow[];
    nextCursor: string | null;
    totalCount: number;
    pageSize: number;
    facets: {
        statuses: PatientRegistryFacetOption[];
        teams: PatientRegistryFacetOption[];
        tags: PatientRegistryFacetOption[];
    };
    error?: string;
}
