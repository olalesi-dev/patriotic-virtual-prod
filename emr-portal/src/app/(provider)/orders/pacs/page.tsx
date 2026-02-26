"use client";

import React from 'react';
import { Scan, ExternalLink, Info } from 'lucide-react';

export default function PacsPage() {
    const pacsUrl = "https://patriotictelehealth.cloudflareaccess.com/cdn-cgi/access/login/pacs.patriotictelehealth.com?kid=50d12b77a557150adfb69118eca44c243524d89794459b29611a7326d9485b5c&meta=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImQwNDZhODYwMmEyNzlmZTg2ZDZhNWE2MzlkMmYwMjE0YmRmNDlhMmM0YTFjM2I5YTdiNmRmNDZjYjJkMmQ0MGMifQ.eyJ0eXBlIjoibWV0YSIsImF1ZCI6IjUwZDEyYjc3YTU1NzE1MGFkZmI2OTExOGVjYTQ0YzI0MzUyNGQ4OTc5NDQ1OWIyOTYxMWE3MzI2ZDk0ODViNWMiLCJob3N0bmFtZSI6InBhY3MucGF0cmlvdGljdGVsZWhlYWx0aC5jb20iLCJyZWRpcmVjdF91cmwiOiIvIiwic2VydmljZV90b2tlbl9zdGF0dXMiOmZhbHNlLCJpc193YXJwIjpmYWxzZSwiaXNfZ2F0ZXdheSI6ZmFsc2UsImV4cCI6MTc3MTY0Mzc1NywibmJmIjoxNzcxNjQzNDU3LCJpYXQiOjE3NzE2NDM0NTcsImF1dGhfc3RhdHVzIjoiTk9ORSIsIm10bHNfYXV0aCI6eyJjZXJ0X2lzc3Vlcl9kbiI6IiIsImNlcnRfc2VyaWFsIjoiIiwiY2VydF9pc3N1ZXJfc2tpIjoiIiwiY2VydF9wcmVzZW50ZWQiOmZhbHNlLCJjb21tb25fbmFtZSI6IiIsImF1dGhfc3RhdHVzIjoiTk9ORSJ9LCJyZWFsX2NvdW50cnkiOiJVUyIsImFwcF9zZXNzaW9uX2hhc2giOiJjOTZiNjhmOGEyZjYzNzhmYzhhYzA0OTM3YWJkMzkyMDIyN2U4ZWVmZDUzYmNkOGRkZTUxOGQwMTQ2MGZjMDZjIn0.Hz2Svg-SbF3Oi_P_CzJFodwLybyBgJ24PTka6dFjr1v5KjfbNsHVWsyjUvPTrZgJJ0de-0nktzr-rysESAc1EeqA_YotbvPuIkS-W40nJoLfbHwK22f_3RGfGUbnH8sgpIImbggoTBSyUqznLDVMF4uj9pe2KFDnobEtJoprONe1qGT_zwzB8fyVwGaWTNUe74U5EL4paLV88HbV6_0N_ekgFsXuYO5aL_dguN75xq2FeGu8zldtnpKI2FZ9h-3CZ0FSWSPYLPVu1DmhI-lhjQO-7TXmbK4isQNG-x837taraPnaEWZjhk_j7wbm1eI4rJV44H2vJjLZ4dbkFqHl5g&redirect_url=%2F";

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
            {/* PACS Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Scan className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">PACS Viewer</h2>
                        <p className="text-xs text-slate-500 font-medium">Picture Archiving and Communication System</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Secure Connection
                    </div>
                    <a
                        href={pacsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in New Tab
                    </a>
                </div>
            </div>

            {/* PACS Iframe Container */}
            <div className="flex-1 bg-slate-900 relative group">
                <iframe
                    src={pacsUrl}
                    className="w-full h-full border-0 absolute inset-0"
                    title="PACS Viewer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />

                {/* Overlay Hint if Loading or Blank */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 flex items-center gap-2">
                    <Info className="w-3 h-3 text-indigo-400" />
                    Cloudflare Access Protected Viewer
                </div>
            </div>
        </div>
    );
}
