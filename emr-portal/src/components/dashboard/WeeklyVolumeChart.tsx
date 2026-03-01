"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface WeeklyVolumePoint {
    name: string;
    visits: number;
}

export default function WeeklyVolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                    cursor={{ stroke: '#e2e8f0' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="visits" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorBrand)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}
