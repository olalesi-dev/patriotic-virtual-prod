import type { Metadata } from 'next';
import AppointmentsPageClient from './AppointmentsPageClient';

export const metadata: Metadata = {
    title: 'Patient Appointments',
    description: 'Book, reschedule, and manage patient appointments.'
};

export default function PatientAppointmentsPage() {
    return <AppointmentsPageClient />;
}
