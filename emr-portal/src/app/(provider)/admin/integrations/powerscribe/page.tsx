import { PowerScribeClient } from './PowerScribeClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'PowerScribe 360',
    'Radiology dictation and transcription configuration.',
    { noIndex: true }
);

export default function PowerScribePage() {
    return <PowerScribeClient />;
}
