import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Download,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const BREADCRUMB_MAP = {
  dashboard: { parent: 'Overview', page: 'Dashboard' },
  leads: { parent: 'Pipeline', page: 'Leads Management' },
  companies: { parent: 'Directory', page: 'Companies' },
  contacts: { parent: 'Directory', page: 'Contacts' },
  followups: { parent: 'Action Center', page: 'Scheduled Follow-ups' },
  calendar: { parent: 'Schedule', page: 'Follow-up Calendar' },
  templates: { parent: 'Toolkit', page: 'Sales Outreach Templates' },
  reports: { parent: 'Analytics', page: 'Performance Reports' },
  trash: { parent: 'Archive', page: 'Archived Trash' },
  settings: { parent: 'Preferences', page: 'CRM & OAuth Settings' }
};

export default function Header({
  currentTab = 'dashboard',
  onToggleMobileSidebar,
  onOpenGoogleModal,
  onExportExcel,
  onOpenAuthModal,
  syncBadge = null
}) {
  const { isDark, toggleTheme } = useTheme();
  const { user, googleDrive, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDriveConnected = Boolean(googleDrive?.isConnected);
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'User Account');

  const breadcrumb = BREADCRUMB_MAP[currentTab] || BREADCRUMB_MAP.dashboard;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-400">
          <span>{breadcrumb.parent}</span>
          <span className="text-slate-300 dark:text-slate-600">&gt;</span>
          <span className="text-slate-900 dark:text-slate-100 font-bold">{breadcrumb.page}</span>
        </div>
      </div>

      {/* Right: Actions, Theme Toggle & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        
        {/* Real-time Drive Sync Observability Status Badge */}
        {(() => {
          if (syncBadge) {
            const themeClasses = {
              synced: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
              queued: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/40',
              syncing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
              retrying: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40',
              failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-900/40',
              offline: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
              disconnected: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/60'
            };

            const activeClass = themeClasses[syncBadge.theme] || themeClasses.disconnected;

            return (
              <button
                onClick={onOpenGoogleModal}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer shadow-2xs ${activeClass}`}
                title={syncBadge.tooltip}
              >
                {syncBadge.spin ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : syncBadge.theme === 'synced' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </>
                ) : syncBadge.theme === 'queued' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </>
                ) : syncBadge.theme === 'retrying' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
                  </>
                ) : syncBadge.theme === 'failed' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <Cloud className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                  </>
                )}
                <span className="hidden sm:inline">{syncBadge.label}</span>
                <span className="sm:hidden">{syncBadge.shortLabel}</span>
              </button>
            );
          }

          // Fallback if syncBadge hook not yet loaded
          const driveEmail = googleDrive?.email || googleDrive?.googleEmail;
          const displayEmail = driveEmail ? (driveEmail.length > 20 ? `${driveEmail.slice(0, 18)}...` : driveEmail) : null;

          return (
            <button
              onClick={onOpenGoogleModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                isDriveConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isDriveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <Cloud className="w-3.5 h-3.5" />
              <span>{isDriveConnected ? `Drive Connected (${displayEmail || 'Active'})` : 'Drive Not Connected'}</span>
            </button>
          );
        })()}

        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-180 duration-200" />
          )}
        </button>

        {/* User Profile Pill / Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            {/* Avatar matching screenshot */}
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {userInitial}
            </div>

            <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-200">
              {displayName}
            </span>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{user?.name || (user?.email ? user.email.split('@')[0] : 'Account')}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{user?.email || 'Not signed in'}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {user?.role || 'User'}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenGoogleModal();
                  }}
                  className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-500" />
                  <span>Google Drive OAuth Settings</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onExportExcel();
                  }}
                  className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Export Master Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-purple-500" />
                  <span>Switch Account / Sign In</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                    onOpenAuthModal();
                  }}
                  className="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}
