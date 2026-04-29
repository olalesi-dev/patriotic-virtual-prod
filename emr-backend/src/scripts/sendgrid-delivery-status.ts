import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { NotificationRepository } from '../modules/notifications/repository';

dotenv.config({ path: resolve(process.cwd(), '.env') });

function usage(): never {
    console.error('Usage: npm run test:sendgrid-status -- <recipient-email> [--limit=25]');
    process.exit(1);
}

const rawArgs = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);
const email = rawArgs.find((value) => !value.startsWith('--'));
if (!email) {
    usage();
}

const limitArg = rawArgs.find((value) => value.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '25', 10) : 25;

async function main(): Promise<void> {
    const repository = new NotificationRepository();
    const [recipient, events] = await Promise.all([
        repository.findRecipientByEmail(email as string),
        repository.listRecentEventsByEmail(email as string, limit),
    ]);

    const deliveries = recipient
        ? await repository.listRecentDeliveriesByRecipientId(recipient.uid, limit)
        : [];

    console.log(JSON.stringify({
        email,
        recipient: recipient ? {
            uid: recipient.uid,
            email: recipient.email,
            displayName: recipient.displayName,
            role: recipient.role,
        } : null,
        deliveries: deliveries.map((delivery) => ({
            id: delivery.id,
            topicKey: delivery.topicKey,
            channel: delivery.channel,
            status: delivery.status,
            providerMessageId: delivery.providerMessageId,
            providerResponseCode: delivery.providerResponseCode,
            sentAt: delivery.sentAt?.toISOString() ?? null,
            deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
            failedAt: delivery.failedAt?.toISOString() ?? null,
            lastError: delivery.lastError,
        })),
        events: events.map((event) => ({
            id: event.id,
            deliveryId: event.deliveryId,
            eventType: event.eventType,
            providerMessageId: event.providerMessageId,
            occurredAt: event.occurredAt.toISOString(),
            processedAt: event.processedAt.toISOString(),
            email: typeof event.payload.email === 'string' ? event.payload.email : null,
            reason: typeof event.payload.reason === 'string' ? event.payload.reason : null,
            response: typeof event.payload.response === 'string' ? event.payload.response : null,
        })),
    }, null, 2));
}

void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
