import type { Metadata } from 'next';
import NotificationsPageClient from './NotificationsPageClient';

export const metadata: Metadata = {
    title: 'Provider Notifications',
    description: 'Review and manage provider notifications in Patriotic EMR.'
};

export default function ProviderNotificationsPage() {
    return <NotificationsPageClient />;
}
