"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ShoppingBag, Package, Tag, BarChart2, Plus, Search, Filter, Loader2, Edit, Trash2, CheckCircle, Image as ImageIcon, ExternalLink, RefreshCw, X, Save, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { ShopProduct, ShopOrder, ShopDiscountCode, ProductCategory, ProductStatus } from '@/lib/shop-types';

export function StoreAdminClient() {
    const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'discounts' | 'analytics' | 'partners'>('products');

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full -mr-32 -mt-32 transition-transform duration-700"></div>
                <div className="relative z-10 flex gap-4">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                        <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Store Management</h1>
                        </div>
                        <p className="text-slate-500 font-medium">Manage products, fulfill orders, and monitor shop performance.</p>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex overflow-hidden p-1">
                <button onClick={() => setActiveTab('products')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <Package className="w-5 h-5" /> Products
                </button>
                <button onClick={() => setActiveTab('orders')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <ShoppingBag className="w-5 h-5" /> Orders
                </button>
                <button onClick={() => setActiveTab('discounts')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'discounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <Tag className="w-5 h-5" /> Discounts
                </button>
                <button onClick={() => setActiveTab('partners')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'partners' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <ExternalLink className="w-5 h-5" /> Partners
                </button>
                <button onClick={() => setActiveTab('analytics')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <BarChart2 className="w-5 h-5" /> Analytics
                </button>
            </div>

            {activeTab === 'products' && <ProductsTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'discounts' && <DiscountsTab />}
            {activeTab === 'partners' && <PartnersTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
        </div>
    );
}

// ------------------------------------
// PRODUCTS TAB
// ------------------------------------
function ProductsTab() {
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('All');
    
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'shop-products'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopProduct)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredProducts = products.filter(p => {
        if (filterCategory !== 'All' && p.category !== filterCategory) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.sku.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkArchive = async () => {
        if (!confirm(`Archive ${selectedIds.length} products?`)) return;
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                const ref = doc(db, 'shop-products', id);
                batch.update(ref, { status: 'Archived', updatedAt: serverTimestamp() });
            });
            await batch.commit();
            setSelectedIds([]);
            toast.success("Products archived successfully.");
        } catch (e: any) {
            toast.error("Bulk archive failed: " + e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-1 gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name or SKU..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm font-medium focus:outline-none dark:text-white"
                        />
                    </div>
                    <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                    <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 pr-4 focus:outline-none cursor-pointer border-none"
                    >
                        <option value="All">All Categories</option>
                        <option value="Survival Pack">Survival Pack</option>
                        <option value="Supplement">Supplement</option>
                        <option value="Apparel">Apparel</option>
                        <option value="Device">Device</option>
                        <option value="Digital Product">Digital Product</option>
                    </select>
                </div>
                
                <button 
                    onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-2xl shadow-md transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" /> New Product
                </button>
            </div>

            {selectedIds.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-center justify-between">
                    <span className="font-bold text-indigo-800 dark:text-indigo-200">{selectedIds.length} products selected</span>
                    <button onClick={handleBulkArchive} className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-lg text-sm font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-slate-700 transition">
                        Archive Selected
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-4 w-12 text-center">
                                <input 
                                    type="checkbox" 
                                    onChange={(e) => setSelectedIds(e.target.checked ? filteredProducts.map(p => p.id!) : [])}
                                    checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                />
                            </th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Product</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">SKU</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Price</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Inventory</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Status</th>
                            <th className="p-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">No products found.</td></tr>
                        ) : (
                            filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(product.id!)}
                                            onChange={() => toggleSelect(product.id!)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" 
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                                {product.images && product.images.length > 0 ? (
                                                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{product.name}</div>
                                                <div className="text-xs text-slate-500">{product.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{product.sku}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">${product.price.toFixed(2)}</div>
                                        {product.compareAtPrice && <div className="text-[10px] text-slate-400 line-through">${product.compareAtPrice.toFixed(2)}</div>}
                                    </td>
                                    <td className="p-4">
                                        {product.inventoryLevel <= (product.lowStockThreshold || 0) ? (
                                            <span className="text-red-600 font-black text-sm flex items-center gap-1"><AlertTriangleIcon className="w-3 h-3"/> {product.inventoryLevel} left</span>
                                        ) : (
                                            <span className="text-emerald-600 font-bold text-sm">{product.inventoryLevel} in stock</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                            product.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                            product.status === 'Archived' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setIsProductModalOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isProductModalOpen && <ProductEditorModal product={editingProduct} onClose={() => setIsProductModalOpen(false)} />}
        </div>
    );
}

// ------------------------------------
// PRODUCT EDITOR MODAL
// ------------------------------------
function ProductEditorModal({ product, onClose }: { product: ShopProduct | null, onClose: () => void }) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<ShopProduct>>(product || {
        name: '', shortDescription: '', longDescription: '', category: 'Survival Pack',
        sku: '', price: 0, compareAtPrice: null, inventoryLevel: 0, lowStockThreshold: 5,
        status: 'Draft', images: [], tags: [], weight: '', dimensions: ''
    });

    const handleSave = async () => {
        if (!formData.name || !formData.sku || !formData.price) {
            toast.error("Name, SKU, and Price are required.");
            return;
        }
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp(),
            };
            
            if (product?.id) {
                await updateDoc(doc(db, 'shop-products', product.id), dataToSave);
                toast.success("Product updated successfully");
            } else {
                dataToSave.createdAt = serverTimestamp();
                await setDoc(doc(collection(db, 'shop-products')), dataToSave);
                toast.success("Product created successfully");
            }
            onClose();
        } catch (e: any) {
            toast.error("Failed to save product: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        {product ? <Edit className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />} 
                        {product ? 'Edit Product' : 'New Product'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Short Description</label>
                                <textarea value={formData.shortDescription} rows={2} onChange={e => setFormData({...formData, shortDescription: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Long Description (Rich Text support simulated)</label>
                                <textarea value={formData.longDescription} rows={5} onChange={e => setFormData({...formData, longDescription: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y" />
                            </div>
                        </div>

                        <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProductStatus})} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none">
                                    <option value="Active">Active</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Archived">Archived</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as ProductCategory})} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none">
                                    <option value="Survival Pack">Survival Pack</option>
                                    <option value="Supplement">Supplement</option>
                                    <option value="Apparel">Apparel</option>
                                    <option value="Device">Device</option>
                                    <option value="Digital Product">Digital Product</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">SKU</label>
                                <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none uppercase" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Price ($)</label>
                            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Compare At ($)</label>
                            <input type="number" step="0.01" value={formData.compareAtPrice || ''} onChange={e => setFormData({...formData, compareAtPrice: parseFloat(e.target.value) || null})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Inventory Level</label>
                            <input type="number" value={formData.inventoryLevel} onChange={e => setFormData({...formData, inventoryLevel: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Low Stock Alert at</label>
                            <input type="number" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-amber-600 font-bold" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Media URLs (Comma separated for demo)</label>
                        <textarea 
                            value={formData.images?.join(', ')} 
                            onChange={e => setFormData({...formData, images: e.target.value.split(',').map(s=>s.trim()).filter(s=>s)})} 
                            placeholder="https://image1.jpg, https://image2.jpg"
                            rows={2}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none resize-none" 
                        />
                        <div className="flex gap-2 mt-2">
                            {formData.images?.map((img, i) => (
                                <div key={i} className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                                    <img src={img} className="w-full h-full object-cover" alt="" onError={e => (e.currentTarget.style.display='none')} />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                    <button onClick={onClose} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/30 transition-colors flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Product
                    </button>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------
// ORDERS TAB
// ------------------------------------
function OrdersTab() {
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'shop-orders'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopOrder)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const updateFulfillmentStatus = async (orderId: string, status: string) => {
        try {
            await updateDoc(doc(db, 'shop-orders', orderId), { fulfillmentStatus: status, updatedAt: serverTimestamp() });
            toast.success("Order status updated");
        } catch (e: any) {
             toast.error("Failed to update status");
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
             <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Order</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Date</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Customer</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Total</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Payment</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Fulfillment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No orders yet.</td></tr>
                        ) : (
                            orders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                    <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">#{order.orderNumber}</td>
                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Unknown'}</td>
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">{order.patientName}</td>
                                    <td className="p-4 font-black">${order.total.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {order.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                         <select 
                                            value={order.fulfillmentStatus} 
                                            onChange={(e) => updateFulfillmentStatus(order.id!, e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            className="bg-transparent font-bold text-sm focus:outline-none"
                                         >
                                             <option value="Pending">Pending</option>
                                             <option value="Processing">Processing</option>
                                             <option value="Shipped">Shipped</option>
                                             <option value="Delivered">Delivered</option>
                                             <option value="Cancelled">Cancelled</option>
                                         </select>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
        </div>
    );
}

// ------------------------------------
// PARTNERS TAB
// ------------------------------------
function PartnersTab() {
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<any | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'shop-partners'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setPartners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const toggleFeatured = async (id: string, featured: boolean) => {
        try {
            await updateDoc(doc(db, 'shop-partners', id), { isFeatured: !featured, updatedAt: serverTimestamp() });
            toast.success("Partner featured status updated");
        } catch(e) { toast.error("Failed to update status"); }
    }

    const toggleStatus = async (id: string, status: string) => {
        try {
            await updateDoc(doc(db, 'shop-partners', id), { status: status === 'Active' ? 'Inactive' : 'Active', updatedAt: serverTimestamp() });
            toast.success("Partner status toggled");
        } catch(e) { toast.error("Failed to update status"); }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">External & Integrated Partners</h3>
                <button onClick={() => { setEditingPartner(null); setIsPartnerModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-2xl shadow-md transition-colors flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Add Partner
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Partner</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Category</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Status</th>
                            <th className="p-4 text-xs font-black uppercase text-slate-500 tracking-wider">Featured</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></td></tr>
                        ) : partners.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No partners defined yet.</td></tr>
                        ) : (
                            partners.map(partner => (
                                <tr key={partner.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 object-contain bg-center">
                                                {partner.logo ? <img src={partner.logo} className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-slate-400" />}
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white">{partner.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{partner.category}</td>
                                    <td className="p-4">
                                        <button onClick={() => toggleStatus(partner.id, partner.status)} className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-colors ${
                                            partner.status === 'Active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}>
                                            {partner.status}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={partner.isFeatured} onChange={() => toggleFeatured(partner.id, partner.isFeatured)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                                        </label>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => { setEditingPartner(partner); setIsPartnerModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {isPartnerModalOpen && <PartnerEditorModal partner={editingPartner} onClose={() => setIsPartnerModalOpen(false)} />}
        </div>
    );
}

function PartnerEditorModal({ partner, onClose }: { partner: any, onClose: () => void }) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<any>(partner || {
        name: '', shortDescription: '', longDescription: '', category: 'Nutrition',
        logo: '', affiliateUrl: '', status: 'Active', isFeatured: false, notes: ''
    });

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("Name is required");
            return;
        }
        setSaving(true);
        try {
            const dataToSave = { ...formData, updatedAt: serverTimestamp() };
            if (partner?.id) {
                await updateDoc(doc(db, 'shop-partners', partner.id), dataToSave);
                toast.success("Partner updated");
            } else {
                dataToSave.createdAt = serverTimestamp();
                await setDoc(doc(collection(db, 'shop-partners')), dataToSave);
                toast.success("Partner created");
            }
            onClose();
        } catch(e:any) { toast.error("Failed to save: " + e.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        {partner ? <Edit className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />} 
                        {partner ? 'Edit Partner' : 'New Partner'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Partner Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none">
                                <option value="Nutrition">Nutrition</option>
                                <option value="Fitness">Fitness</option>
                                <option value="Pharmacy">Pharmacy</option>
                                <option value="Wellness">Wellness</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Short Description</label>
                        <input type="text" value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Long Description / Details</label>
                        <textarea value={formData.longDescription} rows={3} onChange={e => setFormData({...formData, longDescription: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Affiliate URL / Tracking Link</label>
                        <input type="text" value={formData.affiliateUrl} onChange={e => setFormData({...formData, affiliateUrl: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none" placeholder="https://..." />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Logo Media URL</label>
                        <input type="text" value={formData.logo} onChange={e => setFormData({...formData, logo: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none" placeholder="https://..." />
                    </div>
                    
                    <div className="flex gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold relative">
                            <input type="checkbox" checked={formData.status === 'Active'} onChange={e => setFormData({...formData, status: e.target.checked ? 'Active' : 'Inactive'})} className="w-4 h-4" /> Active Status
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-600 dark:text-indigo-400">
                            <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} className="w-4 h-4" /> Feature this partner
                        </label>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                    <button onClick={onClose} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Partner
                    </button>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------
// DISCOUNTS TAB
// ------------------------------------
function DiscountsTab() {
    return (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-500">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Discounts & Promotions</h3>
            <p>Admin management for discount codes under construction.</p>
        </div>
    );
}

// ------------------------------------
// ANALYTICS TAB
// ------------------------------------
function AnalyticsTab() {
    return (
         <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-500">
            <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-50 text-indigo-500" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Store Analytics</h3>
            <p>Revenue, AOV, and top-performing products metrics under construction.</p>
        </div>
    );
}

// Quick inline icon component to avoid one more import if AlertTriangle wasn't imported
function AlertTriangleIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
}
