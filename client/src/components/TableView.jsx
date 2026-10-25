import React from 'react';
import {
  Phone,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  FileText
} from 'lucide-react';
import {
  formatINR,
  STAGE_CONFIG,
  PRIORITY_CONFIG,
  getFollowupUrgency
} from '../utils/formatters';

export default function TableView({
  leads = [],
  loading = false,
  onSelectLead,
  onQuickStageChange,
  onDeleteLead
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Client &amp; Company</th>
              <th className="px-4 py-3.5">Stage</th>
              <th className="px-4 py-3.5">Deal Value</th>
              <th className="px-4 py-3.5">Priority</th>
              <th className="px-4 py-3.5">Next Follow-up</th>
              <th className="px-4 py-3.5">Tasks</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading sales pipeline...</span>
                  </div>
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No leads found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search keywords.</p>
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const stageMeta = STAGE_CONFIG[lead.stage] || {
                  badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  hex: '#64748B'
                };
                const priorityMeta = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG['Medium'];
                const urgency = getFollowupUrgency(lead.next_followup_date, lead.stage);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150 cursor-pointer group"
                  >
                    {/* Client & Company */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {lead.client_name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                        {lead.company && <span>{lead.company}</span>}
                        {lead.contact_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.contact_number}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stage with Inline Changer */}
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <select
                          value={lead.stage}
                          onChange={(e) => onQuickStageChange(lead.id, e.target.value)}
                          className={`appearance-none font-bold text-xs px-2.5 py-1 pr-6 rounded-full cursor-pointer focus:outline-none ${stageMeta.badge}`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Proposal Sent">Proposal Sent</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Closed Won">Closed Won</option>
                          <option value="Closed Lost">Closed Lost</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>

                    {/* Deal Value */}
                    <td className="px-4 py-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap font-['Outfit']">
                      {formatINR(lead.deal_value)}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${priorityMeta.badge}`}>
                        {lead.priority || 'Medium'}
                      </span>
                    </td>

                    {/* Next Follow-up */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        {urgency.type === 'overdue' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                            Overdue
                          </span>
                        )}
                        {urgency.type === 'today' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            Today
                          </span>
                        )}
                        <span className="text-slate-600 dark:text-slate-400">
                          {lead.next_followup_date || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Tasks progress */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {lead.taskStats?.total > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{lead.taskStats.completed}/{lead.taskStats.total}</span>
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Open lead details & timeline"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteLead(lead)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Delete lead"
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

      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Showing {leads.length} leads in active pipeline</span>
        <span>SHAMIIT LLP Sales CRM Engine</span>
      </div>
    </div>
  );
}
