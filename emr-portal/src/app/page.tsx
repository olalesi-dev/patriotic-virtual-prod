import type { Metadata } from 'next';
import '@/features/landing/landing.css';
import LandingEmbed from '@/features/landing/components/LandingEmbed';

export const metadata: Metadata = {
    title: 'Patriotic Virtual Telehealth | Healthcare That Comes To You',
    description:
        'Board-certified telehealth, radiology education, AI imaging, and secure online consults through Patriotic Virtual Telehealth.',
};

export default function HomePage() {
    return <LandingEmbed />;
}
