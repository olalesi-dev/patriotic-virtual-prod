export const PROVIDER_APPOINTMENT_CREATED_EVENT = 'emr:provider-appointment-created';

export interface ProviderDashboardAppointmentEventPayload {
    id: string;
    patient: string;
    displayTime: string;
    type: string;
    statusKey: 'upcoming' | 'checked_in' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'waitlist';
    statusLabel: string;
    startAt: string | null;
    notes: string | null;
    meetingUrl: string | null;
}

export type ProviderAppointmentCreatedEventDetail =
    | {
        mode: 'optimistic';
        optimisticId: string;
        appointment: ProviderDashboardAppointmentEventPayload;
    }
    | {
        mode: 'committed';
        optimisticId: string;
        appointment: ProviderDashboardAppointmentEventPayload;
    }
    | {
        mode: 'rollback';
        optimisticId: string;
    };
