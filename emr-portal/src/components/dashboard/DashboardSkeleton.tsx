export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-40 rounded-3xl border border-slate-200 bg-white" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(320px,1fr)]">
                <div className="space-y-4">
                    <div className="h-12 rounded-2xl border border-slate-200 bg-white" />
                    <div className="h-28 rounded-2xl border border-slate-200 bg-white" />
                    <div className="h-28 rounded-2xl border border-slate-200 bg-white" />
                    <div className="h-28 rounded-2xl border border-slate-200 bg-white" />
                </div>
                <div className="space-y-4">
                    <div className="h-56 rounded-2xl border border-slate-200 bg-white" />
                    <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
                </div>
            </div>
        </div>
    );
}
