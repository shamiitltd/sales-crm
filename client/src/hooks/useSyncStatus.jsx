import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

/**
 * Enterprise React hook for real-time Google Drive sync observability,
 * sliding debounce indicators, rate-limit backoff, and offline status.
 */
export function useSyncStatus(token, onToast = null) {
  const [syncState, setSyncState] = useState({
    isConnected: false,
    email: null,
    queueState: 'IDLE', // IDLE | QUEUED | PROCESSING | COMPLETED | FAILED | RETRYING
    debounceSecondsRemaining: 0,
    syncVersion: 1,
    syncedVersion: 0,
    pendingChanges: 0,
    retryCount: 0,
    nextRetryAt: null,
    error: null,
    lastSyncedAt: null
  });

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [loading, setLoading] = useState(false);
  const prevStateRef = useRef(null);

  // Monitor browser network online/offline events
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (onToast) {
        onToast('Connection Restored', 'Back online. Processing queued changes...', 'info');
      }
    }
    function handleOffline() {
      setIsOnline(false);
      if (onToast) {
        onToast('Offline Mode Active', 'Changes are saved locally to SQLite and will auto-sync to Drive once reconnected.', 'warning');
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onToast]);

  // Fetch live sync state from server
  const fetchStatus = useCallback(async () => {
    if (!token || !isOnline) return;
    try {
      const data = await api.getSyncStatus(token);
      if (data) {
        setSyncState(data);

        // Toast on state transitions
        if (prevStateRef.current) {
          const prev = prevStateRef.current;
          if (prev.queueState !== 'FAILED' && data.queueState === 'FAILED') {
            if (onToast) onToast('Drive Sync Notice', data.error || 'Sync failed. Click badge to retry.', 'error');
          } else if (prev.queueState === 'PROCESSING' && data.queueState === 'COMPLETED') {
            if (onToast) onToast('Drive Synced', 'Master Excel file updated in Google Drive.', 'success');
          }
        }
        prevStateRef.current = data;
      }
    } catch {
      // Silently catch polling blips
    }
  }, [token, isOnline, onToast]);

  // Intelligent polling: Fast polling (3s) when active/queued, relaxed (15s) when idle
  useEffect(() => {
    if (!token || !isOnline) return;

    fetchStatus();

    const isFastPolling = syncState.queueState === 'QUEUED' ||
                          syncState.queueState === 'PROCESSING' ||
                          syncState.queueState === 'RETRYING';

    const intervalMs = isFastPolling ? 3000 : 15000;
    const timer = setInterval(fetchStatus, intervalMs);

    return () => clearInterval(timer);
  }, [token, isOnline, syncState.queueState, fetchStatus]);

  // Manual Trigger
  const triggerSync = async () => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const res = await api.syncGoogleNow(token);
      await fetchStatus();
      return res;
    } catch (err) {
      if (onToast) onToast('Sync Error', err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Human-readable status pill details
  const getBadgeDetails = () => {
    if (!isOnline) {
      return {
        label: 'Offline (Changes Queued)',
        shortLabel: 'Offline',
        theme: 'offline', // amber/gray
        pulse: false,
        spin: false,
        tooltip: 'Working offline. Changes are stored locally in SQLite and will auto-sync to Drive once internet connectivity is restored.'
      };
    }

    if (!syncState.isConnected) {
      return {
        label: 'Drive Not Connected',
        shortLabel: 'Connect Drive',
        theme: 'disconnected',
        pulse: false,
        spin: false,
        tooltip: 'Google Drive is not connected. Click to link account for automated Excel backups.'
      };
    }

    switch (syncState.queueState) {
      case 'QUEUED':
        return {
          label: syncState.debounceSecondsRemaining > 0
            ? `Saving to Drive in ${syncState.debounceSecondsRemaining}s...`
            : 'Saving to Drive in 5s...',
          shortLabel: 'Queued',
          theme: 'queued', // subtle blue pulse
          pulse: true,
          spin: false,
          tooltip: 'Recent changes queued. Upload will begin automatically once the 5s sliding debounce completes.'
        };

      case 'PROCESSING':
        return {
          label: 'Syncing to Drive...',
          shortLabel: 'Syncing...',
          theme: 'syncing', // blue / spinning
          pulse: false,
          spin: true,
          tooltip: 'Exporting multi-sheet Excel workbook to Google Drive root folder.'
        };

      case 'RETRYING':
        return {
          label: `Retrying Sync (Attempt ${syncState.retryCount}/3)...`,
          shortLabel: 'Retrying',
          theme: 'retrying', // amber pulse
          pulse: true,
          spin: false,
          tooltip: syncState.error || 'Temporary network issue. Retrying with exponential backoff.'
        };

      case 'FAILED':
        return {
          label: 'Sync Failed (Click to retry)',
          shortLabel: 'Sync Failed',
          theme: 'failed', // red
          pulse: false,
          spin: false,
          tooltip: syncState.error || 'Google Drive sync failed. Click to retry.'
        };

      case 'COMPLETED':
      case 'IDLE':
      default:
        return {
          label: syncState.email
            ? `All changes saved & synced (${syncState.email})`
            : 'All changes saved & synced to Drive',
          shortLabel: 'Synced',
          theme: 'synced', // green
          pulse: false,
          spin: false,
          tooltip: `Last synchronized: ${syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}`
        };
    }
  };

  return {
    syncState,
    isOnline,
    loading,
    badge: getBadgeDetails(),
    triggerSync,
    refreshStatus: fetchStatus
  };
}
