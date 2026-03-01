import type { Metadata } from 'next';
import TeamPageClient from './TeamPageClient';

export const metadata: Metadata = {
    title: 'Provider Team Workspace',
    description: 'Manage teams, provider invitations, and patient assignments.'
};

export default function ProviderTeamPage() {
    return <TeamPageClient />;
}
