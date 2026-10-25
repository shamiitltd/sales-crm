import React from 'react';
import {
  Wallet,
  Users,
  Target,
  Bell,
  ArrowUpRight
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function KPICards({ metrics, onFilterUrgent }) {
  const {
    totalPipelineValue = 0,
    pipelineValueDelta = '0% MoM',
    activeLeads = 0,
    activeLeadsDelta = '0 this week',
    winRate = 0,
    winRateDelta = '0% MoM',
    urgentFollowups = 0,
    overdueCount = 0
  } = metrics || {};

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Total Pipeline Value */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Pipeline Value
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-['Outfit'] mt-1.5 tracking-tight">
              {formatINR(totalPipelineValue)}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{pipelineValueDelta}</span>
        </div>
      </div>

      {/* 2. Active Leads */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Leads
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-['Outfit'] mt-1.5 tracking-tight">
              {activeLeads}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{activeLeadsDelta}</span>
        </div>
      </div>

      {/* 3. Win Rate */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Win Rate
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-['Outfit'] mt-1.5 tracking-tight">
              {winRate}%
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{winRateDelta}</span>
        </div>
      </div>

      {/* 4. Urgent Follow-ups Today */}
      <div
        onClick={onFilterUrgent}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:border-red-300 dark:hover:border-red-800/80 transition-colors duration-200 cursor-pointer group"
        title="Click to filter urgent & overdue follow-ups"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-red-500 transition">
              Urgent Follow-ups Today
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-['Outfit'] mt-1.5 tracking-tight">
              {urgentFollowups}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-500 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500 font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{overdueCount} overdue</span>
        </div>
      </div>

    </section>
  );
}
