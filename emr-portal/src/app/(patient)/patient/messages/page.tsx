import type { Metadata } from 'next';
import MessagesPageClient from './MessagesPageClient';

export const metadata: Metadata = {
    title: 'Patient Messages',
    description: 'Secure patient messaging with providers and care teams.'
};

export default function PatientMessagesPage() {
    return <MessagesPageClient />;
}
