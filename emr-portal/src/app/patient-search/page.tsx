"use client";

import React from 'react';
import { Search, History, Star, User } from 'lucide-react';

export default function PatientSearchPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Patient Search</h1>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        Recent Searches
                    </button>
                    <button className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all">
                        Advanced Search
                    </button>
                </div>
            </div>

            <div className="relative group max-w-2xl mx-auto w-full mt-8">
                <Search className="w-6 h-6 text-slate-400 absolute left-4 top-4 group-focus-within:text-brand transition-colors" />
                <input
                    type="text"
                    placeholder="Search patients by name, DOB, ID, or phone..."
                    className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-lg focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 shadow-sm transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <History className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-slate-800">Recent</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">WS</div>
                            <span className="text-sm font-medium">Wendy Smith</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">JD</div>
                            <span className="text-sm font-medium">John Doe</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-slate-800">Pinned</h3>
                    </div>
                    <p className="text-sm text-slate-400 italic">No pinned patients</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <User className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-bold text-slate-800">My Patients</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                            <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-xs font-bold text-emerald-600">BD</div>
                            <span className="text-sm font-medium">Bobby Doe</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
