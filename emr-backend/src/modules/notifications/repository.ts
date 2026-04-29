import { randomUUID } from 'crypto';
import { admin, firestore } from '../../config/firebase';
import type {
    NotificationDeliveryRecord,
    NotificationEventRecord,
    NotificationMessageRecord,
    NotificationPreferenceCategory,
    RecipientProfile,
} from './types';

const MESSAGES_COLLECTION = 'notificationMessages';
const DELIVERIES_COLLECTION = 'notificationDeliveries';
const EVENTS_COLLECTION = 'notificationEvents';
const SETTINGS_COLLECTION = 'user_settings';
const USERS_COLLECTION = 'users';
const PATIENTS_COLLECTION = 'patients';
const INBOX_COLLECTION = 'notifications';
const INVALID_FCM_TOKEN_CODES = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
]);

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function toDisplayName(uid: string, userData: Record<string, unknown>, patientData: Record<string, unknown>): string {
    const directName = asString(userData.name)
        ?? asString(userData.displayName)
        ?? asString(patientData.name)
        ?? asString(patientData.displayName);

    if (directName) return directName;

    const firstName = asString(userData.firstName) ?? asString(patientData.firstName);
    const lastName = asString(userData.lastName) ?? asString(patientData.lastName);
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;

    const emailPrefix = (asString(userData.email) ?? asString(patientData.email))?.split('@')[0];
    if (emailPrefix) return emailPrefix;

    return `User ${uid.slice(0, 6)}`;
}

export class NotificationRepository {
    async findRecentMessageByDedupeKey(dedupeKey: string, since: Date): Promise<NotificationMessageRecord | null> {
        const snapshot = await firestore.collection(MESSAGES_COLLECTION)
            .where('dedupeKey', '==', dedupeKey)
            .limit(5)
            .get();

        const matchingDoc = snapshot.docs.find((docSnap) => {
            const data = docSnap.data();
            const createdAt = asDate(data.createdAt);
            const status = asString(data.status);
            return Boolean(createdAt && createdAt >= since && status !== 'cancelled');
        });

        if (!matchingDoc) return null;
        return this.mapMessage(matchingDoc.id, matchingDoc.data());
    }

    async createMessage(input: Omit<NotificationMessageRecord, 'id'>): Promise<NotificationMessageRecord> {
        const docRef = firestore.collection(MESSAGES_COLLECTION).doc();
        await docRef.set(input);
        return { id: docRef.id, ...input };
    }

    async updateMessage(messageId: string, patch: Partial<NotificationMessageRecord>): Promise<void> {
        await firestore.collection(MESSAGES_COLLECTION).doc(messageId).set({
            ...patch,
            updatedAt: new Date(),
        }, { merge: true });
    }

    async createDeliveries(deliveries: Array<Omit<NotificationDeliveryRecord, 'id'>>): Promise<NotificationDeliveryRecord[]> {
        const batch = firestore.batch();
        const created: NotificationDeliveryRecord[] = [];

        for (const delivery of deliveries) {
            const docRef = firestore.collection(DELIVERIES_COLLECTION).doc();
            batch.set(docRef, delivery);
            created.push({ id: docRef.id, ...delivery });
        }

        await batch.commit();
        return created;
    }

    async getDelivery(deliveryId: string): Promise<NotificationDeliveryRecord | null> {
        const snapshot = await firestore.collection(DELIVERIES_COLLECTION).doc(deliveryId).get();
        if (!snapshot.exists) return null;
        return this.mapDelivery(snapshot.id, snapshot.data() ?? {});
    }

    async getMessage(messageId: string): Promise<NotificationMessageRecord | null> {
        const snapshot = await firestore.collection(MESSAGES_COLLECTION).doc(messageId).get();
        if (!snapshot.exists) return null;
        return this.mapMessage(snapshot.id, snapshot.data() ?? {});
    }

    async updateDelivery(deliveryId: string, patch: Partial<NotificationDeliveryRecord>): Promise<void> {
        await firestore.collection(DELIVERIES_COLLECTION).doc(deliveryId).set({
            ...patch,
            updatedAt: new Date(),
        }, { merge: true });
    }

    async listDeliveriesByMessageId(messageId: string): Promise<NotificationDeliveryRecord[]> {
        const snapshot = await firestore.collection(DELIVERIES_COLLECTION)
            .where('messageId', '==', messageId)
            .get();

        return snapshot.docs.map((docSnap) => this.mapDelivery(docSnap.id, docSnap.data()));
    }

    async listRecentDeliveriesByRecipientId(recipientId: string, limit = 25): Promise<NotificationDeliveryRecord[]> {
        const snapshot = await firestore.collection(DELIVERIES_COLLECTION)
            .where('recipientId', '==', recipientId)
            .limit(Math.max(limit, 1))
            .get();

        return snapshot.docs
            .map((docSnap) => this.mapDelivery(docSnap.id, docSnap.data()))
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .slice(0, limit);
    }

    async getRecipientProfiles(recipientIds: string[]): Promise<RecipientProfile[]> {
        const profiles = await Promise.all(recipientIds.map(async (uid) => {
            const [userDoc, patientDoc] = await Promise.all([
                firestore.collection(USERS_COLLECTION).doc(uid).get(),
                firestore.collection(PATIENTS_COLLECTION).doc(uid).get(),
            ]);
            const userData = userDoc.exists ? asRecord(userDoc.data()) : {};
            const patientData = patientDoc.exists ? asRecord(patientDoc.data()) : {};

            return {
                uid,
                email: asString(userData.email) ?? asString(patientData.email),
                phone: asString(userData.phone) ?? asString(userData.phoneNumber) ?? asString(patientData.phone) ?? asString(patientData.phoneNumber),
                displayName: toDisplayName(uid, userData, patientData),
                role: asString(userData.role) ?? asString(patientData.role),
            } satisfies RecipientProfile;
        }));

        return profiles;
    }

    async getCategoryPreferences(uid: string): Promise<Record<NotificationPreferenceCategory, { inApp: boolean; email: boolean }> | null> {
        const snapshot = await firestore.collection(SETTINGS_COLLECTION).doc(uid).get();
        if (!snapshot.exists) return null;

        const notifications = asRecord(snapshot.data()?.notifications);
        return {
            scheduling: this.readCategoryPreference(notifications.scheduling),
            practitionerScheduling: this.readCategoryPreference(notifications.practitionerScheduling),
            billing: this.readCategoryPreference(notifications.billing),
            clientDocumentation: this.readCategoryPreference(notifications.clientDocumentation),
            workspace: this.readCategoryPreference(notifications.workspace),
            communications: this.readCategoryPreference(notifications.communications),
        };
    }

    async projectInAppNotification(input: {
        deliveryId: string;
        recipientId: string;
        actorId: string | null;
        actorName: string | null;
        type: string;
        title: string;
        body: string;
        href: string | null;
        priority: string;
        metadata: Record<string, unknown>;
        source: string | null;
    }): Promise<string> {
        const docRef = firestore.collection(INBOX_COLLECTION).doc(input.deliveryId);
        const now = new Date();

        await docRef.set({
            recipientId: input.recipientId,
            actorId: input.actorId,
            actorName: input.actorName,
            type: input.type,
            title: input.title,
            body: input.body,
            href: input.href,
            read: false,
            priority: input.priority,
            metadata: input.metadata,
            source: input.source ?? 'app',
            createdAt: now,
            updatedAt: now,
        }, { merge: true });

        await this.sendPushNotification({
            notificationId: docRef.id,
            recipientId: input.recipientId,
            type: input.type,
            title: input.title,
            body: input.body,
            href: input.href,
            source: input.source ?? 'app',
        });

        return docRef.id;
    }

    private async sendPushNotification(input: {
        notificationId: string;
        recipientId: string;
        type: string;
        title: string;
        body: string;
        href: string | null;
        source: string;
    }): Promise<void> {
        const userDoc = await firestore.collection(USERS_COLLECTION).doc(input.recipientId).get();
        if (!userDoc.exists) return;

        const userData = asRecord(userDoc.data());
        const rawTokens = Array.isArray(userData.fcmTokens)
            ? userData.fcmTokens
            : [userData.fcmToken];

        const tokens = rawTokens
            .filter((token): token is string => typeof token === 'string' && token.trim().length > 0)
            .map((token) => token.trim())
            .slice(0, 20);

        if (tokens.length === 0) return;

        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
                title: input.title,
                body: input.body,
            },
            data: {
                notificationId: input.notificationId,
                type: input.type,
                href: input.href ?? '',
                source: input.source,
                nonce: randomUUID().slice(0, 8),
            },
            webpush: {
                fcmOptions: {
                    link: input.href ?? '/notifications',
                },
            },
        });

        const invalidTokens = response.responses
            .map((item, index) => ({ item, token: tokens[index] }))
            .filter(({ item }) => {
                const code = item.error?.code ?? '';
                return item.success === false && INVALID_FCM_TOKEN_CODES.has(code);
            })
            .map(({ token }) => token);

        if (invalidTokens.length > 0) {
            const deduped = new Set<string>(invalidTokens);
            const cleanedTokens = tokens.filter((token) => !deduped.has(token));
            await firestore.collection(USERS_COLLECTION).doc(input.recipientId).set({
                fcmTokens: cleanedTokens,
                updatedAt: new Date(),
            }, { merge: true });
        }

        const transientFailure = response.responses.find((item) => {
            if (item.success) return false;
            const code = item.error?.code ?? '';
            return !INVALID_FCM_TOKEN_CODES.has(code);
        });

        if (transientFailure) {
            throw transientFailure.error ?? new Error('Push notification delivery failed.');
        }
    }

    async recordEvent(input: Omit<NotificationEventRecord, 'id'>): Promise<NotificationEventRecord> {
        const docRef = firestore.collection(EVENTS_COLLECTION).doc();
        await docRef.set(input);
        return { id: docRef.id, ...input };
    }

    async findEventByProviderEventId(providerEventId: string): Promise<NotificationEventRecord | null> {
        const snapshot = await firestore.collection(EVENTS_COLLECTION)
            .where('providerEventId', '==', providerEventId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const docSnap = snapshot.docs[0];
        return this.mapEvent(docSnap.id, docSnap.data());
    }

    async listRecentEventsByEmail(email: string, limit = 25): Promise<NotificationEventRecord[]> {
        const normalizedEmail = email.trim().toLowerCase();
        const snapshot = await firestore.collection(EVENTS_COLLECTION)
            .where('payload.email', '==', normalizedEmail)
            .limit(Math.max(limit, 1))
            .get();

        return snapshot.docs
            .map((docSnap) => this.mapEvent(docSnap.id, docSnap.data()))
            .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
            .slice(0, limit);
    }

    async listRecentEventsByProviderMessageIds(providerMessageIds: string[], limit = 25): Promise<NotificationEventRecord[]> {
        const normalizedIds = Array.from(new Set(providerMessageIds.map((value) => value.trim()).filter(Boolean))).slice(0, 10);
        if (normalizedIds.length === 0) {
            return [];
        }

        const snapshot = await firestore.collection(EVENTS_COLLECTION)
            .where('providerMessageId', 'in', normalizedIds)
            .limit(Math.max(limit, 1))
            .get();

        return snapshot.docs
            .map((docSnap) => this.mapEvent(docSnap.id, docSnap.data()))
            .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
            .slice(0, limit);
    }

    async findDeliveryByProviderMessageId(providerMessageId: string): Promise<NotificationDeliveryRecord | null> {
        const snapshot = await firestore.collection(DELIVERIES_COLLECTION)
            .where('providerMessageId', '==', providerMessageId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const docSnap = snapshot.docs[0];
        return this.mapDelivery(docSnap.id, docSnap.data());
    }

    async findUsersByRoles(roles: string[]): Promise<RecipientProfile[]> {
        const snapshot = await firestore.collection(USERS_COLLECTION)
            .where('role', 'in', roles)
            .get();

        return snapshot.docs.map((docSnap) => {
            const data = asRecord(docSnap.data());
            return {
                uid: docSnap.id,
                email: asString(data.email),
                phone: asString(data.phone) ?? asString(data.phoneNumber),
                displayName: toDisplayName(docSnap.id, data, {}),
                role: asString(data.role),
            } satisfies RecipientProfile;
        });
    }

    async findRecipientByEmail(email: string): Promise<RecipientProfile | null> {
        const snapshot = await firestore.collection(USERS_COLLECTION)
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            const data = asRecord(docSnap.data());
            return {
                uid: docSnap.id,
                email: asString(data.email),
                phone: asString(data.phone) ?? asString(data.phoneNumber),
                displayName: toDisplayName(docSnap.id, data, {}),
                role: asString(data.role),
            };
        }

        const patientSnapshot = await firestore.collection(PATIENTS_COLLECTION)
            .where('email', '==', email)
            .limit(1)
            .get();

        if (patientSnapshot.empty) return null;

        const docSnap = patientSnapshot.docs[0];
        const data = asRecord(docSnap.data());
        return {
            uid: docSnap.id,
            email: asString(data.email),
            phone: asString(data.phone) ?? asString(data.phoneNumber),
            displayName: toDisplayName(docSnap.id, {}, data),
            role: asString(data.role) ?? 'patient',
        };
    }

    private readCategoryPreference(value: unknown): { inApp: boolean; email: boolean } {
        const objectValue = asRecord(value);
        return {
            inApp: objectValue.inApp !== false,
            email: objectValue.email === true,
        };
    }

    private mapMessage(id: string, data: Record<string, unknown>): NotificationMessageRecord {
        return {
            id,
            topicKey: asString(data.topicKey) as NotificationMessageRecord['topicKey'],
            entityId: asString(data.entityId) ?? '',
            dedupeKey: asString(data.dedupeKey) ?? '',
            status: (asString(data.status) as NotificationMessageRecord['status']) ?? 'queued',
            priority: asString(data.priority) as NotificationMessageRecord['priority'],
            category: asString(data.category) as NotificationMessageRecord['category'],
            containsPHI: data.containsPHI === true,
            requiresAudit: data.requiresAudit !== false,
            actorId: asString(data.actorId),
            actorName: asString(data.actorName),
            source: asString(data.source),
            templateData: asRecord(data.templateData),
            metadata: asRecord(data.metadata),
            scheduledFor: asDate(data.scheduledFor),
            createdAt: asDate(data.createdAt) ?? new Date(),
            updatedAt: asDate(data.updatedAt) ?? new Date(),
        };
    }

    private mapDelivery(id: string, data: Record<string, unknown>): NotificationDeliveryRecord {
        return {
            id,
            messageId: asString(data.messageId) ?? '',
            topicKey: asString(data.topicKey) as NotificationDeliveryRecord['topicKey'],
            entityId: asString(data.entityId) ?? '',
            recipientId: asString(data.recipientId) ?? '',
            channel: asString(data.channel) as NotificationDeliveryRecord['channel'],
            dedupeKey: asString(data.dedupeKey) ?? '',
            status: (asString(data.status) as NotificationDeliveryRecord['status']) ?? 'queued',
            attemptCount: typeof data.attemptCount === 'number' ? data.attemptCount : 0,
            provider: asString(data.provider),
            providerMessageId: asString(data.providerMessageId),
            providerResponseCode: asString(data.providerResponseCode),
            taskName: asString(data.taskName),
            projectedNotificationId: asString(data.projectedNotificationId),
            scheduledFor: asDate(data.scheduledFor),
            sentAt: asDate(data.sentAt),
            deliveredAt: asDate(data.deliveredAt),
            failedAt: asDate(data.failedAt),
            lastError: asString(data.lastError),
            metadata: asRecord(data.metadata),
            createdAt: asDate(data.createdAt) ?? new Date(),
            updatedAt: asDate(data.updatedAt) ?? new Date(),
        };
    }

    private mapEvent(id: string, data: Record<string, unknown>): NotificationEventRecord {
        return {
            id,
            deliveryId: asString(data.deliveryId),
            provider: asString(data.provider) ?? '',
            eventType: asString(data.eventType) ?? '',
            providerEventId: asString(data.providerEventId) ?? '',
            providerMessageId: asString(data.providerMessageId),
            payload: asRecord(data.payload),
            occurredAt: asDate(data.occurredAt) ?? new Date(),
            processedAt: asDate(data.processedAt) ?? new Date(),
        };
    }
}
