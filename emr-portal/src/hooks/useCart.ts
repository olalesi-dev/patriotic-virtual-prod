import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ShopProduct } from '@/lib/shop-types';

export interface CartItem {
    product: ShopProduct;
    quantity: number;
}

interface CartState {
    items: CartItem[];
    isOpen: boolean;
    addItem: (product: ShopProduct, quantity?: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    toggleCart: (open?: boolean) => void;
    getCartTotal: () => number;
    getCartCount: () => number;
}

export const useCart = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            
            addItem: (product, quantity = 1) => {
                set((state) => {
                    const existingItem = state.items.find((item) => item.product.id === product.id);
                    if (existingItem) {
                        return {
                            items: state.items.map((item) =>
                                item.product.id === product.id
                                    ? { ...item, quantity: item.quantity + quantity }
                                    : item
                            ),
                        };
                    }
                    return { items: [...state.items, { product, quantity }] };
                });
                get().toggleCart(true);
            },
            
            removeItem: (productId) => {
                set((state) => ({
                    items: state.items.filter((item) => item.product.id !== productId),
                }));
            },
            
            updateQuantity: (productId, quantity) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
                    ),
                }));
            },
            
            clearCart: () => set({ items: [] }),
            
            toggleCart: (open) => set((state) => ({ isOpen: open !== undefined ? open : !state.isOpen })),
            
            getCartTotal: () => {
                return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
            },
            
            getCartCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0);
            },
        }),
        {
            name: 'shop-cart-storage',
        }
    )
);
