import { ShopClient } from './ShopClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Wellness Shop | Patriotic Telehealth',
    'Browse our curated wellness products, supplements, and survival packs.',
);

export default function ShopPage() {
    return <ShopClient />;
}
