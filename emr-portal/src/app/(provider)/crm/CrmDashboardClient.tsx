"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import {
    Users, Briefcase, Database, BarChart, ClipboardList, ArrowRight, User, AlertTriangle, Calendar,
    Search, Sparkles, Activity, Tag, Plus, Target, ShieldCheck
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';

interface VendorAlert {
    id: string;
    name: string;
    contractEndDate: string | any;
    daysUntilExpiration: number;
}

interface MetricSummary {
    patientsCount: number;
    facilitiesCount: number;
    activeVendorsCount: number;
    activeCampaignsCount: number;
    openGrantsCount: number;
    complianceDocsCount: number;
}

interface RecentActivity {
    id: string;
    action: string;
    details: string;
    author: string;
    timestamp: any;
    entityName: string;
    entityType: string;
    entityId: string;
}

export default function CrmDashboardClient() {
    const router = useRouter();
    const [expiringVendors, setExpiringVendors] = useState<VendorAlert[]>([]);
    const [metrics, setMetrics] = useState<MetricSummary>({
        patientsCount: 0,
        facilitiesCount: 0,
        activeVendorsCount: 0,
        activeCampaignsCount: 0,
        openGrantsCount: 0,
        complianceDocsCount: 0
    });
    const [recentActivies, setRecentActivities] = useState<RecentActivity[]>([]);
    const [globalSearch, setGlobalSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Aggregated entities cache
    const [allData, setAllData] = useState<Record<string, any[]>>({});

    useEffect(() => {
        const entityTypes = ['patients', 'facilities', 'vendors', 'campaigns', 'grants'];
        
        // Also fetch compliance documents separately as it's in crm-compliance
        const qDocs = query(collection(db, 'crm-compliance', 'data', 'document-records'));
        const unsubDocs = onSnapshot(qDocs, (snap) => {
            setMetrics(prev => ({ ...prev, complianceDocsCount: snap.docs.length }));
        });

        const unsubscribes: any[] = [unsubDocs];
        const dataStore: Record<string, any[]> = {};
        
        entityTypes.forEach(type => {
            const q = query(collection(db, 'crm', 'data', type));
            const unsub = onSnapshot(q, (snapshot) => {
                const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                dataStore[type] = results;
                setAllData(prev => ({ ...prev, [type]: results }));
                
                // --- Process Metrics ---
                const allPatients = dataStore['patients'] || [];
                const allFacilities = dataStore['facilities'] || [];
                const allVendors = dataStore['vendors'] || [];
                const allCampaigns = dataStore['campaigns'] || [];
                const allGrants = dataStore['grants'] || [];

                setMetrics(prev => ({
                    patientsCount: allPatients.filter(p => !['Churned'].includes(p.status)).length,
                    facilitiesCount: allFacilities.filter(f => !['Inactive'].includes(f.status)).length,
                    activeVendorsCount: allVendors.filter(v => ['Active'].includes(v.status)).length,
                    activeCampaignsCount: allCampaigns.filter(c => ['Active'].includes(c.status)).length,
                    openGrantsCount: allGrants.filter(g => !['Archived', 'Rejected'].includes(g.status)).length,
                    complianceDocsCount: prev.complianceDocsCount, // Preserved from the compliance docs listener
                }));

                // --- Process Expiring Vendors ---
                const now = new Date();
                const alerts: VendorAlert[] = [];
                allVendors.forEach(data => {
                    if (data.contractEndDate && data.status !== 'Inactive' && data.status !== 'Archived') {
                        let endDate: Date | null = null;
                        if (data.contractEndDate?.toDate) endDate = data.contractEndDate.toDate();
                        else if (typeof data.contractEndDate === 'string') endDate = new Date(data.contractEndDate);
                        
                        if (endDate && !isNaN(endDate.getTime())) {
                            const days = differenceInDays(endDate, now);
                            if (days <= 90 && days >= -30) {
                                alerts.push({
                                    id: data.id,
                                    name: data.name || 'Unnamed Vendor',
                                    contractEndDate: endDate,
                                    daysUntilExpiration: days
                                });
                            }
                        }
                    }
                });
                alerts.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
                setExpiringVendors(alerts);

                // --- Process Recent Activity ---
                const allActivities: RecentActivity[] = [];
                Object.keys(dataStore).forEach(eType => {
                    const entities = dataStore[eType] || [];
                    entities.forEach(ent => {
                        if (ent.activityLog && Array.isArray(ent.activityLog)) {
                            ent.activityLog.forEach((log: any) => {
                                allActivities.push({
                                    id: `${ent.id}-${log.timestamp?.toMillis ? log.timestamp.toMillis() : Date.now()}`,
                                    action: log.action || 'Unknown Action',
                                    details: log.details || '',
                                    author: log.author || 'System',
                                    timestamp: log.timestamp,
                                    entityName: ent.name || 'Unnamed',
                                    entityType: eType,
                                    entityId: ent.id
                                });
                            });
                        } else if (ent.lastActivityDate) {
                            // Fallback pseudo-activity
                            allActivities.push({
                                id: `${ent.id}-fallback`,
                                action: 'Record Updated',
                                details: `Modifications made to ${ent.name}`,
                                author: ent.assignedOwner || 'System',
                                timestamp: ent.lastActivityDate,
                                entityName: ent.name || 'Unnamed',
                                entityType: eType,
                                entityId: ent.id
                            });
                        }
                    });
                });

                allActivities.sort((a, b) => {
                    const tsA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
                    const tsB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
                    return tsB - tsA;
                });
                
                // Get unique activities (de-dupe fallbacks mostly)
                const uniqueActs = Array.from(new Map(allActivities.map(item => [item.id, item])).values());
                setRecentActivities(uniqueActs.slice(0, 20));

            }, (err) => console.error(`Fetch ${type} error:`, err));
            
            unsubscribes.push(unsub);
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, []);

    // Global Search Logic
    useEffect(() => {
        if (!globalSearch.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const term = globalSearch.toLowerCase();
        const results: any[] = [];
        
        Object.keys(allData).forEach(type => {
            const list = allData[type] || [];
            list.forEach(item => {
                const matchName = item.name?.toLowerCase().includes(term);
                const matchEmail = item.email?.toLowerCase().includes(term);
                const matchTag = (item.tags || []).some((t: string) => t.toLowerCase().includes(term));
                const matchStatus = item.status?.toLowerCase().includes(term);
                
                if (matchName || matchEmail || matchTag || matchStatus) {
                    results.push({ ...item, _type: type });
                }
            });
        });
        
        setSearchResults(results.slice(0, 15)); // top 15 matches
    }, [globalSearch, allData]);

    const moduleCards = [
        { title: 'Patients', icon: User, href: '/crm/patients', color: 'indigo', count: metrics.patientsCount, label: 'Active Leads' },
        { title: 'Facilities', icon: Briefcase, href: '/crm/facilities', color: 'sky', count: metrics.facilitiesCount, label: 'Active Prospects' },
        { title: 'Vendors', icon: Users, href: '/crm/vendors', color: 'emerald', count: metrics.activeVendorsCount, label: 'Active Vendors' },
        { title: 'Campaigns', icon: BarChart, href: '/crm/campaigns', color: 'amber', count: metrics.activeCampaignsCount, label: 'Active Campaigns' },
        { title: 'Grants', icon: ClipboardList, href: '/crm/grants', color: 'rose', count: metrics.openGrantsCount, label: 'Open Proposals' },
        { title: 'Compliance', icon: ShieldCheck, href: '/crm/compliance', color: 'teal', count: metrics.complianceDocsCount || 0, label: 'Documents' }
    ];

    const formatActivityTimestamp = (ts: any) => {
        if (!ts) return 'Unknown date';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return format(d, 'MMM d, h:mm a');
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
            
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/50">
                            <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">CRM Dashboard</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl leading-relaxed mt-2 pl-15">
                        Manage your relationships with patients, B2B facilities, vendors, marketing campaigns, and grant proposals.
                    </p>
                </div>

                <div className="flex-1 max-w-md relative z-50">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search globally by name, email, or tag..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-[20px] py-4 pl-12 pr-4 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-400 transition-all shadow-inner"
                        />
                        {globalSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
                                <div className="max-h-[300px] overflow-y-auto">
                                    {searchResults.length > 0 ? searchResults.map(res => (
                                        <button 
                                            key={res.id}
                                            onClick={() => router.push(`/crm/${res._type}/${res.id}`)}
                                            className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between transition-colors"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{res.name}</p>
                                                <p className="text-xs text-slate-400 mt-1 capitalize font-bold">{res._type.slice(0,-1)} &bull; {res.status}</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-400" />
                                        </button>
                                    )) : (
                                        <div className="p-4 text-center text-slate-500 font-bold text-sm">No exact matches found.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Top Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {moduleCards.map(mod => (
                    <div key={mod.title} className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${mod.color}-50 dark:bg-${mod.color}-900/20 text-${mod.color}-600 dark:text-${mod.color}-400 mb-2`}>
                            <mod.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{mod.count}</div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">{mod.label}</div>
                    </div>
                ))}
            </div>

            {/* AI Assistant Banner */}
            <Link href="/crm/assistant" className="block w-full bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white rounded-[32px] p-6 shadow-xl shadow-indigo-900/20 transition-all transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute -inset-24 bg-white/20 blur-3xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Gemini AI Assistant</h2>
                            <p className="text-indigo-100 text-sm mt-1 font-semibold max-w-sm">Draft outreach, summarize leads, build campaigns, and supercharge your CRM operations.</p>
                        </div>
                    </div>
                    <div className="hidden md:flex bg-white/20 backdrop-blur-md px-6 py-3 rounded-xl font-bold gap-2 items-center text-sm shadow-inner">
                        Launch Assistant <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </Link>
            
            {/* Expiring Vendors */}
            {expiringVendors.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 p-6 rounded-[24px] shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">Action Required: Expiring Vendors</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {expiringVendors.map(v => (
                            <Link 
                                href={`/crm/vendors/${v.id}`} 
                                key={v.id}
                                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-100 dark:border-rose-800/50 hover:shadow-md transition-shadow group flex items-start justify-between"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{v.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Ends: {format(new Date(v.contractEndDate), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${v.daysUntilExpiration <= 30 ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800'}`}>
                                    {v.daysUntilExpiration < 0 ? 'Expired' : `${v.daysUntilExpiration} days`}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Modules Link Grid */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 ml-2">Modules</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {moduleCards.map((mod) => (
                            <Link key={mod.href} href={mod.href} className="group flex items-center justify-between bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 bg-${mod.color}-50 text-${mod.color}-600 dark:bg-${mod.color}-900/30 dark:text-${mod.color}-400`}>
                                        <mod.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 tracking-tight">{mod.title}</h3>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 ml-2 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-sky-500" /> Recent Activity
                    </h3>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[32px] p-6 shadow-sm overflow-hidden h-[550px] overflow-y-auto">
                        {recentActivies.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">No recent activity detected.</div>
                        ) : (
                            <div className="relative pl-6 space-y-8 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-700">
                                {recentActivies.map((act) => (
                                    <div key={act.id} className="relative flex flex-col gap-1 tracking-tight group">
                                        <div className="absolute -left-[32px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm transition-transform group-hover:scale-125 bg-sky-500"></div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{act.author}</span>
                                                <span className="text-xs uppercase font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 tracking-widest leading-none">
                                                    {act.action}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 ml-auto">{formatActivityTimestamp(act.timestamp)}</span>
                                        </div>
                                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                            {act.details}
                                        </div>
                                        <Link href={`/crm/${act.entityType}/${act.entityId}`} className="mt-2 text-xs font-bold text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1 group-hover:gap-2 transition-all w-fit">
                                            <span className="capitalize">{act.entityType.slice(0,-1)}:</span> {act.entityName} <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
