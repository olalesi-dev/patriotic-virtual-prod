"use client";

import React, { useEffect, useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { ShoppingCart, X, Plus, Minus, CreditCard, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CartDrawer() {
    const cart = useCart();
    const router = useRouter();
    const [isHydrated, setIsHydrated] = useState(false);
    
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    if (!isHydrated) return null;

    return (
        <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${cart.isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => cart.toggleCart(false)}></div>
            <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${cart.isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="w-6 h-6 text-indigo-500" />
                        Your Cart
                        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded-full text-xs ml-2">
                            {cart.getCartCount()} items
                        </span>
                    </h2>
                    <button onClick={() => cart.toggleCart(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {cart.items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <ShoppingCart className="w-16 h-16 text-slate-400" />
                            <p className="text-lg font-bold text-slate-500">Your cart is empty.</p>
                            <button onClick={() => { cart.toggleCart(false); router.push('/patient/shop'); }} className="mt-4 text-indigo-500 font-bold hover:underline">
                                Browse Shop &rarr;
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cart.items.map((item) => (
                                <div key={item.product.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 relative group">
                                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                                        {item.product.images?.[0] ? (
                                            <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-2">No Image</div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight pr-8">{item.product.name}</h4>
                                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1">${item.product.price.toFixed(2)}</p>
                                        
                                        <div className="mt-auto pt-3 flex items-center gap-3">
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                                                <button onClick={() => cart.updateQuantity(item.product.id!, item.quantity - 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" disabled={item.quantity <= 1}>
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => cart.updateQuantity(item.product.id!, item.quantity + 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" disabled={item.quantity >= item.product.inventoryLevel}>
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <button onClick={() => cart.removeItem(item.product.id!)} className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                    {item.quantity >= item.product.inventoryLevel && (
                                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                            Max Stock
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cart.items.length > 0 && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-bold">
                            <span>Subtotal</span>
                            <span className="text-xl text-slate-900 dark:text-white font-black">${cart.getCartTotal().toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Shipping, taxes, and discounts calculated at checkout.</p>
                        <button 
                            onClick={() => {
                                cart.toggleCart(false);
                                router.push('/patient/shop/checkout');
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-indigo-600/30"
                        >
                            <CreditCard className="w-5 h-5" /> Proceed to Checkout <ChevronRight className="w-5 h-5 opacity-70" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
