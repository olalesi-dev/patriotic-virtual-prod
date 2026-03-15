"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { CheckCircle2, ShoppingBag, Loader2, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function CheckoutSuccessClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { clearCart } = useCart();
    
    const session_id = searchParams.get('session_id');
    const order_id = searchParams.get('order_id');

    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(null);

    useEffect(() => {
        if (!session_id || !order_id) {
            router.replace('/patient/shop');
            return;
        }

        const confirmOrder = async () => {
            try {
                const response = await fetch('/api/v1/shop/checkout/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id, order_id }),
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to confirm order payment');
                }

                if (data.order) {
                    setOrderData(data.order);
                } else if (data.alreadyProcessed) {
                    toast.success('Your order was already processed.');
                    // Don't show full info without fetching again, but for now just show basic success
                    setOrderData({ orderNumber: 'Confirmed' });
                }

                clearCart();
            } catch (e: any) {
                console.error("Order confirmation error:", e);
                toast.error(e.message || "There was an issue processing your order. Please contact support.");
            } finally {
                setLoading(false);
            }
        };

        confirmOrder();
    }, [session_id, order_id, router, clearCart]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                <p className="font-bold text-slate-500">Confirming your payment and finalizing order...</p>
            </div>
        );
    }

    if (!orderData) {
        return (
            <div className="max-w-md mx-auto py-32 text-center space-y-4">
                <ShieldCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto" />
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Order Unconfirmed</h2>
                <p className="text-slate-500 pb-4">We could not confirm your order. If you were charged, your order is safe. Please contact support.</p>
                <Link href="/patient/shop" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-colors">
                    Back to Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-500 px-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden flex flex-col items-center text-center">
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-900/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center border-4 border-emerald-50 dark:border-emerald-900 shadow-xl mb-6 relative z-10 animate-bounce">
                    <CheckCircle2 className="w-12 h-12" />
                </div>

                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2 relative z-10">
                    Payment Successful!
                </h1>
                
                <p className="text-lg text-slate-500 font-medium mb-8 max-w-lg relative z-10">
                    Thank you for your purchase. We've sent a confirmation notification to your portal inbox.
                </p>

                <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 mb-8 border border-slate-100 dark:border-slate-800/50 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Order No.</span>
                            <span className="font-bold text-slate-900 dark:text-white text-lg">#{orderData.orderNumber}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</span>
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                                Processing
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Paid</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">${orderData.total?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="text-right flex items-center justify-end">
                            <button className="text-sm font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors">
                                <Download className="w-4 h-4" /> Receipt
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center relative z-10">
                    <Link href="/patient" className="px-8 py-4 rounded-2xl font-bold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
                        Return to Dashboard
                    </Link>
                    <Link href="/patient/shop" className="px-8 py-4 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2">
                        <ShoppingBag className="w-5 h-5" /> Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
}
