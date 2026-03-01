export type AppNotificationType =
    | 'team_invite'
    | 'team_invite_response'
    | 'appointment_booked'
    | 'appointment_rescheduled'
    | 'appointment_cancelled'
    | 'team_patient_assigned';

export type NotificationActionStatus = 'pending' | 'accepted' | 'rejected' | null;

export interface AppNotification {
    id: string;
    recipientId: string;
    actorId: string | null;
    actorName: string | null;
    type: AppNotificationType;
    title: string;
    body: string;
    href: string | null;
    read: boolean;
    createdAt: string;
    updatedAt: string;
    actionStatus: NotificationActionStatus;
    metadata: Record<string, unknown>;
}
