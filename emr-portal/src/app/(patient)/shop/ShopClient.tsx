"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ShoppingBag, Search, Filter, Loader2, ArrowRight, Star, Heart, Plus } from 'lucide-react';
import { ShopProduct } from '@/lib/shop-types';
import { useCart } from '@/hooks/useCart';
import Link from 'next/link';

export function ShopClient() {
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const { addItem } = useCart();

    useEffect(() => {
        const q = query(
            collection(db, 'shop-products'),
            where('status', '==', 'Active'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, snap => {
            const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopProduct));
            // Apply client-side sorting/filtering if needed since we can't complex sort without compound indexes sometimes
            setProducts(loaded);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const filteredProducts = products.filter(p => {
        if (activeCategory !== 'All' && p.category !== activeCategory) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const categories = ['All', 'Survival Pack', 'Supplement', 'Apparel', 'Device', 'Digital Product'];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* HERO BANNER */}
            <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-800">
                <div className="absolute inset-0 z-0">
                    <img src="https://images.unsplash.com/photo-1542841791-1925b02a2bf8?q=80&w=2000&auto=format&fit=crop" alt="Shop Hero" className="w-full h-full object-cover opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
                </div>
                <div className="relative z-10 max-w-2xl space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-widest border border-indigo-500/30">
                        Patriotic Telehealth Store
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                        Premium Quality <span className="text-indigo-400">Survival & Health</span> Essentials
                    </h1>
                    <p className="text-lg text-slate-300 font-medium max-w-xl">
                        Explore our curated selection of verified supplements, survival medical packs, and specialty wellness products.
                    </p>
                </div>
            </div>

            {/* FILTER & SEARCH */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-20 z-20">
                <div className="w-full md:w-1/3 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-sm font-medium dark:text-white"
                    />
                </div>
                <div className="w-full md:w-auto overflow-x-auto custom-scrollbar pb-2 md:pb-0">
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* PRODUCT GRID */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="font-bold text-slate-500">Loading catalog...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50/50 dark:bg-slate-800/20">
                    <ShoppingBag className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-2" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No products found</h3>
                    <p className="text-slate-500 max-w-md">We couldn't find any products matching your current filters. Try selecting a different category or clearing your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="group bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
                            <Link href={`/patient/shop/${product.id}`} className="relative h-64 bg-slate-100 dark:bg-slate-900 overflow-hidden block">
                                {product.images && product.images[0] ? (
                                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                                        <ShoppingBag className="w-8 h-8" />
                                        <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
                                    </div>
                                )}
                                
                                {/* Badges */}
                                <div className="absolute top-4 left-4 flex flex-col gap-2 relative z-10">
                                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                                        <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider">
                                            Sale
                                        </span>
                                    )}
                                    {product.inventoryLevel > 0 && product.inventoryLevel <= (product.lowStockThreshold || 5) && (
                                        <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider">
                                            Only {product.inventoryLevel} left
                                        </span>
                                    )}
                                </div>
                            </Link>

                            <div className="p-6 flex flex-col flex-1">
                                <Link href={`/patient/shop/${product.id}`} className="flex-1 group-hover:text-indigo-600 transition-colors">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{product.category}</div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">{product.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{product.shortDescription}</p>
                                </Link>

                                <div className="flex items-end justify-between mt-auto">
                                    <div>
                                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                                            <div className="text-xs text-slate-400 font-bold line-through mb-0.5">${product.compareAtPrice.toFixed(2)}</div>
                                        )}
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">${product.price.toFixed(2)}</div>
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addItem(product, 1);
                                        }}
                                        disabled={product.inventoryLevel <= 0}
                                        className="w-12 h-12 rounded-full bg-slate-900 hover:bg-indigo-600 dark:bg-white dark:hover:bg-indigo-500 text-white dark:text-slate-900 transition-all flex items-center justify-center shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                                        aria-label="Add to cart"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                {product.inventoryLevel <= 0 && (
                                    <div className="w-full text-center text-xs font-bold text-red-500 uppercase tracking-widest mt-4 bg-red-50 dark:bg-red-900/20 py-1.5 rounded-lg border border-red-100 dark:border-red-800">
                                        Out of Stock
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
