import { Suspense } from 'react';
import type { Metadata } from 'next';
import '@/features/landing/landing.css';
import LandingEmbed from '@/features/landing/components/LandingEmbed';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = {
    ...buildPageMetadata(
        'Healthcare That Comes To You',
        'Board-certified telehealth, radiology education, AI imaging, and secure online consults through Patriotic Virtual Telehealth.'
    ),
};

export default function HomePage() {
    return (
        <Suspense fallback={null}>
            <LandingEmbed />
        </Suspense>
    );
}
