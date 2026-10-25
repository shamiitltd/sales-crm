import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  LogOut,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function GoogleDriveSyncModal({
  isOpen,
  onClose,
  onExportExcel,
  token
}) {
  const { googleDrive, refreshDriveStatus } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  if (!isOpen) return null;

  const isConnected = Boolean(googleDrive?.isConnected);
  const connectedEmail = googleDrive?.email || googleDrive?.googleEmail;
  const lastSynced = googleDrive?.lastSyncedAt
    ? new Date(googleDrive.lastSyncedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;

  const handleConnect = async () => {
    setLoading(true);
    setSyncMessage(null);
    try {
      // First attempt to obtain OAuth consent URL via authenticated API
      const res = await api.getGoogleAuthUrl(token);
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      // Fallback: direct browser navigation with user token query param
      window.location.href = api.getGoogleAuthDirectUrl(token);
    } catch (err) {
      console.warn('Direct OAuth URL fetch error, redirecting directly:', err.message);
      // Fallback direct browser redirect
      window.location.href = api.getGoogleAuthDirectUrl(token);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.syncGoogleNow(token);
      if (res.success) {
        setSyncMessage({
          type: 'success',
          text: `Auto-synchronized! File "${res.fileName || 'Sales_Pipeline_Master.xlsx'}" successfully updated in Google Drive.`,
          link: res.webViewLink
        });
        await refreshDriveStatus();
      } else {
        setSyncMessage({
          type: 'error',
          text: res.error || 'Failed to sync with Google Drive.'
        });
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: err.message || 'Google Drive sync request failed. Please check network connection or re-authenticate.'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    setLoading(true);
    try {
      await api.disconnectGoogle(token);
      await refreshDriveStatus();
      setShowDisconnectConfirm(false);
      setSyncMessage({
        type: 'info',
        text: 'Google Drive account disconnected. Automatic pipeline backups have been paused.'
      });
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: err.message || 'Failed to disconnect from Google Drive.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                Google Drive Automated Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                User-specific OAuth2 &amp; debounced Excel pipeline sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {/* Status Feedback Banner */}
          {syncMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                syncMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : syncMessage.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                  : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              }`}
            >
              {syncMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />}
              {syncMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />}
              {syncMessage.type === 'info' && <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />}
              <div className="flex-1">
                <p className="leading-relaxed font-medium">{syncMessage.text}</p>
                {syncMessage.link && (
                  <a
                    href={syncMessage.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold underline mt-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                  >
                    <span>Open Sales_Pipeline_Master.xlsx in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Connection Overview Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Connection Status
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected ({connectedEmail || 'Active Account'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Not Connected
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium">Target Folder:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                  Sales CRM - SHAMIIT LLP
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium">Master File:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  Sales_Pipeline_Master.xlsx
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium">Auto-Sync Behavior:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  5s Debounced Auto-Overwrite
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium">Last Synced:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {lastSynced || (isConnected ? 'Synchronizing...' : 'Not synced yet')}
                </span>
              </div>
            </div>
          </div>

          {/* Disconnect Confirmation State */}
          {showDisconnectConfirm && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-xs space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <p className="font-semibold leading-relaxed">
                  Disconnect Google Drive? Automated backups to <span className="font-bold underline">Sales CRM - SHAMIIT LLP</span> will stop until you reconnect.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  disabled={loading}
                  className="px-3 py-1 rounded-lg font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDisconnect}
                  disabled={loading}
                  className="px-3.5 py-1 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Confirm Disconnect</span>
                </button>
              </div>
            </div>
          )}

          {/* Technical Feature Highlights */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              Automated Pipeline Backup Engine
            </h4>
            <p className="leading-relaxed">
              Whenever you create, update, or transition a lead, SHAMIIT CRM automatically regenerates a multi-sheet Excel workbook (Sales Pipeline, Activity History, and Executive Summary) and updates your private Google Drive master file with a 5-second debounce.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-xs"
            title="Download offline Excel workbook directly"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Download .xlsx</span>
          </button>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                {!showDisconnectConfirm && (
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    disabled={loading || syncing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
                <button
                  onClick={handleManualSync}
                  disabled={loading || syncing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition cursor-pointer disabled:opacity-60"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
