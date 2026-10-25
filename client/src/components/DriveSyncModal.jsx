import React from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  Key,
  FileSpreadsheet,
  CloudUpload,
  Loader2
} from 'lucide-react';

export default function DriveSyncModal({
  isOpen,
  onClose,
  syncStatus,
  onSyncNow,
  syncLoading,
  lastSyncResult
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Google Drive Automated Excel Export
              </h2>
              <p className="text-xs text-slate-400">
                Service Account configuration &amp; automated sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Credentials Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${syncStatus?.credentialsConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                <Key className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-300 block">Service Account Key</span>
                {syncStatus?.credentialsConfigured ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Detected ({syncStatus.credentialsPath || 'credentials.json'})
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Missing credentials.json
                  </span>
                )}
              </div>
            </div>

            {/* Folder ID Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${syncStatus?.folderIdConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-300 block">Target Drive Folder</span>
                {syncStatus?.folderIdConfigured ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Configured in .env
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Folder ID Needed
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Last Sync Info if available */}
          {lastSyncResult && lastSyncResult.success && (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Successfully Synced to Google Drive!</span>
                </div>
                {lastSyncResult.webViewLink && (
                  <a
                    href={lastSyncResult.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 underline"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-slate-400 mt-1">
                File: <code className="text-emerald-200">{lastSyncResult.fileName}</code> &bull; Synced {lastSyncResult.recordCount} rows at {new Date(lastSyncResult.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* Quick Setup Instructions */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              Quick Setup Guide (3 Simple Steps):
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
              <li>
                Download your Google Service Account key JSON file and place it at <code className="text-indigo-300">server/credentials.json</code>.
              </li>
              <li>
                Create a folder in Google Drive and share edit access with your service account email (e.g. <code className="text-indigo-300">xxx@yyy.iam.gserviceaccount.com</code>).
              </li>
              <li>
                Copy the folder ID from the URL and update <code className="text-indigo-300">GOOGLE_DRIVE_FOLDER_ID</code> in <code className="text-indigo-300">server/.env</code>.
              </li>
            </ol>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Automated overwrite keeps a single up-to-date file
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
            >
              Close
            </button>
            <button
              onClick={onSyncNow}
              disabled={syncLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {syncLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Sync Now</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
