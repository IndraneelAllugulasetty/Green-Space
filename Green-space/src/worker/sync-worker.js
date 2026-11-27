// src/worker/sync-worker.js
// Background Synchronization Worker executing the 12-step synchronization lifecycle

const config = require('../config');
const { SourceError } = require('../adapters/source-adapter');

class SyncWorker {
  constructor({ jobQueue, parcelRepository, versioningService, cacheService, adapterRegistry }) {
    this.jobQueue = jobQueue;
    this.parcelRepo = parcelRepository;
    this.versioningService = versioningService;
    this.cacheService = cacheService;
    this.adapterRegistry = adapterRegistry;
    this.isRunning = false;

    this.bindQueueEvents();
  }

  bindQueueEvents() {
    this.jobQueue.on('job:started', async (job) => {
      await this.processJob(job);
    });
  }

  start() {
    this.isRunning = true;
    console.log('[WORKER] Synchronization worker started and listening for jobs.');
    this.jobQueue.resume();
  }

  stop() {
    this.isRunning = false;
    this.jobQueue.pause();
    console.log('[WORKER] Synchronization worker paused.');
  }

  /**
   * Executes the 12-step synchronization lifecycle:
   * 1. Receive job
   * 2. Deduplication check (handled at queue enqueue and lock)
   * 3. Acquire synchronization lock
   * 4. Retrieve data from authorized source adapter
   * 5. Validate and normalize returned data
   * 6. Compare normalized record with latest stored version
   * 7. Persist changes transactionally
   * 8. Update verification metadata if unchanged
   * 9. Invalidate / update Redis cache
   * 10. Record synchronization outcome
   * 11. Release lock
   * 12. Retry recoverable failures using bounded policy
   */
  async processJob(job) {
    const startedAt = new Date().toISOString();
    const { parcelId, parcelParams, sourceId, triggerType, retryCount } = job;
    let lockToken = null;

    try {
      // Step 3: Obtain synchronization lock with lease expiration
      lockToken = await this.cacheService.acquireSyncLock(parcelId, sourceId, config.sync.lockTtlSeconds);
      if (!lockToken) {
        console.warn(`[WORKER] Could not acquire lock for parcel ${parcelId}. Job already running or locked.`);
        this.jobQueue.failJob(job.id, new Error('Lock acquisition failed: another sync is in progress'), false);
        return;
      }

      // Step 4: Retrieve data from authorized source adapter
      const adapter = this.adapterRegistry.get(sourceId);
      if (!adapter) {
        throw new SourceError(`Data source adapter '${sourceId}' is not registered or disabled`, 'INTERNAL', 500);
      }

      const fetchResult = await adapter.fetchParcel(parcelParams);

      // Steps 5, 6, 7, 8, 9: Normalize, Compare, Persist transactionally, Invalidate cache
      const versionResult = await this.versioningService.processFetchedData({
        parcelParams,
        fetchResult,
        actor: `WORKER_JOB:${job.id}`
      });

      // Step 10: Record successful synchronization attempt
      this.parcelRepo.recordSyncAttempt({
        parcelId,
        sourceId,
        triggerType,
        startedAt,
        completedAt: new Date().toISOString(),
        status: 'SUCCESS',
        retryCount,
        dataChanged: versionResult.dataChanged,
        previousVersionId: versionResult.previousVersionId || null,
        newVersionId: versionResult.versionId
      });

      // Complete job in queue
      this.jobQueue.completeJob(job.id, versionResult);

    } catch (err) {
      const isRecoverable = this.isRecoverableError(err);
      const willRetry = isRecoverable && retryCount < config.sync.maxRetries;

      console.error(`[WORKER] Sync failed for parcel ${parcelId} (Attempt ${retryCount + 1}/${config.sync.maxRetries + 1}):`, err.message);

      // Record failure attempt in database
      this.parcelRepo.recordSyncAttempt({
        parcelId,
        sourceId,
        triggerType,
        startedAt,
        completedAt: new Date().toISOString(),
        status: 'FAILED',
        retryCount,
        errorCategory: err.category || 'INTERNAL',
        errorMessage: err.message,
        dataChanged: false
      });

      // Step 12: Bounded retry policy with exponential backoff
      if (willRetry) {
        const nextRetry = retryCount + 1;
        const delayMs = config.sync.retryBaseDelayMs * Math.pow(2, retryCount);

        this.jobQueue.failJob(job.id, err, true);

        setTimeout(() => {
          console.log(`[WORKER] Retrying sync job for parcel ${parcelId} (Retry #${nextRetry}) after ${delayMs}ms delay...`);
          this.jobQueue.enqueue({
            parcelId,
            parcelParams,
            sourceId,
            triggerType,
            priority: job.priority,
            retryCount: nextRetry
          });
        }, delayMs);
      } else {
        this.jobQueue.failJob(job.id, err, false);
      }
    } finally {
      // Step 11: Release lock
      if (lockToken) {
        await this.cacheService.releaseSyncLock(parcelId, sourceId, lockToken);
      }
    }
  }

  isRecoverableError(err) {
    if (err instanceof SourceError) {
      return ['TIMEOUT', 'SOURCE_UNAVAILABLE', 'RATE_LIMITED'].includes(err.category);
    }
    // Generic transient network errors
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      return true;
    }
    return false;
  }
}

module.exports = SyncWorker;
