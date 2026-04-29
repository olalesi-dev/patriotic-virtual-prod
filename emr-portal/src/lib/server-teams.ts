import type { DocumentSnapshot, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { PatientSummary, ProviderSummary, TeamMemberSummary, TeamSummary } from '@/lib/team-types';

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
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

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const values = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

    return Array.from(new Set(values));
}

function readMember(value: unknown): TeamMemberSummary | null {
    if (typeof value !== 'object' || value === null) return null;
    const raw = value as Record<string, unknown>;
    const id = asNonEmptyString(raw.id) ?? asNonEmptyString(raw.uid);
    if (!id) return null;

    return {
        id,
        name: asNonEmptyString(raw.name) ?? asNonEmptyString(raw.displayName) ?? `Provider ${id.slice(0, 6)}`,
        email: asNonEmptyString(raw.email),
        role: asNonEmptyString(raw.role)
    };
}

function asMemberArray(value: unknown): TeamMemberSummary[] {
    if (!Array.isArray(value)) return [];
    const members = value
        .map((item) => readMember(item))
        .filter((item): item is TeamMemberSummary => Boolean(item));

    const seen = new Set<string>();
    return members.filter((member) => {
        if (seen.has(member.id)) return false;
        seen.add(member.id);
        return true;
    });
}

function readDisplayName(value: Record<string, unknown> | undefined): string | null {
    const directName = asNonEmptyString(value?.name) ?? asNonEmptyString(value?.displayName);
    if (directName) return directName;

    const firstName = asNonEmptyString(value?.firstName);
    const lastName = asNonEmptyString(value?.lastName);
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName ?? lastName ?? null;
}

function sameStringArray(first: string[], second: string[]): boolean {
    if (first.length !== second.length) return false;
    return first.every((value, index) => value === second[index]);
}

function sameMembers(first: TeamMemberSummary[], second: TeamMemberSummary[]): boolean {
    if (first.length !== second.length) return false;

    return first.every((member, index) => {
        const next = second[index];
        return (
            member.id === next.id &&
            member.name === next.name &&
            member.email === next.email &&
            member.role === next.role
        );
    });
}

function mergeUserData(
    primary?: Record<string, unknown>,
    secondary?: Record<string, unknown>
): Record<string, unknown> | null {
    if (!primary && !secondary) return null;
    return {
        ...(secondary ?? {}),
        ...(primary ?? {})
    };
}

export function toProviderRole(value: unknown): string | null {
    const normalized = asNonEmptyString(value)?.toLowerCase() ?? null;
    if (!normalized) return null;
    if (['provider', 'doctor', 'clinician', 'admin'].includes(normalized)) {
        return normalized;
    }
    return null;
}

export function mapUserDocToMember(snapshot: DocumentSnapshot): TeamMemberSummary | null {
    if (!snapshot.exists) return null;
    const data = snapshot.data() as Record<string, unknown>;
    return mapUserRecordToMember(snapshot.id, data);
}

export function mapUserRecordToMember(
    id: string,
    data: Record<string, unknown> | undefined
): TeamMemberSummary | null {
    return {
        id,
        name: readDisplayName(data) ?? `Provider ${id.slice(0, 6)}`,
        email: asNonEmptyString(data?.email),
        role: toProviderRole(data?.role)
    };
}

export function mapTeamSnapshot(snapshot: QueryDocumentSnapshot | DocumentSnapshot): TeamSummary | null {
    if (!snapshot.exists) return null;

    const data = snapshot.data() as Record<string, unknown>;
    const createdAt = asDate(data.createdAt) ?? new Date();
    const updatedAt = asDate(data.updatedAt) ?? createdAt;

    const memberIds = asStringArray(data.memberIds);
    const members = asMemberArray(data.members);
    const mergedMembers = [...members];

    const ownerId = asNonEmptyString(data.ownerId) ?? memberIds[0] ?? members[0]?.id ?? '';
    if (!ownerId) return null;

    memberIds.forEach((memberId) => {
        if (!mergedMembers.some((member) => member.id === memberId)) {
            mergedMembers.push({
                id: memberId,
                name: `Provider ${memberId.slice(0, 6)}`,
                email: null,
                role: null
            });
        }
    });

    const normalizedMemberIds = Array.from(new Set([
        ownerId,
        ...memberIds,
        ...mergedMembers.map((member) => member.id)
    ]));

    const ownerName = asNonEmptyString(data.ownerName)
        ?? mergedMembers.find((member) => member.id === ownerId)?.name
        ?? 'Provider';

    if (!mergedMembers.some((member) => member.id === ownerId)) {
        mergedMembers.unshift({
            id: ownerId,
            name: ownerName,
            email: null,
            role: null
        });
    }

    return {
        id: snapshot.id,
        name: asNonEmptyString(data.name) ?? 'Untitled Team',
        description: asNonEmptyString(data.description),
        ownerId,
        ownerName,
        memberIds: normalizedMemberIds,
        members: mergedMembers,
        patientIds: asStringArray(data.patientIds),
        pendingInviteDoctorIds: asStringArray(data.pendingInviteDoctorIds),
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString()
    };
}

export function buildTeamRepairPatch(
    snapshot: QueryDocumentSnapshot | DocumentSnapshot,
    team: TeamSummary
): Record<string, unknown> | null {
    if (!snapshot.exists) return null;

    const data = snapshot.data() as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (asNonEmptyString(data.ownerId) !== team.ownerId) {
        patch.ownerId = team.ownerId;
    }

    if (asNonEmptyString(data.ownerName) !== team.ownerName) {
        patch.ownerName = team.ownerName;
    }

    const currentMemberIds = asStringArray(data.memberIds);
    if (!sameStringArray(currentMemberIds, team.memberIds)) {
        patch.memberIds = team.memberIds;
    }

    const currentMembers = asMemberArray(data.members);
    if (!sameMembers(currentMembers, team.members)) {
        patch.members = team.members;
    }

    const currentPatientIds = asStringArray(data.patientIds);
    if (!sameStringArray(currentPatientIds, team.patientIds)) {
        patch.patientIds = team.patientIds;
    }

    const currentPendingInviteDoctorIds = asStringArray(data.pendingInviteDoctorIds);
    if (!sameStringArray(currentPendingInviteDoctorIds, team.pendingInviteDoctorIds)) {
        patch.pendingInviteDoctorIds = team.pendingInviteDoctorIds;
    }

    return Object.keys(patch).length > 0
        ? {
            ...patch,
            updatedAt: new Date()
        }
        : null;
}

export async function loadMergedUserRecord(
    firestore: Firestore,
    uid: string
): Promise<Record<string, unknown> | null> {
    const [userDoc, patientDoc] = await Promise.all([
        firestore.collection('users').doc(uid).get(),
        firestore.collection('patients').doc(uid).get()
    ]);

    return mergeUserData(
        userDoc.exists ? userDoc.data() as Record<string, unknown> : undefined,
        patientDoc.exists ? patientDoc.data() as Record<string, unknown> : undefined
    );
}

export async function loadMergedUserRecords(
    firestore: Firestore,
    limit = 500
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    const [usersSnapshot, patientsSnapshot] = await Promise.all([
        firestore.collection('users').limit(limit).get(),
        firestore.collection('patients').limit(limit).get()
    ]);

    const records = new Map<string, Record<string, unknown>>();

    patientsSnapshot.docs.forEach((doc) => {
        records.set(doc.id, doc.data() as Record<string, unknown>);
    });

    usersSnapshot.docs.forEach((doc) => {
        records.set(
            doc.id,
            mergeUserData(
                doc.data() as Record<string, unknown>,
                records.get(doc.id)
            ) ?? {}
        );
    });

    return Array.from(records.entries()).map(([id, data]) => ({ id, data }));
}

export function mapUserRecordToProviderSummary(
    id: string,
    data: Record<string, unknown>
): ProviderSummary | null {
    const role = toProviderRole(data.role);
    if (!role || role === 'admin') return null;

    return {
        id,
        name: readDisplayName(data) ?? `Provider ${id.slice(0, 6)}`,
        email: asNonEmptyString(data.email),
        role
    };
}

export function mapUserRecordToPatientSummary(
    id: string,
    data: Record<string, unknown>
): PatientSummary | null {
    const normalizedRole = asNonEmptyString(data.role)?.toLowerCase() ?? null;
    if (normalizedRole && normalizedRole !== 'patient') return null;

    return {
        id,
        name: readDisplayName(data) ?? asNonEmptyString(data.email)?.split('@')[0] ?? `Patient ${id.slice(0, 6)}`,
        email: asNonEmptyString(data.email),
        teamId: asNonEmptyString(data.teamId)
    };
}
