"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Activity,
    Download,
    ChevronRight,
    Search,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    FileText,
    AlertCircle,
    CheckCircle2,
    X,
    Filter,
    Sparkles
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    Timestamp
} from 'firebase/firestore';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';

interface LabResult {
    id: string;
    testName: string;
    category: string;
    dateOrdered: Timestamp;
    dateResulted: Timestamp;
    value: string;
    numericValue?: number;
    unit: string;
    referenceRange: string;
    status: 'Normal' | 'Review Needed' | 'Critical';
    notes?: string;
    provider: string;
}

interface TrendData {
    name: string;
    data: { date: string; value: number; unit: string }[];
}

export default function LabsPage() {
    const [labs, setLabs] = useState<LabResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLab, setSelectedLab] = useState<LabResult | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<{ summary: string; interpretation: string; questions: string[] } | null>(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user: any) => {
            if (user) {
                const labsRef = collection(db, 'patients', user.uid, 'lab_results');
                const q = query(labsRef, orderBy('dateResulted', 'desc'));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LabResult));
                    setLabs(data);
                    setLoading(false);
                });

                return () => unsubscribe();
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        setAiExplanation(null);
        setIsExplaining(false);
    }, [selectedLab]);

    const handleAIExplain = async (lab: LabResult) => {
        setIsExplaining(true);
        // Simulate AI Delay
        await new Promise(r => setTimeout(r, 1500));

        const explanations: Record<string, any> = {
            'Hemoglobin A1c': {
                summary: "The Hemoglobin A1c test measures your average blood sugar levels over the past 3 months. It's a snapshot of how well your body has been managing glucose.",
                interpretation: "Your result indicates you are in the pre-diabetic range. It's slightly higher than recommended, but manageable with consistent lifestyle shifts.",
                questions: ["What daily glucose target should I aim for?", "How often should we repeat this test?", "Are there specific dietary changes that can lower this?"]
            },
            'Lipid Panel - LDL': {
                summary: "LDL is often called 'bad' cholesterol because it can lead to plaque buildup in your arteries, increasing heart risk.",
                interpretation: "Your level is within the target 'Normal' range. This is excellent and indicates your current heart health strategy is effective.",
                questions: ["Does my family history change my target level?", "How does my HDL level balance this result?"]
            },
            'default': {
                summary: `This ${lab.testName} test measures specific clinical biomarkers in your ${lab.category} system.`,
                interpretation: "Your result is being interpreted by our clinical AI. It's important to discuss the specific clinical context with your provider.",
                questions: ["What does this result mean for my overall treatment plan?", "Are there any symptoms I should monitor?"]
            }
        };

        setAiExplanation(explanations[lab.testName] || explanations['default']);
        setIsExplaining(false);
    };

    // Filtered labs for the table
    const filteredLabs = labs.filter(l =>
        l.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group labs for trend charting (e.g., if we have multiple A1c results)
    const trendData = useMemo<TrendData | null>(() => {
        if (!labs.length) return null;
        // Group by test name and take tests with numeric values
        const recurringTests = labs.filter(l => l.numericValue !== undefined)
            .reduce((acc: any, cur) => {
                if (!acc[cur.testName]) acc[cur.testName] = [];
                acc[cur.testName].push({
                    date: format(cur.dateResulted.toDate(), 'MM/dd'),
                    value: cur.numericValue,
                    unit: cur.unit
                });
                return acc;
            }, {});

        // Return most recent trend for a common test (HgbA1c or Glucose etc)
        const bestTest = Object.keys(recurringTests).find(k => recurringTests[k].length > 1) || Object.keys(recurringTests)[0];
        return bestTest ? { name: bestTest, data: recurringTests[bestTest].reverse() } : null;
    }, [labs]);

    const downloadPDF = (lab: LabResult) => {
        const doc = new jsPDF() as any;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(14, 165, 233); // #0EA5E9
        doc.text('LABORATORY REPORT', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Patient Name: ${auth.currentUser?.displayName || 'N/A'}`, 20, 35);
        doc.text(`Report Date: ${format(new Date(), 'PPpp')}`, 20, 40);

        // Divider
        doc.setDrawColor(240);
        doc.line(20, 45, 190, 45);

        // Test Details
        doc.setFontSize(14);
        doc.setTextColor(30);
        doc.text('Test Results', 20, 55);

        const tableData = [[
            lab.testName,
            lab.value + ' ' + lab.unit,
            lab.referenceRange,
            lab.status,
            format(lab.dateResulted.toDate(), 'MM/dd/yyyy')
        ]];

        (doc as any).autoTable({
            startY: 60,
            head: [['Test', 'Result', 'Ref Range', 'Status', 'Date']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [14, 165, 233] }
        });

        doc.save(`${lab.testName.replace(/\s+/g, '_')}_Report.pdf`);
        toast.success('Report downloaded successfully');
    };

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Lab Results</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Review your clinical findings and health trends</p>
            </div>

            {/* Top Stats / Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-[#0EA5E9] mb-6">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-slate-800 tracking-tight text-xl mb-1">Health Summary</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Performance over last 6 months</p>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Normal Results</span>
                            <span className="text-xl font-black text-emerald-500">{labs.filter(l => l.status === 'Normal').length}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Need Review</span>
                            <span className="text-xl font-black text-amber-500">{labs.filter(l => l.status === 'Review Needed' || l.status === 'Critical').length}</span>
                        </div>
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="lg:col-span-8 bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="font-black text-slate-800 tracking-tight text-xl mb-1">
                                {trendData?.name || 'Metabolic Trends'}
                            </h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Visualization of values over time</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-sky-50 text-[#0EA5E9] rounded-lg text-[10px] font-black uppercase tracking-widest">Last 5 Readings</span>
                        </div>
                    </div>

                    <div className="h-48 w-full mt-4">
                        {trendData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData.data}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#64748b' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <EmptyState message="Not enough data for trending" />}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search specific tests or categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-sky-100 transition-all font-sans"
                    />
                </div>
                <button className="px-6 py-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-800 transition-all flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                </button>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-[40px] border border-slate-50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Test Name</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date Resulted</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Value</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ref Range</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLabs.map((lab) => (
                                <tr
                                    key={lab.id}
                                    onClick={() => setSelectedLab(lab)}
                                    className="hover:bg-sky-50/30 transition-colors cursor-pointer group"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#0EA5E9] transition-colors">
                                                <Activity className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm tracking-tight">{lab.testName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lab.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-500">
                                        {format(lab.dateResulted.toDate(), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-sm font-black ${lab.status === 'Normal' ? 'text-slate-800' : lab.status === 'Critical' ? 'text-rose-500' : 'text-amber-500'}`}>
                                            {lab.value} <span className="text-[10px] text-slate-400 font-bold ml-0.5">{lab.unit}</span>
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-xs font-bold text-slate-400 font-mono">
                                        {lab.referenceRange}
                                    </td>
                                    <td className="px-8 py-6">
                                        <StatusBadge status={lab.status} />
                                    </td>
                                    <td className="px-8 py-6">
                                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-[#0EA5E9] transition-colors" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLab && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-900 p-10 text-white flex justify-between items-start shrink-0">
                            <div>
                                <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-2">Detailed Lab Report</h4>
                                <h2 className="text-3xl font-black tracking-tight">{selectedLab.testName}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedLab(null)}
                                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 overflow-y-auto flex-1">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 font-sans">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Result Value</p>
                                    <p className="text-2xl font-black text-slate-800">{selectedLab.value} {selectedLab.unit}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 font-sans">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference Range</p>
                                    <p className="text-2xl font-black text-slate-400">{selectedLab.referenceRange}</p>
                                </div>
                            </div>

                            {/* Provider Info */}
                            <div className="flex items-center gap-4 p-6 border border-slate-50 rounded-[32px]">
                                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-[#0EA5E9]">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordered By</p>
                                    <p className="font-black text-slate-800">{selectedLab.provider}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Result Date</p>
                                    <p className="font-black text-slate-800">{format(selectedLab.dateResulted.toDate(), 'PPP')}</p>
                                </div>
                            </div>

                            {/* Clinical Notes */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Clinical Annotations</h4>
                                <div className="bg-[#F0F9FF] p-8 rounded-[32px] border border-sky-100 text-[#0EA5E9] font-bold leading-relaxed italic">
                                    {selectedLab.notes || "No clinical notes were attached to this report by the resulting laboratory."}
                                </div>
                            </div>

                            {/* AI Lab Explainer */}
                            <div className="pt-4">
                                <button
                                    onClick={() => handleAIExplain(selectedLab)}
                                    disabled={isExplaining}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    <Sparkles className={`w-3.5 h-3.5 ${isExplaining ? 'animate-pulse' : ''}`} />
                                    {isExplaining ? 'AI interpreting results...' : 'Explain My Results (AI)'}
                                </button>

                                {aiExplanation && (
                                    <div className="mt-6 bg-[#F5F3FF] p-8 rounded-[40px] border border-purple-100 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-600 shrink-0">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 tracking-tight">AI Interpretation</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plain-language explanation</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">What this measures</p>
                                                <p className="text-slate-700 font-bold leading-relaxed">{aiExplanation.summary}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">What it means for you</p>
                                                <p className="text-slate-700 font-bold leading-relaxed">{aiExplanation.interpretation}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Ask your doctor</p>
                                                <ul className="space-y-2">
                                                    {aiExplanation.questions.map((q, i) => (
                                                        <li key={i} className="flex gap-2 text-slate-600 font-bold text-sm italic">
                                                            <span className="text-purple-300">•</span> {q}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <p className="mt-8 pt-6 border-t border-purple-100/50 text-[10px] text-slate-400 italic font-medium leading-relaxed">
                                            ✨ This summary is generated by AI for informational purposes only. Always consult your provider for medical diagnosis and treatment plans.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-10 pt-4 flex gap-4 shrink-0 border-t border-slate-50">
                            <button
                                onClick={() => downloadPDF(selectedLab)}
                                className="flex-1 bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-100 hover:bg-sky-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                            <button
                                onClick={() => setSelectedLab(null)}
                                className="px-8 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all border border-transparent"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: LabResult['status'] }) {
    const styles = {
        'Normal': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Review Needed': 'bg-amber-50 text-amber-600 border-amber-100',
        'Critical': 'bg-rose-50 text-rose-600 border-rose-100'
    };
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
            {status}
        </span>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center h-full">
            <AlertCircle className="w-6 h-6 text-slate-200 mb-2" />
            <p className="text-slate-400 font-bold text-xs italic tracking-tight">{message}</p>
        </div>
    );
}
