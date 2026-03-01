import type { Metadata } from 'next';
import InboxPageClient from './InboxPageClient';

export const metadata: Metadata = {
    title: 'Provider Inbox',
    description: 'Secure provider messaging inbox for patient conversations.'
};

export default function ProviderInboxPage() {
    return <InboxPageClient />;
}
