import './globals.css';
import 'react-day-picker/dist/style.css';
import type { Metadata } from 'next';
import { RootLayoutClient } from '@/components/providers/RootLayoutClient';
import { CookieBanner } from '@/components/common/CookieBanner';
import { buildAppMetadata } from '@/lib/metadata';
import GoogleAnalytics from '@/components/common/GoogleAnalytics';

export const metadata: Metadata = buildAppMetadata();

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
            </head>
            <body className="font-sans bg-slate-50 dark:bg-slate-900/50 text-navy antialiased min-h-screen">
                <GoogleAnalytics />
                <RootLayoutClient>{children}</RootLayoutClient>
                <CookieBanner />
            </body>
        </html>
    );
}
