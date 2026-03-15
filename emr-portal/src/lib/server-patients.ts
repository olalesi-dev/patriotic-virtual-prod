import type {
    PatientDetailEncounter,
    PatientDetailMedication,
    PatientDetailProblem,
    PatientDetailRecord,
    PatientRegistryFacetOption,
    PatientRegistryResponse,
    PatientRegistryRow,
    PatientRegistryStatusKey,
    PatientRegistryTag,
    PatientRegistryTeam
} from '@/lib/patient-registry-types';

type SortField = 'name' | 'lastActivityAt' | 'statusLabel';
type SortDirection = 'asc' | 'desc';

interface LoadScopedPatientsOptions {
    query?: string;
    statuses?: string[];
    teamIds?: string[];
    tags?: string[];
    cursor?: string | null;
    pageSize?: number;
    sortField?: SortField;
    sortDir?: SortDirection;
}

interface ProviderScopedPatientsResult {
    patients: PatientRegistryRow[];
    nextCursor: string | null;
    totalCount: number;
    pageSize: number;
    facets: PatientRegistryResponse['facets'];
}

interface PatientDraftRow extends Partial<PatientRegistryRow> {
    _rawStatuses?: string[];
    _sources?: string[];
}

interface ProviderScopedPatientContext {
    patientIds: string[];
    draftRows: Map<string, PatientDraftRow>;
    teamMemberships: Map<string, PatientRegistryTeam[]>;
    appointmentRows: Map<string, Record<string, unknown>[]>;
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => asNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry));
}

function readDisplayName(value: Record<string, unknown> | undefined): string | null {
    const direct = asNonEmptyString(value?.name) ?? asNonEmptyString(value?.displayName);
    if (direct) return direct;

    const first = asNonEmptyString(value?.firstName);
    const last = asNonEmptyString(value?.lastName);
    if (first && last) return `${first} ${last}`;
    return first ?? last ?? null;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function toDateTime(dateValue: unknown, timeValue: unknown): Date | null {
    if (typeof dateValue !== 'string' || typeof timeValue !== 'string') return null;
    const parsed = new Date(`${dateValue}T${timeValue}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatusKey(value: unknown): PatientRegistryStatusKey {
    const normalized = typeof value === 'string'
        ? value.trim().toLowerCase().replace(/\s+/g, '_')
        : '';

    if (normalized === 'waitlist' || normalized === 'pending_scheduling') return 'wait_list';
    if (normalized === 'lead') return 'lead';
    if (normalized === 'inactive') return 'inactive';
    if (normalized === 'pending_intake') return 'pending_intake';
    if (normalized === 'active') return 'active';
    if (normalized === 'scheduled' || normalized === 'checked_in' || normalized === 'confirmed' || normalized === 'pending' || normalized === 'completed') {
        return 'active';
    }
    if (normalized === 'cancelled' || normalized === 'canceled') return 'inactive';

    return 'pending_intake';
}

function statusLabel(statusKey: PatientRegistryStatusKey): string {
    if (statusKey === 'wait_list') return 'Wait List';
    if (statusKey === 'pending_intake') return 'Pending Intake';
    if (statusKey === 'inactive') return 'Inactive';
    if (statusKey === 'lead') return 'Lead';
    return 'Active';
}

function statusColor(statusKey: PatientRegistryStatusKey): string {
    if (statusKey === 'wait_list') return 'bg-orange-100 text-orange-700';
    if (statusKey === 'pending_intake') return 'bg-amber-100 text-amber-700';
    if (statusKey === 'inactive') return 'bg-slate-100 text-slate-700';
    if (statusKey === 'lead') return 'bg-purple-100 text-purple-700';
    return 'bg-emerald-100 text-emerald-700';
}

function statusRank(statusKey: PatientRegistryStatusKey): number {
    if (statusKey === 'wait_list') return 0;
    if (statusKey === 'pending_intake') return 1;
    if (statusKey === 'active') return 2;
    if (statusKey === 'lead') return 3;
    return 4;
}

function buildMrn(patientId: string): string {
    return patientId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase().padEnd(6, '0');
}

function normalizeTag(value: string): PatientRegistryTag {
    const lower = value.toLowerCase();
    if (lower.includes('wait')) {
        return { label: value, color: 'bg-orange-100 text-orange-700' };
    }
    if (lower.includes('telehealth') || lower.includes('video')) {
        return { label: value, color: 'bg-sky-100 text-sky-700' };
    }
    if (lower.includes('initial') || lower.includes('intake')) {
        return { label: value, color: 'bg-amber-100 text-amber-700' };
    }
    return { label: value, color: 'bg-indigo-100 text-indigo-700' };
}

function toSearchableTokens(patient: PatientRegistryRow): string {
    return [
        patient.id,
        patient.name,
        patient.mrn,
        patient.dob,
        patient.phone,
        patient.email,
        patient.serviceLine,
        ...patient.teams.map((team) => team.name),
        ...patient.tags.map((tag) => tag.label)
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function chunkArray<T>(values: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size));
    }
    return chunks;
}

async function getDocsByIds(
    firestore: FirebaseFirestore.Firestore,
    collectionName: string,
    ids: string[]
) {
    const docs: FirebaseFirestore.DocumentSnapshot[] = [];
    for (const chunk of chunkArray(ids, 200)) {
        const chunkDocs = await firestore.getAll(...chunk.map((id) => firestore.collection(collectionName).doc(id)));
        docs.push(...chunkDocs);
    }
    return docs;
}

function encodeCursor(sortValue: string, id: string): string {
    return Buffer.from(JSON.stringify({ sortValue, id }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | null | undefined): { sortValue: string; id: string } | null {
    if (!cursor) return null;
    try {
        const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { sortValue?: string; id?: string };
        if (!parsed.sortValue || !parsed.id) return null;
        return { sortValue: parsed.sortValue, id: parsed.id };
    } catch {
        return null;
    }
}

function buildFacets(patients: PatientRegistryRow[]): PatientRegistryResponse['facets'] {
    const statusMap = new Map<string, PatientRegistryFacetOption>();
    const teamMap = new Map<string, PatientRegistryFacetOption>();
    const tagMap = new Map<string, PatientRegistryFacetOption>();

    patients.forEach((patient) => {
        const currentStatus = statusMap.get(patient.statusKey) ?? {
            value: patient.statusKey,
            label: patient.statusLabel,
            count: 0
        };
        currentStatus.count += 1;
        statusMap.set(patient.statusKey, currentStatus);

        patient.teams.forEach((team) => {
            const currentTeam = teamMap.get(team.id) ?? {
                value: team.id,
                label: team.name,
                count: 0
            };
            currentTeam.count += 1;
            teamMap.set(team.id, currentTeam);
        });

        patient.tags.forEach((tag) => {
            const currentTag = tagMap.get(tag.label) ?? {
                value: tag.label,
                label: tag.label,
                count: 0
            };
            currentTag.count += 1;
            tagMap.set(tag.label, currentTag);
        });
    });

    return {
        statuses: Array.from(statusMap.values()).sort((first, second) => first.label.localeCompare(second.label)),
        teams: Array.from(teamMap.values()).sort((first, second) => first.label.localeCompare(second.label)),
        tags: Array.from(tagMap.values()).sort((first, second) => first.label.localeCompare(second.label))
    };
}

function buildEncounterRows(patientId: string, appointmentRows: Record<string, unknown>[]): PatientDetailEncounter[] {
    return appointmentRows
        .map((appointment, index) => {
            const encounterDate =
                asDate(appointment.startTime) ??
                toDateTime(appointment.date, appointment.time) ??
                asDate(appointment.updatedAt) ??
                asDate(appointment.createdAt);

            return {
                id: asNonEmptyString(appointment.id) ?? `${patientId}-${index}`,
                date: encounterDate ? encounterDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                title: asNonEmptyString(appointment.service) ?? asNonEmptyString(appointment.type) ?? 'Telehealth Visit',
                provider: asNonEmptyString(appointment.providerName) ?? 'Assigned Provider',
                type: asNonEmptyString(appointment.type) ?? 'Telehealth',
                status: asNonEmptyString(appointment.status) ?? 'scheduled'
            } satisfies PatientDetailEncounter;
        })
        .sort((first, second) => second.date.localeCompare(first.date));
}

function normalizePreferredPharmacy(value: unknown): string | null {
    const direct = asNonEmptyString(value);
    if (direct) return direct;

    if (typeof value === 'object' && value !== null) {
        const record = value as Record<string, unknown>;
        const parts = [
            asNonEmptyString(record.name),
            asNonEmptyString(record.address),
            asNonEmptyString(record.city),
            asNonEmptyString(record.state),
            asNonEmptyString(record.zipCode)
        ].filter(Boolean);

        if (parts.length > 0) {
            return parts.join(', ');
        }
    }

    return null;
}

async function loadProviderScopedPatientContext(
    firestore: FirebaseFirestore.Firestore,
    providerId: string
): Promise<ProviderScopedPatientContext> {
    const [appointmentsSnap, threadsSnap, teamsSnap] = await Promise.all([
        firestore.collection('appointments').where('providerId', '==', providerId).limit(500).get(),
        firestore.collection('threads').where('providerId', '==', providerId).limit(500).get(),
        firestore.collection('teams').where('memberIds', 'array-contains', providerId).limit(100).get()
    ]);

    const accessiblePatientIds = new Set<string>();
    const appointmentRows = new Map<string, Record<string, unknown>[]>();
    const teamMemberships = new Map<string, PatientRegistryTeam[]>();
    const draftRows = new Map<string, PatientDraftRow>();

    appointmentsSnap.docs.forEach((docSnap) => {
        const data = {
            id: docSnap.id,
            ...docSnap.data()
        } as Record<string, unknown>;
        const patientId = asNonEmptyString(data.patientId) ?? asNonEmptyString(data.patientUid);
        if (!patientId || patientId === providerId) return;

        accessiblePatientIds.add(patientId);
        const existingRows = appointmentRows.get(patientId) ?? [];
        existingRows.push(data);
        appointmentRows.set(patientId, existingRows);

        const draft = draftRows.get(patientId) ?? {};
        const appointmentDate =
            asDate(data.startTime) ??
            toDateTime(data.date, data.time) ??
            asDate(data.updatedAt) ??
            asDate(data.createdAt);
        const rawStatus = asNonEmptyString(data.status);

        draftRows.set(patientId, {
            ...draft,
            name: asNonEmptyString(data.patientName) ?? asNonEmptyString(data.patient) ?? draft.name ?? `Patient ${patientId.slice(0, 6)}`,
            email: asNonEmptyString(data.patientEmail) ?? draft.email ?? null,
            serviceLine: asNonEmptyString(data.service) ?? asNonEmptyString(data.type) ?? draft.serviceLine ?? 'General Consultation',
            lastActivityAt: appointmentDate?.toISOString() ?? draft.lastActivityAt ?? null,
            _rawStatuses: rawStatus ? [...(draft._rawStatuses ?? []), rawStatus] : (draft._rawStatuses ?? []),
            _sources: Array.from(new Set([...(draft._sources ?? []), 'appointment']))
        });
    });

    threadsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const patientId = asNonEmptyString(data.patientId) ?? asNonEmptyString(data.patientUid);
        if (!patientId || patientId === providerId) return;

        accessiblePatientIds.add(patientId);
        const draft = draftRows.get(patientId) ?? {};
        const lastMessageAt = asDate(data.lastMessageAt) ?? asDate(data.updatedAt) ?? asDate(data.createdAt);

        draftRows.set(patientId, {
            ...draft,
            name: asNonEmptyString(data.patientName) ?? draft.name ?? `Patient ${patientId.slice(0, 6)}`,
            email: asNonEmptyString(data.patientEmail) ?? draft.email ?? null,
            lastActivityAt: lastMessageAt?.toISOString() ?? draft.lastActivityAt ?? null,
            _sources: Array.from(new Set([...(draft._sources ?? []), 'thread']))
        });
    });

    teamsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const teamId = docSnap.id;
        const teamName = asNonEmptyString(data.name) ?? `Team ${teamId.slice(0, 6)}`;
        const team: PatientRegistryTeam = { id: teamId, name: teamName };

        asStringArray(data.patientIds).forEach((patientId) => {
            if (!patientId || patientId === providerId) return;

            accessiblePatientIds.add(patientId);
            const currentTeams = teamMemberships.get(patientId) ?? [];
            if (!currentTeams.some((currentTeam) => currentTeam.id === teamId)) {
                currentTeams.push(team);
            }
            teamMemberships.set(patientId, currentTeams);

            const draft = draftRows.get(patientId) ?? {};
            draftRows.set(patientId, {
                ...draft,
                _sources: Array.from(new Set([...(draft._sources ?? []), 'team']))
            });
        });
    });

    return {
        patientIds: Array.from(accessiblePatientIds),
        draftRows,
        teamMemberships,
        appointmentRows
    };
}

async function loadPatientDocumentMaps(
    firestore: FirebaseFirestore.Firestore,
    patientIds: string[]
) {
    const [patientDocs, userDocs] = await Promise.all([
        getDocsByIds(firestore, 'patients', patientIds),
        getDocsByIds(firestore, 'users', patientIds)
    ]);

    const patientDocsById = new Map<string, Record<string, unknown>>();
    patientDocs.forEach((docSnap) => {
        if (!docSnap.exists) return;
        patientDocsById.set(docSnap.id, docSnap.data() as Record<string, unknown>);
    });

    const userDocsById = new Map<string, Record<string, unknown>>();
    userDocs.forEach((docSnap) => {
        if (!docSnap.exists) return;
        userDocsById.set(docSnap.id, docSnap.data() as Record<string, unknown>);
    });

    return {
        patientDocsById,
        userDocsById
    };
}

function buildSummaryRow({
    patientId,
    patientDoc,
    userDoc,
    draft,
    teamRows
}: {
    patientId: string;
    patientDoc: Record<string, unknown> | undefined;
    userDoc: Record<string, unknown> | undefined;
    draft: PatientDraftRow;
    teamRows: PatientRegistryTeam[];
}): PatientRegistryRow | null {
    const userRole = asNonEmptyString(userDoc?.role)?.toLowerCase() ?? null;
    const sources = asStringArray(draft._sources);
    const qualifiesAsPatient = Boolean(patientDoc) || userRole === 'patient' || sources.length > 0;
    if (!qualifiesAsPatient) return null;

    const merged = {
        ...userDoc,
        ...patientDoc
    } as Record<string, unknown>;

    const rawStatuses = [
        ...asStringArray(draft._rawStatuses),
        ...asStringArray(merged.status)
    ];
    const derivedStatusKey = rawStatuses
        .map((value) => normalizeStatusKey(value))
        .sort((first, second) => statusRank(first) - statusRank(second))[0]
        ?? normalizeStatusKey(merged.status);

    const serviceLine =
        asNonEmptyString(merged.serviceLine) ??
        asNonEmptyString(merged.primaryConcern) ??
        asNonEmptyString(draft.serviceLine) ??
        'General Consultation';
    const displayName =
        readDisplayName(merged) ??
        asNonEmptyString(draft.name) ??
        asNonEmptyString(merged.email)?.split('@')[0] ??
        `Patient ${patientId.slice(0, 6)}`;
    const tagLabels = Array.from(new Set([
        ...asStringArray(merged.tags),
        ...(serviceLine ? [serviceLine] : []),
        ...(derivedStatusKey === 'wait_list' ? ['Waitlist'] : [])
    ]));

    return {
        id: patientId,
        name: displayName,
        email: asNonEmptyString(merged.email) ?? asNonEmptyString(draft.email),
        phone: asNonEmptyString(merged.phone),
        dob: asNonEmptyString(merged.dob),
        sex: asNonEmptyString(merged.sexAtBirth) ?? asNonEmptyString(merged.sex),
        state: asNonEmptyString(merged.state),
        mrn: asNonEmptyString(merged.mrn) ?? buildMrn(patientId),
        statusKey: derivedStatusKey,
        statusLabel: statusLabel(derivedStatusKey),
        statusColor: statusColor(derivedStatusKey),
        serviceLine,
        teamIds: teamRows.map((team) => team.id),
        teams: teamRows,
        tags: tagLabels.map((label) => normalizeTag(label)),
        lastActivityAt: asNonEmptyString(draft.lastActivityAt)
    };
}

export async function loadProviderScopedPatients(
    firestore: FirebaseFirestore.Firestore,
    providerId: string,
    options: LoadScopedPatientsOptions = {}
): Promise<ProviderScopedPatientsResult> {
    const context = await loadProviderScopedPatientContext(firestore, providerId);
    if (context.patientIds.length === 0) {
        return {
            patients: [],
            nextCursor: null,
            totalCount: 0,
            pageSize: options.pageSize ?? 25,
            facets: { statuses: [], teams: [], tags: [] }
        };
    }

    const { patientDocsById, userDocsById } = await loadPatientDocumentMaps(firestore, context.patientIds);
    const hydratedPatients = context.patientIds.reduce<PatientRegistryRow[]>((accumulator, patientId) => {
        const row = buildSummaryRow({
            patientId,
            patientDoc: patientDocsById.get(patientId),
            userDoc: userDocsById.get(patientId),
            draft: context.draftRows.get(patientId) ?? {},
            teamRows: context.teamMemberships.get(patientId) ?? []
        });

        if (row) {
            accumulator.push(row);
        }

        return accumulator;
    }, []);

    const facets = buildFacets(hydratedPatients);
    let filteredPatients = hydratedPatients;
    const normalizedQuery = asNonEmptyString(options.query)?.toLowerCase() ?? null;

    if (normalizedQuery) {
        const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
        filteredPatients = filteredPatients.filter((patient) => {
            const searchableText = toSearchableTokens(patient);
            return queryTerms.every((term) => searchableText.includes(term));
        });
    }

    if ((options.statuses ?? []).length > 0) {
        const allowedStatuses = new Set((options.statuses ?? []).map((status) => status.toLowerCase()));
        filteredPatients = filteredPatients.filter((patient) => allowedStatuses.has(patient.statusKey));
    }

    if ((options.teamIds ?? []).length > 0) {
        const allowedTeamIds = new Set(options.teamIds ?? []);
        filteredPatients = filteredPatients.filter((patient) => patient.teamIds.some((teamId) => allowedTeamIds.has(teamId)));
    }

    if ((options.tags ?? []).length > 0) {
        const allowedTags = new Set((options.tags ?? []).map((tag) => tag.toLowerCase()));
        filteredPatients = filteredPatients.filter((patient) => patient.tags.some((tag) => allowedTags.has(tag.label.toLowerCase())));
    }

    const sortField = options.sortField ?? 'name';
    const sortDir = options.sortDir ?? 'asc';

    filteredPatients.sort((first, second) => {
        const firstValue = sortField === 'lastActivityAt'
            ? (first.lastActivityAt ?? '')
            : sortField === 'statusLabel'
                ? first.statusLabel
                : first.name;
        const secondValue = sortField === 'lastActivityAt'
            ? (second.lastActivityAt ?? '')
            : sortField === 'statusLabel'
                ? second.statusLabel
                : second.name;

        const comparison = firstValue.localeCompare(secondValue);
        if (comparison !== 0) {
            return sortDir === 'asc' ? comparison : -comparison;
        }

        return sortDir === 'asc'
            ? first.id.localeCompare(second.id)
            : second.id.localeCompare(first.id);
    });

    const totalCount = filteredPatients.length;
    const pageSize = Math.min(Math.max(options.pageSize ?? 25, 10), 100);
    const decodedCursor = decodeCursor(options.cursor);

    if (decodedCursor) {
        filteredPatients = filteredPatients.filter((patient) => {
            const patientSortValue = sortField === 'lastActivityAt'
                ? (patient.lastActivityAt ?? '')
                : sortField === 'statusLabel'
                    ? patient.statusLabel
                    : patient.name;

            const comparison = patientSortValue.localeCompare(decodedCursor.sortValue);
            if (comparison === 0) {
                return sortDir === 'asc'
                    ? patient.id > decodedCursor.id
                    : patient.id < decodedCursor.id;
            }

            return sortDir === 'asc' ? comparison > 0 : comparison < 0;
        });
    }

    const pagePatients = filteredPatients.slice(0, pageSize);
    const lastPatient = pagePatients[pagePatients.length - 1];
    const nextCursor = filteredPatients.length > pageSize && lastPatient
        ? encodeCursor(
            sortField === 'lastActivityAt'
                ? (lastPatient.lastActivityAt ?? '')
                : sortField === 'statusLabel'
                    ? lastPatient.statusLabel
                    : lastPatient.name,
            lastPatient.id
        )
        : null;

    return {
        patients: pagePatients,
        nextCursor,
        totalCount,
        pageSize,
        facets
    };
}

export async function loadProviderScopedPatientDetail(
    firestore: FirebaseFirestore.Firestore,
    providerId: string,
    patientId: string
): Promise<PatientDetailRecord | null> {
    const context = await loadProviderScopedPatientContext(firestore, providerId);
    if (!context.patientIds.includes(patientId)) {
        return null;
    }

    const { patientDocsById, userDocsById } = await loadPatientDocumentMaps(firestore, [patientId]);
    const summary = buildSummaryRow({
        patientId,
        patientDoc: patientDocsById.get(patientId),
        userDoc: userDocsById.get(patientId),
        draft: context.draftRows.get(patientId) ?? {},
        teamRows: context.teamMemberships.get(patientId) ?? []
    });

    if (!summary) {
        return null;
    }

    const merged = {
        ...(userDocsById.get(patientId) ?? {}),
        ...(patientDocsById.get(patientId) ?? {})
    } as Record<string, unknown>;

    const [problemsSnap, medicationsSnap] = await Promise.all([
        firestore.collection('patients').doc(patientId).collection('problems').get(),
        firestore.collection('patients').doc(patientId).collection('medications').get()
    ]);

    const problemList = problemsSnap.docs
        .map((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            return {
                id: docSnap.id,
                code: asNonEmptyString(data.code) ?? 'DX',
                description: asNonEmptyString(data.description) ?? 'Untitled problem',
                createdAt: asDate(data.createdAt)?.toISOString() ?? null
            } satisfies PatientDetailProblem;
        })
        .sort((first, second) => (second.createdAt ?? '').localeCompare(first.createdAt ?? ''));

    const activeMedications = medicationsSnap.docs
        .map((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            return {
                id: docSnap.id,
                name: asNonEmptyString(data.name) ?? 'Medication',
                dosage: asNonEmptyString(data.dosage) ?? 'N/A',
                frequency: asNonEmptyString(data.frequency) ?? 'Unspecified',
                route: asNonEmptyString(data.route),
                status: asNonEmptyString(data.status) ?? 'Active',
                startDate: asDate(data.startDate)?.toISOString().slice(0, 10) ?? asNonEmptyString(data.startDate)
            } satisfies PatientDetailMedication;
        })
        .sort((first, second) => (second.startDate ?? '').localeCompare(first.startDate ?? ''));

    const recentEncounters = buildEncounterRows(patientId, context.appointmentRows.get(patientId) ?? []).slice(0, 10);

    return {
        ...summary,
        allergies: asStringArray(merged.allergies).length > 0 ? asStringArray(merged.allergies) : ['NKDA'],
        primaryConcern: asNonEmptyString(merged.primaryConcern) ?? summary.serviceLine,
        preferredPharmacy: normalizePreferredPharmacy(merged.preferredPharmacy),
        careTeam: summary.teams.length > 0
            ? summary.teams.map((team) => ({ role: 'Team', name: team.name }))
            : [{ role: 'Primary', name: 'Assigned Provider' }],
        problemList,
        activeMedications,
        recentEncounters
    };
}
