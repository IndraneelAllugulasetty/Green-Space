// src/worker/job-queue.js
// Asynchronous Job Queue with in-flight deduplication, priority, and bounded retries

const EventEmitter = require('node:events');
const crypto = require('node:crypto');
const config = require('../config');

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || config.sync.concurrency;
    this.queue = [];
    this.activeJobs = new Map(); // jobId -> job
    this.pendingParcelJobs = new Map(); // parcelId -> jobId (Deduplication map)
    this.completedCount = 0;
    this.failedCount = 0;
    this.isProcessing = false;
    this.isPaused = false;
  }

  /**
   * Enqueues a synchronization job.
   * Enforces deduplication: if a job for the same parcel is already pending or active,
   * returns the existing job ID without creating a duplicate.
   */
  enqueue({
    parcelId,
    parcelParams,
    sourceId = 'MOCK_CADASTRAL_SANDBOX',
    triggerType = 'MANUAL_REFRESH',
    priority = 0,
    retryCount = 0
  }) {
    // Check deduplication
    const existingJobId = this.pendingParcelJobs.get(parcelId);
    if (existingJobId) {
      return {
        jobId: existingJobId,
        isDuplicate: true,
        status: 'ALREADY_QUEUED'
      };
    }

    const jobId = crypto.randomUUID();
    const job = {
      id: jobId,
      parcelId,
      parcelParams,
      sourceId,
      triggerType,
      priority,
      retryCount,
      enqueuedAt: Date.now(),
      status: 'QUEUED'
    };

    this.pendingParcelJobs.set(parcelId, jobId);
    this.queue.push(job);
    
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.emit('job:enqueued', job);
    this.processNext();

    return {
      jobId,
      isDuplicate: false,
      status: 'QUEUED'
    };
  }

  isJobActiveForParcel(parcelId) {
    return this.pendingParcelJobs.has(parcelId);
  }

  async processNext() {
    if (this.isPaused || this.activeJobs.size >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeJobs.set(job.id, job);
    job.status = 'PROCESSING';
    job.startedAt = Date.now();

    this.emit('job:started', job);

    // Continue spawning up to concurrency limit
    if (this.activeJobs.size < this.concurrency && this.queue.length > 0) {
      setImmediate(() => this.processNext());
    }
  }

  completeJob(jobId, result) {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.status = 'COMPLETED';
    job.completedAt = Date.now();
    job.result = result;

    this.activeJobs.delete(jobId);
    this.pendingParcelJobs.delete(job.parcelId);
    this.completedCount++;

    this.emit('job:completed', job);
    setImmediate(() => this.processNext());
  }

  failJob(jobId, error, willRetry = false) {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.status = willRetry ? 'RETRY_PENDING' : 'FAILED';
    job.failedAt = Date.now();
    job.error = error;

    this.activeJobs.delete(jobId);
    if (!willRetry) {
      this.pendingParcelJobs.delete(job.parcelId);
      this.failedCount++;
    }

    this.emit('job:failed', { job, error, willRetry });
    setImmediate(() => this.processNext());
  }

  getMetrics() {
    return {
      queuedJobs: this.queue.length,
      activeJobs: this.activeJobs.size,
      completedJobs: this.completedCount,
      failedJobs: this.failedCount,
      isPaused: this.isPaused
    };
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.processNext();
  }
}

const defaultJobQueue = new JobQueue();

module.exports = {
  JobQueue,
  defaultJobQueue
};
