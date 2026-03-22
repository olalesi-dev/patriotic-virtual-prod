import { buildPageMetadata } from '@/lib/metadata';
import CalendarClient from './CalendarClient';

export const metadata = buildPageMetadata(
    'Compliance Calendar',
    'View all document expiration dates on a calendar.'
);

export default function ComplianceCalendarPage() {
    return <CalendarClient />;
}
