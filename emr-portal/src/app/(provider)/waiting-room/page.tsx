import PageClient from './PageClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Waiting Room | Patriotic Virtual Telehealth',
    description: 'Telehealth Waiting Room and AI Scribe',
};

export default function WaitingRoomPage() {
    return <PageClient />;
}
