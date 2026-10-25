import React from 'react';
import { Download } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export default function ReportsView({ stats, onExportExcel }) {
  const {
    totalPipelineValue = 0,
    activeLeads = 0,
    winRate = 0,
    wonValue = 0,
    wonCount = 0
  } = stats?.metrics || {};

  const stageDistribution = stats?.stageDistribution || [];
  const sourceBreakdown = stats?.sourceBreakdown || [];

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
            Sales &amp; Pipeline Performance Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time conversion metrics, deal volume, and lead acquisition breakdown
          </p>
        </div>

        <button
          onClick={onExportExcel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Master Excel (.xlsx)</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-400 block font-semibold">Total Revenue Closed</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-['Outfit'] mt-1 block">
            {formatINR(wonValue)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">{wonCount} deals won</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-400 block font-semibold">Overall Win Rate</span>
          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-['Outfit'] mt-1 block">
            {winRate}%
          </span>
          <span className="text-xs text-slate-500 mt-1 block">{wonCount} won of {activeLeads + wonCount} opportunities</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-400 block font-semibold">Active Unclosed Pipeline</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-['Outfit'] mt-1 block">
            {formatINR(totalPipelineValue)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">{activeLeads} prospective deals</span>
        </div>
      </div>

      {/* Breakdown by Stages Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden p-5">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-['Outfit'] mb-3">
          Pipeline Funnel Breakdown by Stage
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Stage</th>
                <th className="py-2.5 px-4">Leads Count</th>
                <th className="py-2.5 px-4">Share (%)</th>
                <th className="py-2.5 px-4 text-right">Aggregate Deal Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stageDistribution.map((item) => (
                <tr key={item.stage} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{item.stage}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.count}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.percentage}%</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                    {formatINR(item.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acquisition Sources */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-5">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-['Outfit'] mb-3">
          Lead Inflow by Acquisition Source
        </h3>

        {sourceBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400">No source data recorded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {sourceBreakdown.map((src) => (
              <div
                key={src.source}
                className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 text-center"
              >
                <span className="text-[11px] text-slate-400 block font-medium">{src.source}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                  {src.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
