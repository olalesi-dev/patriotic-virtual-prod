export type ProductCategory = 'Survival Pack' | 'Supplement' | 'Apparel' | 'Device' | 'Digital Product';
export type ProductStatus = 'Active' | 'Draft' | 'Archived';
export type FulfillmentStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type DiscountType = 'percentage' | 'fixed';

export interface ShopProduct {
    id?: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    category: ProductCategory;
    sku: string;
    price: number;
    compareAtPrice?: number | null;
    inventoryLevel: number;
    lowStockThreshold: number;
    status: ProductStatus;
    images: string[];
    weight?: string;
    dimensions?: string;
    stripeLink?: string;
    iframeUrl?: string;
    tags: string[];
    createdAt?: any;
    updatedAt?: any;
}

export interface ShopOrderItem {
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    image?: string;
}

export interface ShopOrder {
    id?: string;
    orderNumber: string;
    patientId: string;
    patientName: string;
    items: ShopOrderItem[];
    subtotal: number;
    discountUsed?: string | null;
    discountAmount?: number;
    total: number;
    paymentStatus: string;
    fulfillmentStatus: FulfillmentStatus;
    trackingNumber?: string | null;
    carrier?: string | null;
    internalNote?: string | null;
    createdAt?: any;
    updatedAt?: any;
}

export interface ShopDiscountCode {
    id?: string;
    code: string;
    type: DiscountType;
    value: number;
    minOrderValue: number;
    usageLimitPerCustomer: number;
    usageLimitTotal: number;
    currentUsage: number;
    scope: 'all' | 'category' | 'product';
    applicableCategories?: ProductCategory[];
    applicableProducts?: string[];
    startDate: string;
    endDate: string;
    createdAt?: any;
}
