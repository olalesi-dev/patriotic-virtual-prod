import { PageClient } from './PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata('Global Systems Settings', 'Manage global platform configurations.');

export default function GlobalSettingsPage() {
    return <PageClient />;
}
