import type {
    PatientDetailBilling,
    PatientBillingStatement,
    PatientDetailDocument,
    PatientDetailEncounter,
    PatientDetailImagingStudy,
    PatientDetailMedication,
    PatientDetailMessage,
    PatientDetailObservation,
    PatientDetailOrder,
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

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function toIsoDate(value: unknown): string | null {
    const parsed = asDate(value);
    if (parsed) return parsed.toISOString().slice(0, 10);
    return asNonEmptyString(value);
}

function toIsoDateTime(value: unknown): string | null {
    const parsed = asDate(value);
    if (parsed) return parsed.toISOString();
    return asNonEmptyString(value);
}

function normalizeProblemList(
    subcollectionRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    fallbackRows: unknown
): PatientDetailProblem[] {
    const fromSubcollection = (subcollectionRows ?? []).map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
            id: docSnap.id,
            code: asNonEmptyString(data.code) ?? 'DX',
            description: asNonEmptyString(data.description) ?? 'Untitled problem',
            createdAt: toIsoDateTime(data.createdAt)
        } satisfies PatientDetailProblem;
    });

    const fromFallback = Array.isArray(fallbackRows)
        ? fallbackRows.map((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            return {
                id: asNonEmptyString(data.id) ?? `problem-${index}`,
                code: asNonEmptyString(data.code) ?? 'DX',
                description: asNonEmptyString(data.description) ?? 'Untitled problem',
                createdAt: toIsoDateTime(data.createdAt)
            } satisfies PatientDetailProblem;
        })
        : [];

    return [...fromSubcollection, ...fromFallback]
        .filter((problem, index, rows) => rows.findIndex((candidate) => candidate.id === problem.id) === index)
        .sort((first, second) => (second.createdAt ?? '').localeCompare(first.createdAt ?? ''));
}

function normalizeMedications(
    subcollectionRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    fallbackRows: unknown
): PatientDetailMedication[] {
    const fromSubcollection = (subcollectionRows ?? []).map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
            id: docSnap.id,
            name: asNonEmptyString(data.name) ?? 'Medication',
            dosage: asNonEmptyString(data.dosage) ?? 'N/A',
            frequency: asNonEmptyString(data.frequency) ?? 'Unspecified',
            route: asNonEmptyString(data.route),
            status: asNonEmptyString(data.status) ?? 'Active',
            startDate: toIsoDate(data.startDate)
        } satisfies PatientDetailMedication;
    });

    const fromFallback = Array.isArray(fallbackRows)
        ? fallbackRows.map((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            return {
                id: asNonEmptyString(data.id) ?? `medication-${index}`,
                name: asNonEmptyString(data.name) ?? 'Medication',
                dosage: asNonEmptyString(data.dosage) ?? 'N/A',
                frequency: asNonEmptyString(data.frequency) ?? 'Unspecified',
                route: asNonEmptyString(data.route),
                status: asNonEmptyString(data.status) ?? 'Active',
                startDate: toIsoDate(data.startDate)
            } satisfies PatientDetailMedication;
        })
        : [];

    return [...fromSubcollection, ...fromFallback]
        .filter((medication, index, rows) => rows.findIndex((candidate) => candidate.id === medication.id) === index)
        .sort((first, second) => (second.startDate ?? '').localeCompare(first.startDate ?? ''));
}

function normalizeOrders(
    subcollectionRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    fallbackRows: unknown
): PatientDetailOrder[] {
    const fromSubcollection = (subcollectionRows ?? []).map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
            id: docSnap.id,
            type: asNonEmptyString(data.type) ?? 'lab',
            description: asNonEmptyString(data.description) ?? 'Order',
            status: asNonEmptyString(data.status) ?? 'Ordered',
            orderedAt: toIsoDate(data.orderedAt ?? data.date),
            scheduledFor: toIsoDate(data.scheduledFor),
            provider: asNonEmptyString(data.provider) ?? asNonEmptyString(data.orderedBy),
            tests: asStringArray(data.tests),
            notes: asNonEmptyString(data.notes)
        } satisfies PatientDetailOrder;
    });

    const fromFallback = Array.isArray(fallbackRows)
        ? fallbackRows.map((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            return {
                id: asNonEmptyString(data.id) ?? `order-${index}`,
                type: asNonEmptyString(data.type) ?? 'lab',
                description: asNonEmptyString(data.description) ?? 'Order',
                status: asNonEmptyString(data.status) ?? 'Ordered',
                orderedAt: toIsoDate(data.orderedAt ?? data.date),
                scheduledFor: toIsoDate(data.scheduledFor),
                provider: asNonEmptyString(data.provider) ?? asNonEmptyString(data.orderedBy),
                tests: asStringArray(data.tests),
                notes: asNonEmptyString(data.notes)
            } satisfies PatientDetailOrder;
        })
        : [];

    return [...fromSubcollection, ...fromFallback]
        .filter((order, index, rows) => rows.findIndex((candidate) => candidate.id === order.id) === index)
        .sort((first, second) => (second.orderedAt ?? '').localeCompare(first.orderedAt ?? ''));
}

function normalizeImaging(
    subcollectionRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    fallbackRows: unknown
): PatientDetailImagingStudy[] {
    const fromSubcollection = (subcollectionRows ?? []).map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
            id: docSnap.id,
            modality: asNonEmptyString(data.modality) ?? asNonEmptyString(data.type) ?? 'Imaging',
            bodyPart: asNonEmptyString(data.bodyPart) ?? 'Unknown',
            status: asNonEmptyString(data.status) ?? 'Pending',
            date: toIsoDate(data.date),
            provider: asNonEmptyString(data.provider),
            facility: asNonEmptyString(data.facility),
            reportText: asNonEmptyString(data.reportText),
            viewerUrl: asNonEmptyString(data.viewerUrl)
        } satisfies PatientDetailImagingStudy;
    });

    const fromFallback = Array.isArray(fallbackRows)
        ? fallbackRows.map((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            return {
                id: asNonEmptyString(data.id) ?? `imaging-${index}`,
                modality: asNonEmptyString(data.modality) ?? asNonEmptyString(data.type) ?? 'Imaging',
                bodyPart: asNonEmptyString(data.bodyPart) ?? 'Unknown',
                status: asNonEmptyString(data.status) ?? 'Pending',
                date: toIsoDate(data.date),
                provider: asNonEmptyString(data.provider),
                facility: asNonEmptyString(data.facility),
                reportText: asNonEmptyString(data.reportText),
                viewerUrl: asNonEmptyString(data.viewerUrl)
            } satisfies PatientDetailImagingStudy;
        })
        : [];

    return [...fromSubcollection, ...fromFallback]
        .filter((study, index, rows) => rows.findIndex((candidate) => candidate.id === study.id) === index)
        .sort((first, second) => (second.date ?? '').localeCompare(first.date ?? ''));
}

function normalizeObservations(
    observationRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    labRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    vitalsHistory: unknown,
    labsHistory: unknown
): PatientDetailObservation[] {
    const normalized: PatientDetailObservation[] = [];

    (observationRows ?? []).forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        normalized.push({
            id: docSnap.id,
            category: (asNonEmptyString(data.category) === 'vital' ? 'vital' : 'lab'),
            name: asNonEmptyString(data.name) ?? asNonEmptyString(data.code) ?? 'Observation',
            date: toIsoDate(data.date ?? data.createdAt),
            value: asNonEmptyString(data.value) ?? String(asNumber(data.value) ?? ''),
            unit: asNonEmptyString(data.unit),
            referenceRange: asNonEmptyString(data.referenceRange),
            status: asNonEmptyString(data.status) ?? 'Recorded',
            notes: asNonEmptyString(data.notes)
        });
    });

    (labRows ?? []).forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        normalized.push({
            id: docSnap.id,
            category: 'lab',
            name: asNonEmptyString(data.testName) ?? 'Lab Result',
            date: toIsoDate(data.dateResulted),
            value: asNonEmptyString(data.value) ?? String(asNumber(data.numericValue) ?? ''),
            unit: asNonEmptyString(data.unit),
            referenceRange: asNonEmptyString(data.referenceRange),
            status: asNonEmptyString(data.status) ?? 'Resulted',
            notes: asNonEmptyString(data.notes)
        });
    });

    if (Array.isArray(vitalsHistory)) {
        vitalsHistory.forEach((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            const vitalEntries: Array<{ name: string; value: unknown; unit: string | null }> = [
                { name: 'Weight', value: data.weight ?? data.wt, unit: 'lbs' },
                { name: 'Blood Pressure', value: data.bp, unit: null },
                { name: 'Heart Rate', value: data.hr, unit: 'bpm' },
                { name: 'BMI', value: data.bmi, unit: null }
            ];
            vitalEntries.forEach(({ name, value, unit }, observationIndex) => {
                if (value === undefined || value === null || value === '') return;
                normalized.push({
                    id: `vital-${index}-${observationIndex}`,
                    category: 'vital',
                    name,
                    date: toIsoDate(data.date),
                    value: String(value),
                    unit,
                    referenceRange: null,
                    status: 'Recorded',
                    notes: null
                });
            });
        });
    }

    if (Array.isArray(labsHistory)) {
        labsHistory.forEach((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            const results = Array.isArray(data.results) ? data.results : [];
            results.forEach((result, resultIndex) => {
                const row = result as Record<string, unknown>;
                normalized.push({
                    id: `historic-lab-${index}-${resultIndex}`,
                    category: 'lab',
                    name: asNonEmptyString(row.test) ?? asNonEmptyString(data.panel) ?? 'Lab Result',
                    date: toIsoDate(data.date),
                    value: asNonEmptyString(row.value) ?? '',
                    unit: asNonEmptyString(row.unit),
                    referenceRange: asNonEmptyString(row.range),
                    status: asNonEmptyString(row.status) ?? 'Resulted',
                    notes: null
                });
            });
        });
    }

    return normalized
        .filter((observation) => observation.value.trim().length > 0)
        .sort((first, second) => (second.date ?? '').localeCompare(first.date ?? ''));
}

function normalizeDocuments(
    documentRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    consentRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    fallbackDocuments: unknown,
    fallbackConsents: unknown
): PatientDetailDocument[] {
    const normalized: PatientDetailDocument[] = [];

    (documentRows ?? []).forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        normalized.push({
            id: docSnap.id,
            name: asNonEmptyString(data.name) ?? 'Document',
            category: asNonEmptyString(data.category) ?? 'Other',
            date: toIsoDate(data.date ?? data.createdAt),
            type: asNonEmptyString(data.type),
            url: asNonEmptyString(data.url),
            size: asNonEmptyString(data.size),
            status: asNonEmptyString(data.status)
        });
    });

    (consentRows ?? []).forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        normalized.push({
            id: docSnap.id,
            name: asNonEmptyString(data.title) ?? 'Consent',
            category: 'Consent Forms',
            date: toIsoDate(data.date),
            type: 'Consent',
            url: asNonEmptyString(data.url),
            size: null,
            status: asNonEmptyString(data.status)
        });
    });

    if (Array.isArray(fallbackDocuments)) {
        fallbackDocuments.forEach((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            normalized.push({
                id: asNonEmptyString(data.id) ?? `document-${index}`,
                name: asNonEmptyString(data.name) ?? 'Document',
                category: asNonEmptyString(data.category) ?? 'Other',
                date: toIsoDate(data.date),
                type: asNonEmptyString(data.type),
                url: asNonEmptyString(data.url),
                size: asNonEmptyString(data.size),
                status: asNonEmptyString(data.status)
            });
        });
    }

    if (Array.isArray(fallbackConsents)) {
        fallbackConsents.forEach((entry, index) => {
            const data = (entry ?? {}) as Record<string, unknown>;
            normalized.push({
                id: asNonEmptyString(data.id) ?? `consent-${index}`,
                name: asNonEmptyString(data.title) ?? 'Consent',
                category: 'Consent Forms',
                date: toIsoDate(data.date),
                type: 'Consent',
                url: asNonEmptyString(data.url),
                size: null,
                status: asNonEmptyString(data.status)
            });
        });
    }

    return normalized
        .filter((document, index, rows) => rows.findIndex((candidate) => candidate.id === document.id) === index)
        .sort((first, second) => (second.date ?? '').localeCompare(first.date ?? ''));
}

function normalizeMessages(
    patientMessageRows: FirebaseFirestore.QueryDocumentSnapshot[] | null,
    threadMessages: Array<Record<string, unknown>>
): PatientDetailMessage[] {
    const normalized: PatientDetailMessage[] = [];

    (patientMessageRows ?? []).forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        normalized.push({
            id: docSnap.id,
            senderName: asNonEmptyString(data.senderName) ?? 'Care Team',
            senderType: (asNonEmptyString(data.senderType) as PatientDetailMessage['senderType']) ?? 'system',
            text: asNonEmptyString(data.text) ?? asNonEmptyString(data.preview) ?? '',
            timestamp: toIsoDateTime(data.timestamp ?? data.createdAt),
            unread: Boolean(data.unread)
        });
    });

    threadMessages.forEach((entry, index) => {
        normalized.push({
            id: asNonEmptyString(entry.id) ?? `thread-message-${index}`,
            senderName: asNonEmptyString(entry.senderName) ?? asNonEmptyString(entry.providerName) ?? asNonEmptyString(entry.patientName) ?? 'Message',
            senderType: (asNonEmptyString(entry.senderType) as PatientDetailMessage['senderType']) ?? 'provider',
            text: asNonEmptyString(entry.body) ?? asNonEmptyString(entry.text) ?? '',
            timestamp: toIsoDateTime(entry.createdAt ?? entry.timestamp),
            unread: entry.read === false
        });
    });

    return normalized
        .filter((message) => message.text.length > 0)
        .sort((first, second) => (second.timestamp ?? '').localeCompare(first.timestamp ?? ''));
}

function normalizeBilling(
    summaryDoc: FirebaseFirestore.DocumentSnapshot | null,
    fallbackBilling: unknown,
    statementRows: FirebaseFirestore.QueryDocumentSnapshot[] | null
): PatientDetailBilling {
    const fallback = (fallbackBilling ?? {}) as Record<string, unknown>;
    const summaryData = summaryDoc?.exists ? (summaryDoc.data() as Record<string, unknown>) : {};

    const statements: PatientBillingStatement[] = [
        ...(statementRows ?? []).map((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            return {
                id: docSnap.id,
                date: toIsoDate(data.date),
                amount: asNumber(data.amount) ?? 0,
                status: asNonEmptyString(data.status) ?? 'pending',
                items: Array.isArray(data.items)
                    ? data.items.map((item) => ({
                        description: asNonEmptyString((item as Record<string, unknown>).description) ?? 'Line Item',
                        amount: asNumber((item as Record<string, unknown>).amount) ?? 0
                    }))
                    : []
            } satisfies PatientBillingStatement;
        }),
        ...(fallback.history && Array.isArray(fallback.history)
            ? fallback.history.map((item, index) => {
                const row = item as Record<string, unknown>;
                return {
                    id: asNonEmptyString(row.id) ?? `statement-${index}`,
                    date: toIsoDate(row.date),
                    amount: asNumber(row.amount) ?? 0,
                    status: asNonEmptyString(row.status) ?? 'pending',
                    items: [{
                        description: asNonEmptyString(row.description) ?? 'Statement',
                        amount: asNumber(row.amount) ?? 0
                    }]
                } satisfies PatientBillingStatement;
            })
            : [])
    ].sort((first, second) => (second.date ?? '').localeCompare(first.date ?? ''));

    const subscription = (fallback.subscription ?? {}) as Record<string, unknown>;

    return {
        balance: asNumber(summaryData.balance) ?? asNumber(fallback.balance) ?? 0,
        status: asNonEmptyString(summaryData.status) ?? asNonEmptyString(subscription.status),
        nextBillingDate: toIsoDate(summaryData.nextBillingDate ?? subscription.nextBillingDate),
        membershipPlan: asNonEmptyString(summaryData.membershipPlan) ?? asNonEmptyString(subscription.plan),
        stripePortalUrl: asNonEmptyString(summaryData.stripePortalUrl) ?? asNonEmptyString(fallback.stripePortalUrl),
        statements
    } satisfies PatientDetailBilling;
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
        sex: asNonEmptyString(merged.sexAtBirth) ?? asNonEmptyString(merged.sex) ?? asNonEmptyString(merged.gender),
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

export async function loadProviderScopedPatientSummary(
    firestore: FirebaseFirestore.Firestore,
    providerId: string,
    patientId: string
): Promise<PatientRegistryRow | null> {
    const context = await loadProviderScopedPatientContext(firestore, providerId);
    if (!context.patientIds.includes(patientId)) {
        return null;
    }

    const { patientDocsById, userDocsById } = await loadPatientDocumentMaps(firestore, [patientId]);
    return buildSummaryRow({
        patientId,
        patientDoc: patientDocsById.get(patientId),
        userDoc: userDocsById.get(patientId),
        draft: context.draftRows.get(patientId) ?? {},
        teamRows: context.teamMemberships.get(patientId) ?? []
    });
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

    const patientRef = firestore.collection('patients').doc(patientId);
    const [problemsSnap, medicationsSnap, ordersSnap, imagingSnap, observationsSnap, labResultsSnap, documentsSnap, consentsSnap, patientMessagesSnap, billingSummarySnap, threadSnap] = await Promise.all([
        patientRef.collection('problems').get(),
        patientRef.collection('medications').get(),
        patientRef.collection('orders').get(),
        patientRef.collection('imaging').get(),
        patientRef.collection('observations').get(),
        patientRef.collection('lab_results').get(),
        patientRef.collection('documents').get(),
        patientRef.collection('consents').get(),
        patientRef.collection('messages').get(),
        patientRef.collection('billing').doc('summary').get(),
        firestore.collection('threads').where('providerId', '==', providerId).where('patientId', '==', patientId).limit(1).get()
    ]);

    const threadDoc = threadSnap.docs[0] ?? null;
    const [threadMessagesSnap, billingStatementsSnap] = await Promise.all([
        threadDoc ? threadDoc.ref.collection('messages').orderBy('createdAt', 'desc').limit(50).get() : Promise.resolve(null),
        billingSummarySnap.exists ? billingSummarySnap.ref.collection('statements').get() : Promise.resolve(null)
    ]);

    const problemList = normalizeProblemList(problemsSnap.docs, merged.problemList);
    const activeMedications = normalizeMedications(medicationsSnap.docs, merged.activeMedications);
    const recentEncounters = buildEncounterRows(patientId, context.appointmentRows.get(patientId) ?? []).slice(0, 10);
    const orders = normalizeOrders(ordersSnap.docs, merged.orders);
    const imagingStudies = normalizeImaging(imagingSnap.docs, merged.imaging);
    const observations = normalizeObservations(observationsSnap.docs, labResultsSnap.docs, merged.vitalsHistory, merged.labsHistory);
    const documents = normalizeDocuments(documentsSnap.docs, consentsSnap.docs, merged.documents, merged.consents);
    const messages = normalizeMessages(
        patientMessagesSnap.docs,
        (threadMessagesSnap?.docs ?? []).map((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            return {
                id: docSnap.id,
                ...data,
                senderName: asNonEmptyString(data.senderType) === 'patient'
                    ? (summary.name ?? 'Patient')
                    : (threadDoc?.data()?.providerName ?? 'Provider')
            };
        })
    );
    const billing = normalizeBilling(billingSummarySnap, merged.billing, billingStatementsSnap?.docs ?? null);

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
        recentEncounters,
        orders,
        imagingStudies,
        observations,
        documents,
        messages,
        billing
    };
}
