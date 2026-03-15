"use client";

import React, { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ShoppingBag, Loader2, ArrowLeft, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

export function CheckoutClient() {
    const { items, getCartTotal, getCartCount, clearCart } = useCart();
    const profile = useUserProfile();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (items.length === 0) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-32 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 border-4 border-slate-50 dark:border-slate-900 shadow-xl">
                    <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Your Cart is Empty</h2>
                    <p className="text-slate-500 font-medium">Looks like you haven't added any products to your cart yet.</p>
                </div>
                <Link href="/patient/shop" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Browse Shop
                </Link>
            </div>
        );
    }

    const handleCheckout = async () => {
        if (!auth.currentUser) {
            toast.error('You must be logged in to checkout');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/v1/shop/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    patientId: auth.currentUser.uid,
                    patientName: profile.displayName || auth.currentUser.email,
                    originUrl: window.location.origin,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to initialize checkout');
            }

            const { id, url } = await response.json();
            
            // Redirect to Stripe Checkout
            if (url) {
                window.location.href = url;
            } else {
                toast.error('Invalid checkout session received from server');
                setLoading(false);
            }
        } catch (e: any) {
            console.error('Checkout error:', e);
            toast.error(e.message || 'An error occurred during checkout');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="mb-8">
                <Link href="/patient/shop" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors group mb-4">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Shop
                </Link>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-indigo-500" /> Secure Checkout
                </h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ITEMS LIST */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Order Summary ({getCartCount()} items)</h2>
                    
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                        {items.map((item) => (
                            <div key={item.product.id} className="p-6 flex gap-6 items-center">
                                <div className="w-24 h-24 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                                    {item.product.images?.[0] ? (
                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.product.category}</div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-2">{item.product.name}</h3>
                                    <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                                        <span>Qty: <span className="text-slate-900 dark:text-white font-bold">{item.quantity}</span></span>
                                        <span>x</span>
                                        <span className="text-slate-900 dark:text-white font-bold">${item.product.price.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">${(item.quantity * item.product.price).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* TOTALS & ACTIONS */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-6 sm:p-8 sticky top-28">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">Payment Details</h2>
                        
                        <div className="space-y-4 mb-8 text-sm text-slate-600 dark:text-slate-400 font-medium">
                            <div className="flex justify-between items-center">
                                <span>Subtotal</span>
                                <span>${getCartTotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Shipping</span>
                                <span className="text-emerald-500 font-bold uppercase tracking-wider text-xs">Free</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Taxes</span>
                                <span>Calculated next step</span>
                            </div>
                        </div>
                        
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mb-8 flex justify-between items-end">
                            <span className="font-bold text-slate-900 dark:text-white">Total</span>
                            <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">${getCartTotal().toFixed(2)}</span>
                        </div>

                        <button 
                            onClick={handleCheckout}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl transition-transform active:scale-[0.98] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none disabled:active:scale-100"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Preparing Checkout...</>
                            ) : (
                                <>Pay with Stripe <ArrowRight className="w-5 h-5 opacity-70" /></>
                            )}
                        </button>
                        
                        <div className="mt-6 flex items-start gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Guaranteed safe & secure checkout powered by <span className="font-bold text-slate-700 dark:text-slate-300">Stripe</span>. Your payment details are fully encrypted.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
