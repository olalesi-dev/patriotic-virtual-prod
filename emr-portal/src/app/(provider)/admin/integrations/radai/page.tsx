import { RadAIClient } from './RadAIClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Rad AI Settings',
    'AI-assisted radiology reporting configuration.',
    { noIndex: true }
);

export default function RadAIPage() {
    return <RadAIClient />;
}
