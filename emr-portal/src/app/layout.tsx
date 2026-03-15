import './globals.css';
import 'react-day-picker/dist/style.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RootLayoutClient } from '@/components/providers/RootLayoutClient';
import { buildAppMetadata } from '@/lib/metadata';

const inter = Inter({ subsets: ['latin'] });

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
            <body className={`${inter.className} bg-slate-50 dark:bg-slate-900/50 text-navy antialiased min-h-screen`}>
                <RootLayoutClient>{children}</RootLayoutClient>
            </body>
        </html>
    );
}
