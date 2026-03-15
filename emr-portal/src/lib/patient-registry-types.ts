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
    lastActivityAt: string | null;
}

export interface PatientDetailProblem {
    id: string;
    code: string;
    description: string;
    createdAt: string | null;
}

export interface PatientDetailMedication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    route: string | null;
    status: string;
    startDate: string | null;
}

export interface PatientDetailEncounter {
    id: string;
    date: string;
    title: string;
    provider: string;
    type: string;
    status: string;
}

export interface PatientDetailRecord extends PatientRegistryRow {
    allergies: string[];
    primaryConcern: string | null;
    preferredPharmacy: string | null;
    careTeam: Array<{ role: string; name: string }>;
    problemList: PatientDetailProblem[];
    activeMedications: PatientDetailMedication[];
    recentEncounters: PatientDetailEncounter[];
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

export interface PatientDetailResponse {
    success: boolean;
    patient?: PatientDetailRecord;
    error?: string;
}
