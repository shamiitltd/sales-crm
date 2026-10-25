import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Building, Plus } from 'lucide-react';
import { formatINR, STAGE_CONFIG } from '../../utils/formatters';

export default function CalendarView({ leads = [], onSelectLead, onOpenAddModal }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map leads by date (YYYY-MM-DD)
  const leadsByDate = {};
  for (const lead of leads) {
    if (lead.next_followup_date) {
      const dateKey = lead.next_followup_date.split(' ')[0];
      if (!leadsByDate[dateKey]) leadsByDate[dateKey] = [];
      leadsByDate[dateKey].push(lead);
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive sales follow-up calendar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-2.5 bg-slate-50 dark:bg-slate-950">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[110px] p-2 bg-slate-50/50 dark:bg-slate-950/30 text-slate-300 dark:text-slate-700 text-xs" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const formattedMonth = String(month + 1).padStart(2, '0');
            const formattedDay = String(dayNum).padStart(2, '0');
            const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

            const dayLeads = leadsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition ${
                  isToday ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {dayLeads.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {dayLeads.length}
                    </span>
                  )}
                </div>

                {/* Day Follow-up Pills */}
                <div className="space-y-1 overflow-y-auto max-h-[75px] scrollbar-none">
                  {dayLeads.slice(0, 3).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => onSelectLead(l)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 truncate hover:border-blue-500 transition block"
                      title={`${l.client_name} - ${l.stage}`}
                    >
                      {l.client_name}
                    </button>
                  ))}
                  {dayLeads.length > 3 && (
                    <span className="text-[9px] text-slate-400 font-medium pl-1">
                      +{dayLeads.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
