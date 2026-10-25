import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { formatCompactINR, formatINR } from '../utils/formatters';

const STAGE_COLORS = {
  'New': '#2563EB',
  'Contacted': '#8B5CF6',
  'Proposal Sent': '#F97316',
  'Negotiation': '#F59E0B',
  'Closed Won': '#10B981'
};

// Custom Tooltip for Stage Distribution
function StageTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs text-white backdrop-blur-md">
        <p className="font-bold flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[data.stage] || '#3B82F6' }} />
          <span>{data.stage}</span>
        </p>
        <p className="text-slate-300">
          Leads: <strong className="text-white">{data.count}</strong> ({data.percentage}%)
        </p>
        <p className="text-slate-300">
          Value: <strong className="text-emerald-400">{formatINR(data.value)}</strong>
        </p>
      </div>
    );
  }
  return null;
}

// Custom Tooltip matching reference screenshot mockup:
// "Oct 2025 \n Inflow: ₹12,50,000 \n Won: ₹8,40,000"
function InflowTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs text-white">
        <p className="font-bold text-slate-200 mb-1.5 pb-1 border-b border-slate-800">
          {label} 2025
        </p>
        <div className="space-y-1">
          <p className="flex justify-between gap-4">
            <span className="text-blue-400 font-medium">Inflow:</span>
            <span className="font-bold">{formatINR(data.inflow)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-emerald-400 font-medium">Won:</span>
            <span className="font-bold">{formatINR(data.won)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export default function ChartsSection({ stageDistribution = [], monthlyTrend = [] }) {
  const { isDark } = useTheme();

  // Dynamic tokens for Recharts elements
  const gridStroke = isDark ? '#1E293B' : '#F1F5F9';
  const axisColor = isDark ? '#94A3B8' : '#64748B';

  const hasStageData = stageDistribution.some((s) => s.count > 0);
  const hasMonthlyData = monthlyTrend.length > 0 && monthlyTrend.some((m) => m.inflow > 0 || m.won > 0);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
      
      {/* 1. Left Chart: Pipeline Stage Distribution (Horizontal Bar Chart) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
            Pipeline Stage Distribution
          </h3>
          <span className="text-[11px] font-medium text-slate-400">
            Real-time Funnel
          </span>
        </div>

        <div className="h-64 w-full">
          {hasStageData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stageDistribution}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis
                  type="number"
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="stage"
                  type="category"
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={95}
                />
                <Tooltip content={<StageTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                  {stageDistribution.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={STAGE_COLORS[entry.stage] || '#3B82F6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="font-semibold text-slate-600 dark:text-slate-300">No leads in pipeline</span>
              <span className="text-[11px] mt-1">Stage distribution bars will appear once leads are added.</span>
            </div>
          )}
        </div>

        {/* Breakdown Summary */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          {stageDistribution.map((item) => (
            <div key={item.stage} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[item.stage] || '#3B82F6' }} />
              <span className="font-medium text-slate-700 dark:text-slate-300">{item.stage}:</span>
              <span>{item.count} ({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Right Chart: Monthly Deal Inflow vs Won Revenue */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
            Monthly Deal Inflow vs Won Revenue
          </h3>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Deal Inflow</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Won Revenue</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          {hasMonthlyData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val === 0) return '0';
                    return `${(val / 100000).toFixed(0)}L`;
                  }}
                />
                <Tooltip content={<InflowTooltip />} />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  name="Deal Inflow"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#inflowGrad)"
                  dot={{ r: 3, fill: '#3B82F6', strokeWidth: 1.5, stroke: isDark ? '#0F172A' : '#FFFFFF' }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="won"
                  name="Won Revenue"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#wonGrad)"
                  dot={{ r: 3, fill: '#10B981', strokeWidth: 1.5, stroke: isDark ? '#0F172A' : '#FFFFFF' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="font-semibold text-slate-600 dark:text-slate-300">No monthly revenue trends yet</span>
              <span className="text-[11px] mt-1">Deal values and won conversions will plot automatically over time.</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Target Revenue Tracking</span>
          <span className="font-semibold text-slate-500 dark:text-slate-400">Auto-calculated from leads</span>
        </div>
      </div>

    </section>
  );
}
