// src/api/controllers/sync-controller.js
// Handles sync status inspection and administrative health observability

class SyncController {
  constructor({ syncService, jobQueue, cacheService, adapterRegistry, dbManager }) {
    this.syncService = syncService;
    this.jobQueue = jobQueue;
    this.cacheService = cacheService;
    this.adapterRegistry = adapterRegistry;
    this.dbManager = dbManager;
  }

  getSyncStatus(req, res, { parcelId }) {
    try {
      const status = this.syncService.getSyncStatus(parcelId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status, null, 2));
    } catch (err) {
      console.error('[API] getSyncStatus error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  }

  getHealth(req, res) {
    try {
      const db = this.dbManager.getDb();
      let dbHealthy = false;
      let totalParcels = 0;
      let totalVersions = 0;

      try {
        const row = db.prepare('SELECT COUNT(*) as count FROM parcels').get();
        totalParcels = row.count;
        const vRow = db.prepare('SELECT COUNT(*) as count FROM parcel_record_versions').get();
        totalVersions = vRow.count;
        dbHealthy = true;
      } catch (dbErr) {
        dbHealthy = false;
      }

      const queueMetrics = this.jobQueue.getMetrics();
      const cacheMetrics = this.cacheService.getMetrics();
      const sources = this.adapterRegistry.list();

      const health = {
        status: dbHealthy ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        system: {
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          uptimeSeconds: Math.floor(process.uptime())
        },
        database: {
          healthy: dbHealthy,
          totalParcels,
          totalVersions
        },
        queue: queueMetrics,
        cache: cacheMetrics,
        dataSources: sources
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } catch (err) {
      console.error('[API] getHealth error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  }
}

module.exports = SyncController;
