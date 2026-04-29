import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface TelehealthSession {
    provider: 'DOXY' | 'ZOOM' | 'GOOGLE_MEET';
    joinLink: string;
    platformSessionId?: string;
}

export interface VideoProvider {
    createSession(appointmentId: number, providerId: number, patientId: number): Promise<TelehealthSession>;
}

/* === ADAPTERS === */

class DoxyDefaultProvider implements VideoProvider {
    async createSession(appointmentId: number, providerId: number): Promise<TelehealthSession> {
        // Fetch provider's static Doxy link
        const providerRes = await db.query('SELECT doxy_me_link FROM providers WHERE user_id = $1', [providerId]);
        const staticLink = providerRes.rows[0]?.doxy_me_link;

        if (!staticLink) {
            throw new Error('Provider does not have a Doxy.me link configured.');
        }

        // In a real implementation, we might generate a unique token or use the waiting room directly
        return {
            provider: 'DOXY',
            joinLink: staticLink, // e.g. https://doxy.me/DrSmith
        };
    }
}

class ZoomIntegrationProvider implements VideoProvider {
    async createSession(appointmentId: number, providerId: number): Promise<TelehealthSession> {
        // 1. Get OAuth token for provider
        // 2. Call Zoom API to create scheduled meeting
        // 3. Store Join URL

        // Mock implementation
        const zoomMeetingId = `zoom-${Date.now()}`;
        return {
            provider: 'ZOOM',
            joinLink: `https://zoom.us/j/${zoomMeetingId}`,
            platformSessionId: zoomMeetingId
        };
    }
}

class GoogleMeetProvider implements VideoProvider {
    async createSession(appointmentId: number, providerId: number): Promise<TelehealthSession> {
        // 1. Get Google Calendar integration token
        // 2. Create Event with ConferenceData
        // 3. Return Meet Link
        const meetCode = `abc-defg-hij`;
        return {
            provider: 'GOOGLE_MEET',
            joinLink: `https://meet.google.com/${meetCode}`,
            platformSessionId: meetCode
        }
    }
}

/* === FACTORY / RESOLVER === */

export class TelehealthService {
    private doxy = new DoxyDefaultProvider();
    private zoom = new ZoomIntegrationProvider();
    private google = new GoogleMeetProvider();

    async generateLink(appointmentId: number): Promise<TelehealthSession> {
        // 1. Fetch Appointment Type & Provider
        const appt = await db.query(`
            SELECT a.*, at.video_provider_override, p.user_id as provider_uid 
            FROM appointments a 
            JOIN appointment_types at ON a.appointment_type_id = at.id
            JOIN providers p ON a.provider_id = p.user_id
            WHERE a.id = $1
        `, [appointmentId]);

        const appointment = appt.rows[0];
        if (!appointment) throw new Error('Appointment Not Found');

        // 2. Resolve Provider: Override > Integration Default > Fallback
        let selectedProvider: VideoProvider = this.doxy;

        if (appointment.video_provider_override === 'ZOOM') {
            // Check if integration connected?
            selectedProvider = this.zoom;
        } else if (appointment.video_provider_override === 'GOOGLE_MEET') {
            selectedProvider = this.google;
        }

        // 3. Create Session
        const session = await selectedProvider.createSession(appointmentId, appointment.provider_uid, appointment.patient_id);

        // 4. Log Session to DB
        await db.query(`
            INSERT INTO telehealth_sessions (appointment_id, provider_id, video_provider_used, platform_session_id)
            VALUES ($1, $2, $3, $4)
        `, [appointmentId, appointment.provider_uid, session.provider, session.platformSessionId]);

        return session;
    }
}
