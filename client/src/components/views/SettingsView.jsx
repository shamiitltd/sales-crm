import React from 'react';
import { Settings, Cloud, User, Key, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsView({ onOpenGoogleModal }) {
  const { user, googleDrive, refreshDriveStatus } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isConnected = Boolean(googleDrive?.isConnected);

  return (
    <div className="space-y-5 animate-in fade-in duration-150 max-w-4xl">
      
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
          CRM &amp; Integration Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage system preferences, user profile, and cloud synchronization
        </p>
      </div>

      {/* 1. Google Drive Cloud Sync Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Google Drive Auto-Sync Integration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Debounced multi-sheet Excel export directly to your Google Drive
              </p>
            </div>
          </div>

          <button
            onClick={onOpenGoogleModal}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            {isConnected ? 'Manage Drive' : 'Connect Drive'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5">Connection Status</span>
            {isConnected ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active ({googleDrive.email || googleDrive.googleEmail || 'Connected'})
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Not Connected
              </span>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block mb-0.5">Sync Mechanism</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              5-Second Debounced Auto-Overwrite
            </span>
          </div>
        </div>
      </div>

      {/* 2. User Account Profile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Active Sales Representative Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Account identity and permissions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Full Name</label>
            <input
              type="text"
              readOnly
              value={user?.name || ''}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Email Address</label>
            <input
              type="text"
              readOnly
              value={user?.email || ''}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Role &amp; Permissions</label>
            <input
              type="text"
              readOnly
              value={user?.role === 'admin' ? 'Administrator' : 'Sales Representative'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold uppercase text-[11px]"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Theme Preference</label>
            <button
              onClick={toggleTheme}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold text-left flex items-center justify-between"
            >
              <span>Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Toggle &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. System & Database Architecture */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Database Engine: SQLite (Local &amp; Fast)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The database is stored locally at <code className="text-blue-600 dark:text-blue-400">server/crm.db</code> with WAL mode enabled. All leads and audit activities are stored securely on your server without third-party database dependencies.
        </p>
      </div>

    </div>
  );
}
