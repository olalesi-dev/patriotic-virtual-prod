import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'GLP-1 Weight Loss Program | Patriotic Telehealth',
    description: 'Prescription GLP-1 weight management for sustainable weight loss. Semaglutide and Tirzepatide from licensed providers, delivered to your door. Starting from $149/mo.',
    keywords: 'GLP-1, weight loss, semaglutide, tirzepatide, Wegovy, Zepbound, telehealth, online prescription',
    openGraph: {
        title: 'Lose Weight with GLP-1 | Patriotic Telehealth',
        description: 'Personalized GLP-1 prescriptions. Licensed providers. Starting from $149/mo.',
        type: 'website',
    },
};

export default function WeightLossLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <link
                rel="preconnect"
                href="https://fonts.googleapis.com"
            />
            <link
                rel="preconnect"
                href="https://fonts.gstatic.com"
                crossOrigin="anonymous"
            />
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap"
                rel="stylesheet"
            />
            <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {children}
            </div>
        </>
    );
}
