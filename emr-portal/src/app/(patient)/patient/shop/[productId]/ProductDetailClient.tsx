"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ShopProduct } from '@/lib/shop-types';
import { useCart } from '@/hooks/useCart';
import { Loader2, ArrowLeft, Heart, Share2, CheckCircle2, ShieldCheck, Truck, Plus, Minus, ShoppingBag, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function ProductDetailClient({ productId }: { productId: string }) {
    const [product, setProduct] = useState<ShopProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showIframeModal, setShowIframeModal] = useState(false);
    const { addItem } = useCart();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'shop-products', productId));
                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() } as ShopProduct);
                } else {
                    toast.error('Product not found or unavailable');
                }
            } catch (e: any) {
                toast.error('Failed to load product details: ' + e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 opacity-50 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="font-bold text-slate-500">Loading product data...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <ShieldCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Product Not Found</h3>
                <p className="text-slate-500 mb-8">This item may have been removed or is no longer available.</p>
                <Link href="/patient/shop" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/30 transition-colors">
                    Back to Shop
                </Link>
            </div>
        );
    }

    const maxQty = product.inventoryLevel || 0;

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 space-y-8">
            <Link href="/patient/shop" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Catalog
            </Link>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden shadow-slate-200/50 dark:shadow-slate-900/50 flex flex-col lg:flex-row">
                {/* GALLERY */}
                <div className="lg:w-1/2 p-4 md:p-8 flex flex-col gap-4">
                    <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden relative">
                        {product.images && product.images[activeImageIndex] ? (
                            <img src={product.images[activeImageIndex]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <ShoppingBag className="w-16 h-16 text-slate-300 dark:text-slate-700" />
                        )}
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                                Sale
                            </span>
                        )}
                    </div>
                    {product.images && product.images.length > 1 && (
                        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                            {product.images.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveImageIndex(index)}
                                    className={`w-20 h-20 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden border-2 transition-all ${activeImageIndex === index ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* DETAILS */}
                <div className="lg:w-1/2 p-6 md:p-12 lg:pl-0 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <div className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">{product.category}</div>
                            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight">{product.name}</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">{product.shortDescription}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 text-slate-400 flex items-center justify-center transition-colors">
                                <Heart className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 flex items-center justify-center transition-colors">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="text-xl text-slate-400 font-bold line-through">
                                ${product.compareAtPrice.toFixed(2)}
                            </span>
                        )}
                        <span className="text-4xl font-black text-slate-900 dark:text-white">
                            ${product.price.toFixed(2)}
                        </span>
                        
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4" /> 
                            {maxQty > 0 ? 'In Stock' : <span className="text-red-600">Out of Stock</span>}
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-8"></div>

                    {product.stripeLink ? (
                        <div className="mb-8">
                            <a 
                                href={product.stripeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-transform active:scale-[0.98] shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                Buy Now on Stripe
                            </a>
                        </div>
                    ) : product.iframeUrl ? (
                        <div className="mb-8">
                            <button 
                                onClick={() => setShowIframeModal(true)}
                                className="w-full flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-transform active:scale-[0.98] shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                Purchase Partner Service
                            </button>
                        </div>
                    ) : (
                        <div className="mb-8 flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 h-14">
                                <button 
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1 || maxQty === 0}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm disabled:opacity-30"
                                >
                                    <Minus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                </button>
                                <span className="w-12 text-center font-black text-xl text-slate-900 dark:text-white">{quantity}</span>
                                <button 
                                    onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                                    disabled={quantity >= maxQty || maxQty === 0}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shadow-sm disabled:opacity-30"
                                >
                                    <Plus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => {
                                    addItem(product, quantity);
                                    toast.success(`Added ${quantity} to cart!`);
                                }}
                                disabled={maxQty === 0}
                                className="w-full flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-transform active:scale-[0.98] shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                            >
                                <ShoppingBag className="w-5 h-5" />
                                {maxQty === 0 ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30">
                            <Truck className="w-6 h-6 text-indigo-500 shrink-0" />
                            <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">Fast Setup & Ship</div>
                                <div className="text-[10px] text-slate-500">Processed within 24h</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                            <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">Quality Guarantee</div>
                                <div className="text-[10px] text-slate-500">Clinician verified source</div>
                            </div>
                        </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="font-black text-slate-800 dark:text-white mb-4 uppercase tracking-widest text-sm">Product Overview</h3>
                        <div className="prose prose-slate dark:prose-invert prose-sm max-w-none text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                            {product.longDescription || 'No detailed description available.'}
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl text-sm border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                <span className="font-bold text-slate-500">SKU</span>
                                <span className="text-slate-900 dark:text-white font-medium">{product.sku}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                <span className="font-bold text-slate-500">Category</span>
                                <span className="text-slate-900 dark:text-white font-medium">{product.category}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* IFRAME MODAL */}
            {showIframeModal && product.iframeUrl && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="font-bold text-slate-900 dark:text-white">Partner Secure Checkout</h2>
                            <button 
                                onClick={() => setShowIframeModal(false)}
                                className="px-4 py-2 font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                            >
                                Close & Return to Shop
                            </button>
                        </div>
                        <div className="flex-1 w-full relative bg-slate-100 dark:bg-black">
                            {/* Loading state behind iframe */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-50" />
                            </div>
                            <iframe 
                                src={product.iframeUrl} 
                                className="w-full h-full relative z-10 border-0" 
                                title="Secure Checkout"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
