import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building,
  Contact,
  Clock,
  Calendar,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Sparkles,
  Trash2
} from 'lucide-react';

export default function Sidebar({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  leadsCount = 0,
  urgentCount = 0
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users, badge: leadsCount > 0 ? String(leadsCount) : null },
    { id: 'companies', label: 'Companies', icon: Building },
    { id: 'contacts', label: 'Contacts', icon: Contact },
    {
      id: 'followups',
      label: 'Follow-ups',
      icon: Clock,
      badge: urgentCount > 0 ? String(urgentCount) : null,
      badgeColor: 'bg-red-500 text-white'
    },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'templates', label: 'Templates', icon: FileSpreadsheet },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'trash', label: 'Archived Trash', icon: Trash2 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit'] tracking-tight leading-tight">
                Sales CRM
              </h1>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-400">
                a product of <span className="font-semibold text-slate-600 dark:text-slate-300">SHAMIIT LLP</span>
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = (currentTab || 'dashboard') === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (onSelectTab) onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badgeColor || (isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Card / Quick Version Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SQLite Active</span>
          </div>
          <span className="text-[10px] font-mono">v2.0 PRO</span>
        </div>
      </aside>
    </>
  );
}
