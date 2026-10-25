import React from 'react';
import { Search, Plus, LayoutGrid, Table as TableIcon } from 'lucide-react';
import CustomSelect from './ui/CustomSelect';

const FILTER_STAGE_OPTIONS = [
  { value: 'All Stages', label: 'All Stages' },
  { value: 'New', label: 'New', badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' },
  { value: 'Contacted', label: 'Contacted', badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' },
  { value: 'Proposal Sent', label: 'Proposal Sent', badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
  { value: 'Negotiation', label: 'Negotiation', badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' },
  { value: 'Closed Won', label: 'Closed Won', badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
  { value: 'Closed Lost', label: 'Closed Lost', badgeClass: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300' }
];

export default function FilterBar({
  searchTerm,
  setSearchTerm,
  selectedStage,
  setSelectedStage,
  selectedPriority,
  setSelectedPriority,
  viewMode,
  setViewMode,
  onOpenAddModal
}) {
  const priorities = ['All', 'High', 'Medium', 'Low'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 mb-6 shadow-xs transition-colors duration-200">
      
      {/* Left: Search & Stage dropdown */}
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search client, company, phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Custom Stage Filter Dropdown */}
        <div className="w-44">
          <CustomSelect
            value={selectedStage}
            onChange={setSelectedStage}
            options={FILTER_STAGE_OPTIONS}
          />
        </div>
      </div>

      {/* Middle: Priority Filter Pills */}
      <div className="flex items-center gap-1.5">
        {priorities.map((p) => {
          const isSelected = selectedPriority === p;
          let colorClasses = '';

          if (p === 'All') {
            colorClasses = isSelected
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800';
          } else if (p === 'High') {
            colorClasses = isSelected
              ? 'bg-red-600 text-white border-red-600'
              : 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30';
          } else if (p === 'Medium') {
            colorClasses = isSelected
              ? 'bg-amber-500 text-white border-amber-500'
              : 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30';
          } else if (p === 'Low') {
            colorClasses = isSelected
              ? 'bg-slate-600 text-white border-slate-600'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800';
          }

          return (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${colorClasses}`}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Right: View Switcher (Kanban | Table) & Add Lead Button */}
      <div className="flex items-center gap-2.5">
        
        {/* View Switcher Pill */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
        </div>

        {/* Add Lead Primary Button matching screenshot */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Lead</span>
        </button>

      </div>

    </div>
  );
}
