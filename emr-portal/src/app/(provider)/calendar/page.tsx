import type { Metadata } from 'next';
import CalendarPageClient from './CalendarPageClient';

export const metadata: Metadata = {
    title: 'Provider Calendar',
    description: 'Schedule, manage, and update provider appointments.'
};

export default function ProviderCalendarPage() {
    return <CalendarPageClient />;
}
