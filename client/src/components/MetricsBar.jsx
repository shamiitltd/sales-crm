import React from 'react';
import {
  Users,
  IndianRupee,
  Target,
  TrendingUp,
  Clock
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function MetricsBar({ metrics, onFilterToday }) {
  const {
    totalLeads = 0,
    pendingFollowupsToday = 0,
    totalPipelineValue = 0,
    wonValue = 0,
    wonCount = 0,
    conversionRate = 0
  } = metrics || {};

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
      
      {/* 1. Total Leads */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 shadow-sm hover:border-slate-700/80 transition group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Leads
          </span>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white font-['Outfit']">
            {totalLeads}
          </span>
          <span className="text-xs text-slate-400">in active CRM</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>Across all pipeline stages</span>
        </div>
      </div>

      {/* 2. Pending Follow-ups Today */}
      <div 
        onClick={onFilterToday}
        className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition group cursor-pointer ${
          pendingFollowupsToday > 0
            ? 'bg-gradient-to-b from-amber-950/20 to-slate-900/80 border-amber-500/40 hover:border-amber-400/60'
            : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700/80'
        }`}
        title="Click to view today's pending follow-ups"
      >
        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
            Pending Follow-ups Today
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white font-['Outfit']">
            {pendingFollowupsToday}
          </span>
          {pendingFollowupsToday > 0 ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
              Requires Action
            </span>
          ) : (
            <span className="text-xs text-emerald-400 font-medium">All caught up</span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-amber-300/80 group-hover:underline">
          <span>Click to filter today's list &rarr;</span>
        </div>
      </div>

      {/* 3. Total Pipeline Value (₹) */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 shadow-sm hover:border-slate-700/80 transition group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Pipeline Value
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
            {formatINR(totalPipelineValue)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span className="text-emerald-400 font-medium">
            Won: {formatINR(wonValue)}
          </span>
          <span className="text-[11px] text-slate-400">
            {wonCount} deals won
          </span>
        </div>
      </div>

      {/* 4. Conversion Rate (%) */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 shadow-sm hover:border-slate-700/80 transition group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Conversion Rate
          </span>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white font-['Outfit']">
            {conversionRate}%
          </span>
          <span className="text-xs text-slate-400">win ratio</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>{wonCount} of {totalLeads} opportunities closed</span>
        </div>
      </div>

    </section>
  );
}
