const db = require('../db/database');
const cloudAuthDb = require('../db/cloudAuthDb');
const { syncLeadsToDrive } = require('./driveService');

/**
 * Enterprise In-Process Synchronization Queue & Resilience Engine
 * Provides state machine guarantees, sliding debouncing, concurrency lock, and exponential backoff.
 * Integrated with Remote PostgreSQL authentication and local SQLite sales pipeline.
 */
class SyncQueueService {
  constructor() {
    // Map of userId -> SyncJobState
    this.queues = new Map();
    this.DEBOUNCE_MS = 5000; // 5-second sliding debounce window
    this.MAX_RETRIES = 3;
  }

  /**
   * Retrieve or create job state machine for user
   */
  getJobState(userId) {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, {
        userId,
        state: 'IDLE', // IDLE | QUEUED | PROCESSING | COMPLETED | FAILED | RETRYING
        debounceTimer: null,
        debounceTargetTime: null,
        hasPendingRun: false,
        retryCount: 0,
        retryTimer: null,
        nextRetryAt: null,
        error: null,
        lastSyncedAt: null,
        syncVersion: 1,
        syncedVersion: 0
      });
    }
    return this.queues.get(userId);
  }

  /**
   * Notifies the queue of a local database mutation.
   * Increments sync_version in Remote PostgreSQL and resets the sliding debounce timer.
   */
  async notifyMutation(userId) {
    const job = this.getJobState(userId);

    // 1. Increment sync_version atomically in cloud database & shadow SQLite
    try {
      await cloudAuthDb.incrementSyncVersion(userId);
    } catch (err) {
      console.error(`[SyncQueue] Failed to increment sync_version for user ${userId}:`, err.message);
    }

    const user = await cloudAuthDb.getUserById(userId);
    job.syncVersion = user?.sync_version || (job.syncVersion + 1);

    // If Google Drive is not connected for this user, remain idle
    if (!user || !user.google_tokens) {
      job.state = 'IDLE';
      return job;
    }

    // 2. Concurrency Lock: If upload is actively PROCESSING, queue exactly one subsequent run
    if (job.state === 'PROCESSING') {
      job.hasPendingRun = true;
      console.log(`[SyncQueue] User ${userId} is currently syncing. Queued follow-up run.`);
      return job;
    }

    // 3. Clear existing debounce or retry timers (Sliding window)
    if (job.debounceTimer) {
      clearTimeout(job.debounceTimer);
    }
    if (job.retryTimer) {
      clearTimeout(job.retryTimer);
    }

    job.state = 'QUEUED';
    job.error = null;
    job.debounceTargetTime = Date.now() + this.DEBOUNCE_MS;

    console.log(`[SyncQueue] Scheduled debounced Drive sync for user ${userId} in ${this.DEBOUNCE_MS / 1000}s (v${job.syncVersion})`);

    job.debounceTimer = setTimeout(() => {
      job.debounceTimer = null;
      job.debounceTargetTime = null;
      this.executeSync(userId);
    }, this.DEBOUNCE_MS);

    return job;
  }

  /**
   * Triggers an immediate sync, bypassing debounce window (e.g. manual "Sync Now" button)
   */
  async triggerImmediateSync(userId) {
    const job = this.getJobState(userId);

    if (job.debounceTimer) {
      clearTimeout(job.debounceTimer);
      job.debounceTimer = null;
      job.debounceTargetTime = null;
    }
    if (job.retryTimer) {
      clearTimeout(job.retryTimer);
      job.retryTimer = null;
      job.nextRetryAt = null;
    }

    job.retryCount = 0;
    job.error = null;

    return this.executeSync(userId, true);
  }

  /**
   * Executes the upload with conflict detection, versioning, and exponential backoff
   */
  async executeSync(userId, isManual = false) {
    const job = this.getJobState(userId);

    // If already processing, flag pending run and return
    if (job.state === 'PROCESSING') {
      job.hasPendingRun = true;
      return { inProgress: true, state: 'PROCESSING' };
    }

    const user = await cloudAuthDb.getUserById(userId);

    if (!user || !user.google_tokens) {
      job.state = 'IDLE';
      return { success: false, reason: 'NOT_CONNECTED', error: 'Google Drive is not connected.' };
    }

    const currentVersion = user.sync_version || 1;
    const lastSyncedVersion = user.synced_version || 0;

    // Conflict / Redundancy Check: Skip upload if data has not changed since last sync
    if (!isManual && currentVersion <= lastSyncedVersion) {
      console.log(`[SyncQueue] Version ${currentVersion} already synced to Drive for user ${userId}. Skipping redundant disk/network write.`);
      job.state = 'COMPLETED';
      return { success: true, skipped: true, version: currentVersion };
    }

    // Set State: PROCESSING
    job.state = 'PROCESSING';
    console.log(`[SyncQueue] Running Drive sync for user ${userId} (v${lastSyncedVersion} -> v${currentVersion})...`);

    try {
      const result = await syncLeadsToDrive(userId);

      if (result.success) {
        // Update synced_version in remote database
        await cloudAuthDb.updateSyncedVersion(userId, currentVersion);

        job.state = 'COMPLETED';
        job.syncedVersion = currentVersion;
        job.lastSyncedAt = result.lastSyncedAt;
        job.retryCount = 0;
        job.error = null;

        console.log(`[SyncQueue] Sync completed successfully for user ${userId} (v${currentVersion})`);

        // If another mutation occurred while processing, immediately trigger next sync
        if (job.hasPendingRun) {
          job.hasPendingRun = false;
          console.log(`[SyncQueue] Executing queued follow-up run for user ${userId}...`);
          setImmediate(() => this.executeSync(userId));
        }

        return result;
      } else {
        return this.handleSyncFailure(userId, result.error || result.reason, result);
      }
    } catch (err) {
      return this.handleSyncFailure(userId, err.message, { error: err.message });
    }
  }

  /**
   * Handles failures with exponential backoff and random jitter
   */
  handleSyncFailure(userId, errorMsg, originalResult = {}) {
    const job = this.getJobState(userId);
    const isTransient = this.isTransientError(errorMsg);

    if (isTransient && job.retryCount < this.MAX_RETRIES) {
      job.retryCount += 1;
      job.state = 'RETRYING';

      // Exponential backoff with jitter: (1.5s, 3.0s, 6.0s) + random(200ms - 800ms)
      const baseDelay = 1500 * Math.pow(2, job.retryCount - 1);
      const jitter = Math.floor(Math.random() * 600) + 200;
      const delayMs = baseDelay + jitter;

      job.nextRetryAt = Date.now() + delayMs;
      job.error = `Transient error: ${errorMsg}. Retrying in ${Math.round(delayMs / 1000)}s (attempt ${job.retryCount}/${this.MAX_RETRIES})...`;

      console.warn(`[SyncQueue] User ${userId} sync failed. Scheduled retry #${job.retryCount} in ${delayMs}ms. Error: ${errorMsg}`);

      job.retryTimer = setTimeout(() => {
        job.retryTimer = null;
        job.nextRetryAt = null;
        this.executeSync(userId);
      }, delayMs);

      return {
        success: false,
        state: 'RETRYING',
        retryCount: job.retryCount,
        nextRetryInSeconds: Math.round(delayMs / 1000),
        error: job.error
      };
    }

    // Permanent failure after max retries or fatal error (e.g., token revoked)
    job.state = 'FAILED';
    job.error = errorMsg || 'Synchronization failed after maximum retries.';
    job.retryCount = 0;
    job.nextRetryAt = null;

    console.error(`[SyncQueue] Permanent sync failure for user ${userId}:`, job.error);

    return {
      success: false,
      state: 'FAILED',
      error: errorMsg,
      ...originalResult
    };
  }

  /**
   * Determine if an error is transient (network / rate limit) or fatal (revoked token)
   */
  isTransientError(errMsg) {
    if (!errMsg) return false;
    const msg = String(errMsg).toLowerCase();
    return (
      msg.includes('etimedout') ||
      msg.includes('econnreset') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('backend error')
    );
  }

  /**
   * Returns live sync observability state for client polling
   */
  async getLiveStatus(userId) {
    const job = this.getJobState(userId);
    const user = await cloudAuthDb.getUserById(userId);

    const isConnected = Boolean(user && user.google_tokens);
    const syncVer = user?.sync_version || 1;
    const syncedVer = user?.synced_version || 0;
    const pendingChanges = Math.max(0, syncVer - syncedVer);

    let debounceSecondsRemaining = 0;
    if (job.debounceTargetTime) {
      debounceSecondsRemaining = Math.max(0, Math.ceil((job.debounceTargetTime - Date.now()) / 1000));
    }

    return {
      isConnected,
      email: user?.google_connected_email || null,
      folderId: user?.drive_folder_id || null,
      fileId: user?.drive_sheet_file_id || null,
      lastSyncedAt: user?.drive_last_synced_at || job.lastSyncedAt,
      queueState: job.state, // IDLE | QUEUED | PROCESSING | COMPLETED | FAILED | RETRYING
      syncVersion: syncVer,
      syncedVersion: syncedVer,
      pendingChanges,
      debounceSecondsRemaining,
      retryCount: job.retryCount,
      nextRetryAt: job.nextRetryAt,
      error: job.error
    };
  }
}

// Export singleton instance
const syncQueueService = new SyncQueueService();
module.exports = syncQueueService;
