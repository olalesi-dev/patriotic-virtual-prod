import { Metadata } from 'next';
import CrmAssistantClient from './CrmAssistantClient';

export const metadata: Metadata = {
    title: 'CRM AI Assistant | Patriotic EMR',
    description: 'CRM AI Assistant powered by Gemini',
};

export default function AssistantPage() {
    return <CrmAssistantClient />;
}
