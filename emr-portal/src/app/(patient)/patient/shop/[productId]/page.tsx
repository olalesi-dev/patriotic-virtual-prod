import { ProductDetailClient } from './ProductDetailClient';
import { buildPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = buildPageMetadata(
    'Product Details | Shop',
    'View detailed product information and add to your cart.',
);

export default function ProductDetailPage({ params }: { params: { productId: string } }) {
    return <ProductDetailClient productId={params.productId} />;
}
