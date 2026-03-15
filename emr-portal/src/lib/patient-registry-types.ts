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
    notes?: string | null;
}

export interface PatientDetailOrder {
    id: string;
    type: string;
    description: string;
    status: string;
    orderedAt: string | null;
    scheduledFor: string | null;
    provider: string | null;
    tests: string[];
    notes: string | null;
}

export interface PatientDetailImagingStudy {
    id: string;
    modality: string;
    bodyPart: string;
    status: string;
    date: string | null;
    provider: string | null;
    facility: string | null;
    reportText: string | null;
    viewerUrl: string | null;
}

export interface PatientDetailObservation {
    id: string;
    category: 'lab' | 'vital';
    name: string;
    date: string | null;
    value: string;
    unit: string | null;
    referenceRange: string | null;
    status: string;
    notes: string | null;
}

export interface PatientDetailDocument {
    id: string;
    name: string;
    category: string;
    date: string | null;
    type: string | null;
    url: string | null;
    size: string | null;
    status: string | null;
}

export interface PatientDetailMessage {
    id: string;
    senderName: string;
    senderType: 'patient' | 'provider' | 'system';
    text: string;
    timestamp: string | null;
    unread: boolean;
}

export interface PatientBillingStatementItem {
    description: string;
    amount: number;
}

export interface PatientBillingStatement {
    id: string;
    date: string | null;
    amount: number;
    status: string;
    items: PatientBillingStatementItem[];
}

export interface PatientDetailBilling {
    balance: number;
    status: string | null;
    nextBillingDate: string | null;
    membershipPlan: string | null;
    stripePortalUrl: string | null;
    statements: PatientBillingStatement[];
}

export interface PatientDetailRecord extends PatientRegistryRow {
    allergies: string[];
    primaryConcern: string | null;
    preferredPharmacy: string | null;
    careTeam: Array<{ role: string; name: string }>;
    problemList: PatientDetailProblem[];
    activeMedications: PatientDetailMedication[];
    recentEncounters: PatientDetailEncounter[];
    orders: PatientDetailOrder[];
    imagingStudies: PatientDetailImagingStudy[];
    observations: PatientDetailObservation[];
    documents: PatientDetailDocument[];
    messages: PatientDetailMessage[];
    billing: PatientDetailBilling;
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
