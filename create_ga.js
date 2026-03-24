const fs = require('fs');
const path = require('path');

// 1. Create page.tsx
const pageDir = 'emr-portal/src/app/(provider)/analytics/google';
fs.mkdirSync(pageDir, { recursive: true });
fs.writeFileSync(path.join(pageDir, 'page.tsx'), `import PageClient from './PageClient';\nexport const metadata = { title: 'Google Analytics - Patriotic EMR' };\nexport default function Page() { return <PageClient />; }`);

// 2. Create PageClient.tsx
const pageClientSrc = 
`"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp, Users, Eye, MousePointerClick, AlertCircle, ArrowUpRight, Globe, Layers, Activity
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area,
    BarChart as ReBarChart, Bar
} from 'recharts';

export default function GoogleAnalyticsDashboard() {
    const { data: report, isLoading, error } = useQuery({
        queryKey: ['google-analytics'],
        queryFn: async () => {
            const res = await fetch('/api/admin/analytics/google');
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data.data;
        },
        retry: false
    });

    if (isLoading) {
         return (
             <div className="flex items-center justify-center h-96">
                 <div className="w-12 h-12 border-4 border-slate-200 border-t-google-blue rounded-full animate-spin"></div>
             </div>
         );
    }

    if (error) {
         return (
             <div className="p-8 max-w-2xl mx-auto mt-12 bg-white dark:bg-slate-800 rounded-3xl border border-red-200 dark:border-red-900 shadow-xl relative overflow-hidden">
                 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-none mb-6">
                     <AlertCircle className="w-8 h-8" />
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Google Analytics Disconnected</h2>
                 <p className="font-medium text-slate-500 mt-2">The Google Analytics Data API is not yet configured or returning an error.</p>
                 <div className="mt-8 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 font-mono text-xs text-red-500 break-words">
                     {String(error)}
                 </div>
                 <div className="mt-8 space-y-3 text-sm">
                     <p className="font-bold uppercase tracking-widest text-[#4285F4]">How to fix this:</p>
                     <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400 space-y-2 font-medium">
                         <li>Go to your Google Cloud Console and enable the <strong className="text-slate-900 dark:text-white">Google Analytics Data API</strong>.</li>
                         <li>Grant your Google Cloud Service Account at least <strong>Viewer</strong> access to your GA4 Property.</li>
                         <li>Set the <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[#EA4335]">GA_PROPERTY_ID</code> environment variable in your production environment to match your GA4 Property ID.</li>
                     </ul>
                 </div>
             </div>
         );
    }

    // Process data if available
    const rawData = Array.isArray(report) ? report : [];
    
    // Fallback Mock Data if Array is empty but successfully authenticated
    const hasRealData = rawData.length > 0;
    const viewData = hasRealData ? rawData : [
        { date: '20250310', users: 140, sessions: 180, views: 500, source: 'google / cpc' },
        { date: '20250311', users: 180, sessions: 230, views: 600, source: 'google / organic' },
        { date: '20250312', users: 200, sessions: 250, views: 700, source: 'direct / none' },
        { date: '20250313', users: 160, sessions: 200, views: 550, source: 'bing / organic' },
        { date: '20250314', users: 220, sessions: 280, views: 800, source: 'google / maps' },
        { date: '20250315', users: 300, sessions: 350, views: 900, source: 'direct / none' },
        { date: '20250316', users: 280, sessions: 320, views: 850, source: 'duckduckgo / organic' }
    ];

    // Aggregate source data
    const sourceMap = viewData.reduce((acc, curr) => {
        const s = curr.source || 'Unknown';
        acc[s] = (acc[s] || 0) + (curr.users || 0);
        return acc;
    }, {} as Record<string, number>);

    const topSources = Object.entries(sourceMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Format dates for charts
    const timeSeriesData = viewData.map(d => {
        const year = d.date.substring(0,4);
        const month = d.date.substring(4,6);
        const day = d.date.substring(6,8);
        return {
            ...d,
            label: \`\${month}/\${day}\`
        };
    }).sort((a,b) => a.date.localeCompare(b.date));

    // Totals
    const totalUsers = viewData.reduce((sum, d) => sum + (d.users || 0), 0);
    const totalSessions = viewData.reduce((sum, d) => sum + (d.sessions || 0), 0);
    const totalViews = viewData.reduce((sum, d) => sum + (d.views || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Globe className="w-8 h-8 text-[#4285F4]" />
                        GOOGLE ANALYTICS 4
                    </h1>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Live Web Traffic & Patient Acquisition Metrics</p>
                </div>
            </div>

            {/* Warn if mock data */}
            {!hasRealData && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-4 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="text-sm font-semibold">Authentication successful, but the GA4 property returned 0 rows for the last 30 days. Showing demonstration structural layout.</p>
                </div>
            )}

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Active Users', value: totalUsers.toLocaleString(), sub: 'Last 30 Days', icon: Users, color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10' },
                    { label: 'Total Sessions', value: totalSessions.toLocaleString(), sub: 'Cross-platform', icon: Layers, color: 'text-[#34A853]', bg: 'bg-[#34A853]/10' },
                    { label: 'Page Views', value: totalViews.toLocaleString(), sub: 'Screen \u0026 UI Events', icon: Eye, color: 'text-[#EA4335]', bg: 'bg-[#EA4335]/10' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-6">
                            <div className={\`w-12 h-12 \${stat.bg} rounded-2xl flex items-center justify-center\`}>
                                <stat.icon className={\`w-6 h-6 \${stat.color}\`} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">{stat.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Graph */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-8">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Users Over Time</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">30 Day Visualization Range</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4285F4" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4285F4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-700" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="users" stroke="#4285F4" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sources List */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Top Acquisition Sources</h3>
                    <div className="flex-1 flex flex-col justify-center space-y-6">
                        {topSources.map((s, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{s.name}</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{s.value.toLocaleString()} users</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 rounded-full overflow-hidden">
                                    <div className="bg-[#FBBC05] h-2 rounded-full" style={{ width: \`\${(s.value / topSources[0].value) * 100}%\` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}`;
fs.writeFileSync(path.join(pageDir, 'PageClient.tsx'), pageClientSrc);

// 3. Create API Route
const apiDir = 'emr-portal/src/app/api/admin/analytics/google';
fs.mkdirSync(apiDir, { recursive: true });
const apiSrc = 
`import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function GET() {
    try {
        const propertyId = process.env.GA_PROPERTY_ID;
        if (!propertyId) {
            return NextResponse.json({ success: false, error: 'GA_PROPERTY_ID not configured in environment variables. Please enable Google Analytics Data API and set GA_PROPERTY_ID in the deployment.' }, { status: 400 });
        }

        const analyticsDataClient = new BetaAnalyticsDataClient();

        const [response] = await analyticsDataClient.runReport({
             property: \`properties/\${propertyId}\`,
             dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
             dimensions: [{ name: 'date' }, {name: 'sessionSourceMedium'}],
             metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
         });

        const data = response.rows?.map(row => ({
             date: row.dimensionValues?.[0]?.value,
             source: row.dimensionValues?.[1]?.value,
             users: parseInt(row.metricValues?.[0]?.value || '0'),
             sessions: parseInt(row.metricValues?.[1]?.value || '0'),
             views: parseInt(row.metricValues?.[2]?.value || '0'),
        })) || [];

        return NextResponse.json({ success: true, data });
    } catch(e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
`;
fs.writeFileSync(path.join(apiDir, 'route.ts'), apiSrc);

// 4. Update MainLayout NavItem
const layoutPath = 'emr-portal/src/components/layout/MainLayout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

if (!layoutContent.includes('/analytics/google')) {
    const orig = `<NavItem href="/analytics/business" icon={BarChart} label="Business Dashboard" active={pathname === '/analytics/business'} collapsed={isSidebarCollapsed} />`;
    const replaceWith = `${orig}\n                            <NavItem href="/analytics/google" icon={Activity} label="Google Analytics" active={pathname === '/analytics/google'} collapsed={isSidebarCollapsed} />`;
    layoutContent = layoutContent.replace(orig, replaceWith);
    fs.writeFileSync(layoutPath, layoutContent);
}

console.log("Analytics architecture created.");
