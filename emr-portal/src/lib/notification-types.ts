export type AppNotificationType =
    | 'team_invite'
    | 'team_invite_response'
    | 'appointment_booked'
    | 'appointment_rescheduled'
    | 'appointment_cancelled'
    | 'dosespot_rx_counts'
    | 'dosespot_rx_error'
    | 'dosespot_medication_status'
    | 'dosespot_prior_auth'
    | 'dosespot_pharmacy_transfer'
    | 'dosespot_clinician_security'
    | 'dosespot_sync_update';

export type NotificationPriority = 'low' | 'medium' | 'high' | null;
export type NotificationSource = 'app' | 'dosespot' | null;

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
    priority: NotificationPriority;
    source: NotificationSource;
    metadata: Record<string, unknown>;
}
