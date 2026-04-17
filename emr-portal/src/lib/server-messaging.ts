import type { Firestore } from 'firebase-admin/firestore';
import type { AuthenticatedUser } from '@/lib/server-auth';
import { loadProviderScopedPatientSummary } from '@/lib/server-patients';
import { createNotification } from '@/lib/server-notifications';
import { normalizeRole } from '@/lib/server-auth';
import { buildTeamRepairPatch, mapTeamSnapshot } from '@/lib/server-teams';

type MessageThreadType = 'patient_provider' | 'provider_provider';
type MessageRecipientType = 'patient' | 'provider';

interface ParticipantSummary {
    id: string;
    name: string;
    role: string | null;
}

export interface MessageAttachmentInput {
    name: string;
    url: string;
    type: string;
}

export interface SendMessageInput {
    threadId?: string | null;
    recipientId?: string | null;
    recipientType?: MessageRecipientType | null;
    subject?: string | null;
    category?: string | null;
    body: string;
    attachment?: MessageAttachmentInput | null;
    teamId?: string | null;
    teamName?: string | null;
}

interface ThreadAccessContext {
    threadId: string;
    threadType: MessageThreadType;
    recipientId: string;
    recipientType: MessageRecipientType;
    patientId: string | null;
    providerId: string | null;
    subject: string;
    category: string;
    patientName: string | null;
    providerName: string | null;
    participantIds: string[];
    participantSummaries: ParticipantSummary[];
    teamId: string | null;
    teamName: string | null;
    unreadCount: number;
    providerUnreadCount: number;
}

interface SendMessageResult {
    success: true;
    threadId: string;
    messageId: string;
    threadType: MessageThreadType;
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function sanitizeMessageBody(value: string): string {
    return value.trim().replace(/\s+/g, ' ').slice(0, 5_000);
}

function toMessagePreview(body: string, attachment?: MessageAttachmentInput | null): string {
    const trimmed = body.trim();
    if (trimmed.length > 0) return trimmed.slice(0, 280);
    if (attachment?.name) return `Attachment: ${attachment.name}`;
    return 'New message';
}

function toDisplayName(
    userData: Record<string, unknown> | undefined,
    fallbackId: string,
    fallbackLabel: string
): string {
    const directName = asNonEmptyString(userData?.name) ?? asNonEmptyString(userData?.displayName);
    if (directName) return directName;

    const firstName = asNonEmptyString(userData?.firstName);
    const lastName = asNonEmptyString(userData?.lastName);
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;

    const emailPrefix = asNonEmptyString(userData?.email)?.split('@')[0];
    if (emailPrefix) return emailPrefix;

    return `${fallbackLabel} ${fallbackId.slice(0, 6)}`;
}

function toParticipantSummary(
    id: string,
    userData: Record<string, unknown> | undefined,
    fallbackLabel: string
): ParticipantSummary {
    return {
        id,
        name: toDisplayName(userData, id, fallbackLabel),
        role: normalizeRole(userData?.role)
    };
}

function resolveActorType(
    actor: AuthenticatedUser,
    actorRecord?: Record<string, unknown>
): MessageRecipientType {
    const resolvedRole = normalizeRole(actor.token.role ?? actor.role ?? actorRecord?.role);
    return resolvedRole === 'patient' ? 'patient' : 'provider';
}

async function loadUserRecord(
    firestore: Firestore,
    uid: string
): Promise<Record<string, unknown> | undefined> {
    const [userDoc, patientDoc] = await Promise.all([
        firestore.collection('users').doc(uid).get(),
        firestore.collection('patients').doc(uid).get()
    ]);

    return {
        ...(userDoc.exists ? userDoc.data() as Record<string, unknown> : {}),
        ...(patientDoc.exists ? patientDoc.data() as Record<string, unknown> : {})
    };
}

async function resolveExistingPatientProviderThread(
    firestore: Firestore,
    actor: AuthenticatedUser,
    recipientId: string,
    actorType: MessageRecipientType
) {
    const queryField = actorType === 'patient' ? 'patientId' : 'providerId';
    const snapshot = await firestore.collection('threads').where(queryField, '==', actor.uid).limit(500).get();
    return snapshot.docs.find((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const threadType = asNonEmptyString(data.threadType) ?? 'patient_provider';
        if (threadType !== 'patient_provider') return false;

        if (actorType === 'patient') {
            return asNonEmptyString(data.providerId) === recipientId;
        }

        return asNonEmptyString(data.patientId) === recipientId;
    }) ?? null;
}

async function resolveExistingProviderProviderThread(
    firestore: Firestore,
    actorId: string,
    recipientId: string,
    teamId: string
) {
    const snapshot = await firestore.collection('threads').where('participantIds', 'array-contains', actorId).limit(500).get();
    return snapshot.docs.find((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return (
            asNonEmptyString(data.threadType) === 'provider_provider' &&
            asNonEmptyString(data.teamId) === teamId &&
            Array.isArray(data.participantIds) &&
            (data.participantIds as unknown[]).includes(recipientId)
        );
    }) ?? null;
}

async function resolveThreadAccess(
    firestore: Firestore,
    actor: AuthenticatedUser,
    input: SendMessageInput
): Promise<ThreadAccessContext> {
    const actorRecord = await loadUserRecord(firestore, actor.uid);
    const actorType = resolveActorType(actor, actorRecord);
    const actorSummary = toParticipantSummary(
        actor.uid,
        actorRecord,
        actorType === 'patient' ? 'Patient' : 'Provider'
    );

    if (input.threadId) {
        const threadDoc = await firestore.collection('threads').doc(input.threadId).get();
        if (!threadDoc.exists) {
            throw new Error('Conversation not found.');
        }

        const data = threadDoc.data() as Record<string, unknown>;
        const threadType = (asNonEmptyString(data.threadType) ?? 'patient_provider') as MessageThreadType;
        const participantIds = Array.isArray(data.participantIds)
            ? data.participantIds.filter((entry): entry is string => typeof entry === 'string')
            : [];

        if (threadType === 'provider_provider') {
            if (!participantIds.includes(actor.uid)) {
                throw new Error('You do not have access to this conversation.');
            }

            const recipientId = participantIds.find((entry) => entry !== actor.uid);
            if (!recipientId) {
                throw new Error('Conversation recipient could not be resolved.');
            }

            const participantSummaries = Array.isArray(data.participantSummaries)
                ? (data.participantSummaries as Array<Record<string, unknown>>)
                    .map((entry) => {
                        const id = asNonEmptyString(entry.id);
                        if (!id) return null;
                        return {
                            id,
                            name: asNonEmptyString(entry.name) ?? `Provider ${id.slice(0, 6)}`,
                            role: normalizeRole(entry.role)
                        } satisfies ParticipantSummary;
                    })
                    .filter((entry): entry is ParticipantSummary => Boolean(entry))
                : [actorSummary];

            return {
                threadId: threadDoc.id,
                threadType,
                recipientId,
                recipientType: 'provider',
                patientId: null,
                providerId: asNonEmptyString(data.providerId),
                subject: asNonEmptyString(data.subject) ?? 'Team conversation',
                category: asNonEmptyString(data.category) ?? 'Team',
                patientName: null,
                providerName: asNonEmptyString(data.providerName),
                participantIds: participantIds.length > 0 ? participantIds : [actor.uid, recipientId],
                participantSummaries,
                teamId: asNonEmptyString(data.teamId),
                teamName: asNonEmptyString(data.teamName),
                unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
                providerUnreadCount: typeof data.providerUnreadCount === 'number' ? data.providerUnreadCount : 0
            };
        }

        const patientId = asNonEmptyString(data.patientId);
        const providerId = asNonEmptyString(data.providerId);
        if (!patientId || !providerId || (patientId !== actor.uid && providerId !== actor.uid)) {
            throw new Error('You do not have access to this conversation.');
        }

        return {
            threadId: threadDoc.id,
            threadType: 'patient_provider',
            recipientId: patientId === actor.uid ? providerId : patientId,
            recipientType: patientId === actor.uid ? 'provider' : 'patient',
            patientId,
            providerId,
            subject: asNonEmptyString(data.subject) ?? 'Patient conversation',
            category: asNonEmptyString(data.category) ?? 'General',
            patientName: asNonEmptyString(data.patientName),
            providerName: asNonEmptyString(data.providerName),
            participantIds: participantIds.length > 0 ? participantIds : [patientId, providerId],
            participantSummaries: Array.isArray(data.participantSummaries)
                ? (data.participantSummaries as Array<Record<string, unknown>>)
                    .map((entry) => {
                        const id = asNonEmptyString(entry.id);
                        if (!id) return null;
                        return {
                            id,
                            name: asNonEmptyString(entry.name) ?? `User ${id.slice(0, 6)}`,
                            role: normalizeRole(entry.role)
                        } satisfies ParticipantSummary;
                    })
                    .filter((entry): entry is ParticipantSummary => Boolean(entry))
                : [actorSummary],
            teamId: null,
            teamName: null,
            unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
            providerUnreadCount: typeof data.providerUnreadCount === 'number' ? data.providerUnreadCount : 0
        };
    }

    const recipientId = asNonEmptyString(input.recipientId);
    if (!recipientId) {
        throw new Error('Message recipient is required.');
    }

    const recipientType = input.recipientType ?? (actorType === 'patient' ? 'provider' : 'patient');
    const recipientRecord = await loadUserRecord(firestore, recipientId);
    const recipientSummary = toParticipantSummary(
        recipientId,
        recipientRecord,
        recipientType === 'patient' ? 'Patient' : 'Provider'
    );

    if (recipientType === 'patient') {
        if (actorType !== 'provider') {
            throw new Error('Only providers can start patient conversations.');
        }

        const patientSummary = await loadProviderScopedPatientSummary(firestore, actor.uid, recipientId);
        if (!patientSummary) {
            throw new Error('Patient is not available in your messaging scope.');
        }

        const existingThread = await resolveExistingPatientProviderThread(firestore, actor, recipientId, actorType);
        if (existingThread) {
            return resolveThreadAccess(firestore, actor, { threadId: existingThread.id, body: input.body });
        }

        const now = new Date();
        const threadRef = firestore.collection('threads').doc();
        await threadRef.set({
            threadType: 'patient_provider',
            patientId: recipientId,
            patientName: patientSummary.name,
            providerId: actor.uid,
            providerName: actorSummary.name,
            participantIds: [recipientId, actor.uid],
            participantSummaries: [recipientSummary, actorSummary],
            subject: asNonEmptyString(input.subject) ?? 'Patient conversation',
            category: asNonEmptyString(input.category) ?? 'General',
            lastMessage: '',
            lastMessageAt: now,
            updatedAt: now,
            unreadCount: 0,
            providerUnreadCount: 0
        });

        return {
            threadId: threadRef.id,
            threadType: 'patient_provider',
            recipientId,
            recipientType,
            patientId: recipientId,
            providerId: actor.uid,
            subject: asNonEmptyString(input.subject) ?? 'Patient conversation',
            category: asNonEmptyString(input.category) ?? 'General',
            patientName: patientSummary.name,
            providerName: actorSummary.name,
            participantIds: [recipientId, actor.uid],
            participantSummaries: [recipientSummary, actorSummary],
            teamId: null,
            teamName: null,
            unreadCount: 0,
            providerUnreadCount: 0
        };
    }

    if (recipientType === 'provider' && actorType === 'patient') {
        const existingThread = await resolveExistingPatientProviderThread(firestore, actor, recipientId, actorType);
        if (existingThread) {
            return resolveThreadAccess(firestore, actor, { threadId: existingThread.id, body: input.body });
        }

        const now = new Date();
        const threadRef = firestore.collection('threads').doc();
        await threadRef.set({
            threadType: 'patient_provider',
            patientId: actor.uid,
            patientName: actorSummary.name,
            providerId: recipientId,
            providerName: recipientSummary.name,
            participantIds: [actor.uid, recipientId],
            participantSummaries: [actorSummary, recipientSummary],
            subject: asNonEmptyString(input.subject) ?? 'Patient conversation',
            category: asNonEmptyString(input.category) ?? 'General',
            lastMessage: '',
            lastMessageAt: now,
            updatedAt: now,
            unreadCount: 0,
            providerUnreadCount: 0
        });

        return {
            threadId: threadRef.id,
            threadType: 'patient_provider',
            recipientId,
            recipientType,
            patientId: actor.uid,
            providerId: recipientId,
            subject: asNonEmptyString(input.subject) ?? 'Patient conversation',
            category: asNonEmptyString(input.category) ?? 'General',
            patientName: actorSummary.name,
            providerName: recipientSummary.name,
            participantIds: [actor.uid, recipientId],
            participantSummaries: [actorSummary, recipientSummary],
            teamId: null,
            teamName: null,
            unreadCount: 0,
            providerUnreadCount: 0
        };
    }

    if (actorType !== 'provider') {
        throw new Error('Only providers can start team conversations.');
    }

    const teamId = asNonEmptyString(input.teamId);
    if (!teamId) {
        throw new Error('Team selection is required for provider messaging.');
    }

    const teamDoc = await firestore.collection('teams').doc(teamId).get();
    const team = mapTeamSnapshot(teamDoc);
    if (!team) {
        throw new Error('Selected team was not found.');
    }

    const repairPatch = buildTeamRepairPatch(teamDoc, team);
    if (repairPatch) {
        await teamDoc.ref.set(repairPatch, { merge: true });
    }

    if (!team.memberIds.includes(actor.uid) || !team.memberIds.includes(recipientId)) {
        throw new Error('Provider messaging is limited to your own team members.');
    }

    const existingThread = await resolveExistingProviderProviderThread(firestore, actor.uid, recipientId, teamId);
    if (existingThread) {
        return resolveThreadAccess(firestore, actor, { threadId: existingThread.id, body: input.body });
    }

    const now = new Date();
    const threadRef = firestore.collection('threads').doc();
    const teamName = asNonEmptyString(input.teamName) ?? team.name ?? 'Care Team';
    const participantSummaries = [actorSummary, recipientSummary];
    await threadRef.set({
        threadType: 'provider_provider',
        providerId: recipientId,
        providerName: recipientSummary.name,
        participantIds: [actor.uid, recipientId],
        participantSummaries,
        teamId,
        teamName,
        subject: asNonEmptyString(input.subject) ?? `${teamName} conversation`,
        category: asNonEmptyString(input.category) ?? 'Team',
        lastMessage: '',
        lastMessageAt: now,
        updatedAt: now,
        unreadCount: 0,
        providerUnreadCount: 0
    });

    return {
        threadId: threadRef.id,
        threadType: 'provider_provider',
        recipientId,
        recipientType: 'provider',
        patientId: null,
        providerId: recipientId,
        subject: asNonEmptyString(input.subject) ?? `${teamName} conversation`,
        category: asNonEmptyString(input.category) ?? 'Team',
        patientName: null,
        providerName: recipientSummary.name,
        participantIds: [actor.uid, recipientId],
        participantSummaries,
        teamId,
        teamName,
        unreadCount: 0,
        providerUnreadCount: 0
    };
}

export async function sendMessage(
    firestore: Firestore,
    actor: AuthenticatedUser,
    input: SendMessageInput
): Promise<SendMessageResult> {
    const body = sanitizeMessageBody(input.body);
    if (!body && !input.attachment) {
        throw new Error('Message body is required.');
    }

    const context = await resolveThreadAccess(firestore, actor, input);
    const now = new Date();
    const actorRecord = await loadUserRecord(firestore, actor.uid);
    const actorType = resolveActorType(actor, actorRecord);
    const actorName = toDisplayName(actorRecord, actor.uid, actorType === 'patient' ? 'Patient' : 'Provider');
    const messageRef = firestore.collection('threads').doc(context.threadId).collection('messages').doc();

    await messageRef.set({
        senderId: actor.uid,
        senderType: actorType,
        senderName: actorName,
        body,
        createdAt: now,
        read: false,
        attachment: input.attachment ?? null
    });

    const updatePayload: Record<string, unknown> = {
        threadType: context.threadType,
        patientId: context.patientId,
        patientName: context.patientName,
        providerId: context.providerId,
        providerName: context.providerName,
        participantIds: context.participantIds,
        participantSummaries: context.participantSummaries,
        teamId: context.teamId,
        teamName: context.teamName,
        subject: context.subject,
        category: context.category,
        lastMessage: toMessagePreview(body, input.attachment),
        lastMessageAt: now,
        updatedAt: now
    };

    if (context.recipientType === 'patient') {
        updatePayload.unreadCount = context.unreadCount + 1;
        updatePayload.providerUnreadCount = 0;
    } else {
        updatePayload.unreadCount = 0;
        updatePayload.providerUnreadCount = context.providerUnreadCount + 1;
    }

    await firestore.collection('threads').doc(context.threadId).set(updatePayload, { merge: true });

    const recipientRoleLabel = context.recipientType === 'patient' ? 'Patient' : 'Provider';
    await createNotification({
        recipientId: context.recipientId,
        actorId: actor.uid,
        actorName,
        type: 'message_received',
        title: `New message from ${actorName}`,
        body: toMessagePreview(body, input.attachment),
        href: context.recipientType === 'patient' ? '/patient/messages' : '/inbox',
        metadata: {
            threadId: context.threadId,
            threadType: context.threadType,
            recipientRole: recipientRoleLabel.toLowerCase(),
            patientId: context.patientId,
            providerId: context.providerId,
            teamId: context.teamId,
            teamName: context.teamName
        },
        priority: 'medium'
    });

    return {
        success: true,
        threadId: context.threadId,
        messageId: messageRef.id,
        threadType: context.threadType
    };
}
