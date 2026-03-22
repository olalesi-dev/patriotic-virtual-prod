import type { Metadata } from 'next';

const APP_NAME = 'Patriotic Virtual Telehealth';

function resolveMetadataBase() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    try {
        return new URL(appUrl);
    } catch {
        return new URL('http://localhost:3001');
    }
}

export function buildAppMetadata(): Metadata {
    return {
        metadataBase: resolveMetadataBase(),
        applicationName: APP_NAME,
        title: {
            default: APP_NAME,
            template: `%s | ${APP_NAME}`
        },
        description: 'Secure telehealth, patient engagement, and provider workflow platform for Patriotic Virtual Telehealth.',
        openGraph: {
            type: 'website',
            siteName: APP_NAME,
            title: APP_NAME,
            description: 'Secure telehealth, patient engagement, and provider workflow platform for Patriotic Virtual Telehealth.'
        },
        twitter: {
            card: 'summary_large_image',
            title: APP_NAME,
            description: 'Secure telehealth, patient engagement, and provider workflow platform for Patriotic Virtual Telehealth.'
        }
    };
}

export function buildPageMetadata(
    title: string,
    description: string,
    options?: {
        noIndex?: boolean;
    }
): Metadata {
    const noIndex = options?.noIndex ?? false;

    return {
        title,
        description,
        openGraph: {
            title,
            description
        },
        twitter: {
            title,
            description
        },
        robots: noIndex
            ? {
                index: false,
                follow: false
            }
            : undefined
    };
}
