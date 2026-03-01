import type { Metadata } from 'next';
import RootDispatcherClient from './RootDispatcherClient';

export const metadata: Metadata = {
    title: 'Patriotic EMR',
    description: 'Secure care dashboard routing for Patriotic EMR.'
};

export default function RootPage() {
    return <RootDispatcherClient />;
}
