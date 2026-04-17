import type { Metadata } from 'next';
import PageClient from '@/app/(provider)/orders/erx/readiness/PageClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata(
    'DoseSpot Readiness',
    'Track clinician agreements, IDP, OTP, security, and DoseSpot readiness state.',
    { noIndex: true }
);

export default function Page() {
    return <PageClient />;
}
