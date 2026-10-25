import React, { useState, useMemo } from 'react';
import { Clock, Calendar, CheckCircle2, Phone, CalendarPlus, Check } from 'lucide-react';
import { formatINR, STAGE_CONFIG, getFollowupUrgency } from '../../utils/formatters';

export default function FollowupsView({ leads = [], onSelectLead, onUpdateLead }) {
  const [filterType, setFilterType] = useState('urgent'); // 'all' | 'urgent' | 'today' | 'upcoming'
  const [rescheduleLeadId, setRescheduleLeadId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter only active leads with scheduled follow-up dates
  const activeFollowups = useMemo(() => {
    return leads.filter((l) => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost' && l.next_followup_date);
  }, [leads]);

  const filteredFollowups = useMemo(() => {
    if (filterType === 'urgent') {
      // Overdue or today
      return activeFollowups.filter((l) => l.next_followup_date <= todayStr);
    }
    if (filterType === 'today') {
      return activeFollowups.filter((l) => l.next_followup_date === todayStr);
    }
    if (filterType === 'upcoming') {
      return activeFollowups.filter((l) => l.next_followup_date > todayStr);
    }
    return activeFollowups;
  }, [activeFollowups, filterType, todayStr]);

  const handleSaveReschedule = async (leadId) => {
    if (!rescheduleDate) return;
    try {
      await onUpdateLead(leadId, { next_followup_date: rescheduleDate });
      setRescheduleLeadId(null);
    } catch (e) {
      console.error('Reschedule failed:', e);
    }
  };

  const handleQuickCloseWon = async (leadId) => {
    try {
      await onUpdateLead(leadId, { stage: 'Closed Won' });
    } catch (e) {
      console.error('Close Won failed:', e);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
            Sales Follow-ups &amp; Action Cadence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeFollowups.length} scheduled follow-up{activeFollowups.length === 1 ? '' : 's'} across active pipeline
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setFilterType('urgent')}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === 'urgent'
                ? 'bg-red-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ⚡ Urgent &amp; Overdue
          </button>
          <button
            onClick={() => setFilterType('today')}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === 'today'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Today's Calls
          </button>
          <button
            onClick={() => setFilterType('upcoming')}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === 'upcoming'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md transition ${
              filterType === 'all'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Active
          </button>
        </div>
      </div>

      {/* Follow-up Cards */}
      {filteredFollowups.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No follow-ups in this filter</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All caught up! Add a new lead or schedule a follow-up date to see reminders here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFollowups.map((item) => {
            const urgency = getFollowupUrgency(item.next_followup_date, item.stage);
            const stageConfig = STAGE_CONFIG[item.stage] || STAGE_CONFIG['New'];

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      onClick={() => onSelectLead(item)}
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600 transition cursor-pointer"
                    >
                      {item.client_name}
                    </h3>
                    {item.company && (
                      <span className="text-xs text-slate-400">&bull; {item.company}</span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageConfig.badge}`}>
                      {item.stage}
                    </span>
                    {urgency.type === 'overdue' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                        Overdue
                      </span>
                    )}
                    {urgency.type === 'today' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        Today
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                    "{item.notes || 'No notes logged.'}"
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                      Deal: {formatINR(item.deal_value)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Scheduled: {item.next_followup_date}
                    </span>
                    {item.contact_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {item.contact_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {rescheduleLeadId === item.id ? (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg">
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="text-xs bg-transparent text-slate-900 dark:text-white px-2 py-1 focus:outline-none dark:[color-scheme:dark] cursor-pointer"
                      />
                      <button
                        onClick={() => handleSaveReschedule(item.id)}
                        className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                        title="Save new date"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRescheduleLeadId(null)}
                        className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRescheduleLeadId(item.id);
                        setRescheduleDate(item.next_followup_date || todayStr);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-blue-500" />
                      <span>Reschedule</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleQuickCloseWon(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Won</span>
                  </button>

                  <button
                    onClick={() => onSelectLead(item)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    Details &rarr;
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
