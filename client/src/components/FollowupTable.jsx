import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  CalendarPlus,
  Check,
  FileText
} from 'lucide-react';
import {
  formatINR,
  STATUS_CONFIG,
  getFollowupUrgency
} from '../utils/formatters';

const STATUS_OPTIONS = [
  'All',
  'Pending Today',
  'New',
  'In Discussion',
  'Follow-up Scheduled',
  'Closed Won',
  'Closed Lost'
];

export default function FollowupTable({
  followups = [],
  loading = false,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onEdit,
  onDelete,
  onQuickStatusChange,
  onQuickReschedule
}) {
  const [rescheduleTargetId, setRescheduleTargetId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  // Helper for quick rescheduling
  const handleOpenReschedule = (item) => {
    setRescheduleTargetId(item.id);
    setRescheduleDate(item.followup_date || new Date().toISOString().split('T')[0]);
  };

  const handleApplyReschedule = (id) => {
    if (rescheduleDate) {
      onQuickReschedule(id, rescheduleDate);
    }
    setRescheduleTargetId(null);
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm overflow-hidden">
      
      {/* Table Toolbar: Search, Filters, and Sorting */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/40">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client, email, phone, or notes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Tabs / Dropdown & Sorting */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'Pending Today' ? '⚡ Pending Today' : status}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Select */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/60 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none py-1 cursor-pointer"
            >
              <option value="followup_date" className="bg-slate-900">Follow-up Date</option>
              <option value="deal_value" className="bg-slate-900">Deal Value</option>
              <option value="client_name" className="bg-slate-900">Client Name</option>
              <option value="created_at" className="bg-slate-900">Date Added</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="ml-1 text-[11px] font-semibold uppercase text-indigo-400 hover:text-indigo-300 px-1 py-0.5 rounded cursor-pointer"
              title="Toggle sort direction"
            >
              {sortOrder === 'asc' ? 'ASC' : 'DESC'}
            </button>
          </div>

        </div>

      </div>

      {/* Follow-ups Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3.5 px-4 sm:px-6">Client &amp; Contact</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Deal Value</th>
              <th className="py-3.5 px-4">Follow-up Date</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Notes &amp; Details</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading follow-ups...</span>
                  </div>
                </td>
              </tr>
            ) : followups.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">No follow-ups found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || statusFilter !== 'All'
                        ? 'Try clearing your search query or changing the status filter.'
                        : 'Get started by creating your first sales follow-up record.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              followups.map((item) => {
                const statusMeta = STATUS_CONFIG[item.lead_status] || {
                  bg: 'bg-slate-500/10',
                  border: 'border-slate-500/30',
                  text: 'text-slate-400',
                  dot: 'bg-slate-400'
                };
                const urgency = getFollowupUrgency(item.followup_date, item.lead_status);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    
                    {/* Client & Contact */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                        {item.client_name}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                        {item.contact_number && (
                          <span className="flex items-center gap-1 hover:text-slate-300">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.contact_number}
                          </span>
                        )}
                        {item.email && (
                          <span className="flex items-center gap-1 hover:text-slate-300">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {item.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Dropdown/Badge */}
                    <td className="py-4 px-4">
                      <div className="relative inline-block">
                        <select
                          value={item.lead_status}
                          onChange={(e) => onQuickStatusChange(item.id, e.target.value)}
                          className={`appearance-none font-semibold text-xs px-2.5 py-1 pr-6 rounded-full border transition cursor-pointer focus:outline-none ${statusMeta.bg} ${statusMeta.border} ${statusMeta.text}`}
                        >
                          <option value="New" className="bg-slate-900 text-sky-400">New</option>
                          <option value="In Discussion" className="bg-slate-900 text-indigo-400">In Discussion</option>
                          <option value="Follow-up Scheduled" className="bg-slate-900 text-amber-400">Follow-up Scheduled</option>
                          <option value="Closed Won" className="bg-slate-900 text-emerald-400">Closed Won</option>
                          <option value="Closed Lost" className="bg-slate-900 text-rose-400">Closed Lost</option>
                        </select>
                        <ChevronDown className={`w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${statusMeta.text}`} />
                      </div>
                    </td>

                    {/* Deal Value */}
                    <td className="py-4 px-4 font-semibold text-white whitespace-nowrap">
                      {formatINR(item.deal_value)}
                    </td>

                    {/* Follow-up Date & Urgency badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {urgency.type === 'today' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <Clock className="w-3 h-3" />
                            Today
                          </span>
                        )}
                        {urgency.type === 'overdue' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <AlertCircle className="w-3 h-3" />
                            {urgency.label}
                          </span>
                        )}
                        {urgency.type === 'tomorrow' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            Tomorrow
                          </span>
                        )}
                        <span className="text-slate-300 text-xs">
                          {item.followup_date || '—'}
                        </span>
                      </div>

                      {/* Reschedule Shortcut Popover */}
                      {rescheduleTargetId === item.id ? (
                        <div className="mt-2 flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-700 rounded-lg">
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="bg-transparent text-xs text-white px-1.5 py-0.5 focus:outline-none"
                          />
                          <button
                            onClick={() => handleApplyReschedule(item.id)}
                            className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px]"
                            title="Save new date"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setRescheduleTargetId(null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null}
                    </td>

                    {/* Notes */}
                    <td className="py-4 px-4 max-w-xs truncate hidden md:table-cell text-slate-400 text-xs" title={item.notes}>
                      {item.notes || '—'}
                    </td>

                    {/* Quick Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Mark Won Shortcut (if not already won) */}
                        {item.lead_status !== 'Closed Won' && (
                          <button
                            onClick={() => onQuickStatusChange(item.id, 'Closed Won')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                            title="Quick mark as Closed Won"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Quick Reschedule */}
                        <button
                          onClick={() => handleOpenReschedule(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                          title="Reschedule follow-up date"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>

                        {/* Edit Record */}
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                          title="Edit follow-up record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Record */}
                        <button
                          onClick={() => onDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete follow-up record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
        <span>Showing {followups.length} record{followups.length === 1 ? '' : 's'}</span>
        <span className="text-[11px] text-slate-400">SHAMIIT LLP Enterprise Sales CRM</span>
      </div>

    </div>
  );
}
