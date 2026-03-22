import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { TeamMemberSummary, TeamSummary } from '@/lib/team-types';

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
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
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
    return {
        id: snapshot.id,
        name: readDisplayName(data) ?? `Provider ${snapshot.id.slice(0, 6)}`,
        email: asNonEmptyString(data.email),
        role: toProviderRole(data.role)
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

    const ownerId = asNonEmptyString(data.ownerId) ?? memberIds[0] ?? '';
    if (!ownerId) return null;

    const ownerName = asNonEmptyString(data.ownerName)
        ?? mergedMembers.find((member) => member.id === ownerId)?.name
        ?? 'Provider';

    return {
        id: snapshot.id,
        name: asNonEmptyString(data.name) ?? 'Untitled Team',
        description: asNonEmptyString(data.description),
        ownerId,
        ownerName,
        memberIds,
        members: mergedMembers,
        patientIds: asStringArray(data.patientIds),
        pendingInviteDoctorIds: asStringArray(data.pendingInviteDoctorIds),
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString()
    };
}
