import type { Metadata } from 'next';
import NotificationsPageClient from '@/app/(provider)/notifications/NotificationsPageClient';

export const metadata: Metadata = {
    title: 'Patient Notifications',
    description: 'Review appointment and care team updates.'
};

export default function PatientNotificationsPage() {
    return <NotificationsPageClient />;
}
