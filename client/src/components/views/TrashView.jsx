import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Loader2, Building, Phone, Mail, Calendar } from 'lucide-react';
import { api } from '../../services/api';

export default function TrashView({ token, onRestoreSuccess, onPermanentDeleteSuccess, onToast }) {
  const [trashLeads, setTrashLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchTrash = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getTrashLeads(token);
      setTrashLeads(data || []);
    } catch (err) {
      if (onToast) onToast('Trash Error', err.message || 'Failed to load archived leads.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, onToast]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (id, clientName) => {
    setActionId(id);
    try {
      await api.restoreLead(id, token);
      setTrashLeads((prev) => prev.filter((l) => l.id !== id));
      if (onToast) onToast('Lead Restored', `"${clientName}" restored back to active pipeline`, 'success');
      if (onRestoreSuccess) onRestoreSuccess();
    } catch (err) {
      if (onToast) onToast('Restore Failed', err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  const handlePermanentDelete = async (id, clientName) => {
    if (!window.confirm(`Permanently purge "${clientName}" from SQLite database? This action cannot be undone.`)) {
      return;
    }

    setActionId(id);
    try {
      await api.permanentDeleteLead(id, token);
      setTrashLeads((prev) => prev.filter((l) => l.id !== id));
      if (onToast) onToast('Purged', `Permanently deleted "${clientName}"`, 'info');
      if (onPermanentDeleteSuccess) onPermanentDeleteSuccess();
    } catch (err) {
      if (onToast) onToast('Purge Failed', err.message, 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
              Archived &amp; Soft-Deleted Leads
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Soft-deleted records are excluded from active pipeline metrics and Google Drive sheets. You can restore them anytime or purge permanently.
          </p>
        </div>

        <button
          onClick={fetchTrash}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          Refresh Trash
        </button>
      </div>

      {/* Body List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs font-semibold">Loading archived leads...</p>
        </div>
      ) : trashLeads.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <Trash2 className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Trash is empty</p>
          <p className="text-xs text-slate-400 mt-0.5">No soft-deleted leads found in your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {trashLeads.map((lead) => {
            const isProcessing = actionId === lead.id;
            const deletedDate = lead.deleted_at
              ? new Date(lead.deleted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
              : 'Unknown';

            return (
              <div
                key={lead.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {lead.client_name}
                    </h3>
                    {lead.company && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{lead.company}</span>
                      </p>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {lead.stage}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  {lead.contact_number && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{lead.contact_number}</span>
                    </p>
                  )}
                  {lead.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{lead.email}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-[11px] text-red-500/90 pt-1">
                    <Calendar className="w-3 h-3" />
                    <span>Archived on: {deletedDate}</span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleRestore(lead.id, lead.client_name)}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(lead.id, lead.client_name)}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Purge</span>
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
