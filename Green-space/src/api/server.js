// src/api/server.js
// Production HTTP API Server and Application Composition Root

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const config = require('../config');
const { defaultDbManager } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const { seedDataSources } = require('../db/seed');

const ParcelRepository = require('../services/parcel-repository');
const VersioningService = require('../services/versioning-service');
const { defaultCacheService } = require('../services/cache-service');
const SyncService = require('../services/sync-service');

const { defaultJobQueue } = require('../worker/job-queue');
const SyncWorker = require('../worker/sync-worker');
const { defaultRegistry } = require('../adapters');

const Router = require('./router');
const Middleware = require('./middleware');
const ParcelController = require('./controllers/parcel-controller');
const SyncController = require('./controllers/sync-controller');

function createApp(options = {}) {
  const dbManager = options.dbManager || defaultDbManager;
  const cacheService = options.cacheService || defaultCacheService;
  const jobQueue = options.jobQueue || defaultJobQueue;
  const adapterRegistry = options.adapterRegistry || defaultRegistry;

  // Repositories and Domain Services
  const parcelRepo = new ParcelRepository(dbManager);
  const versioningService = new VersioningService({
    parcelRepository: parcelRepo,
    cacheService
  });

  // Background Worker
  const syncWorker = new SyncWorker({
    jobQueue,
    parcelRepository: parcelRepo,
    versioningService,
    cacheService,
    adapterRegistry
  });

  const syncService = new SyncService({
    parcelRepository: parcelRepo,
    jobQueue,
    cacheService
  });

  // Controllers
  const parcelController = new ParcelController({
    syncService,
    parcelRepository: parcelRepo,
    jobQueue,
    cacheService,
    adapterRegistry
  });

  const syncController = new SyncController({
    syncService,
    jobQueue,
    cacheService,
    adapterRegistry,
    dbManager
  });

  // REST Router
  const router = new Router();

  // Rate limiters
  const globalRateLimiter = Middleware.createRateLimiter({
    windowMs: config.security.rateLimitWindowMs,
    maxRequests: config.security.rateLimitMaxRequests
  });

  const refreshRateLimiter = Middleware.createRateLimiter({
    windowMs: config.security.rateLimitWindowMs,
    maxRequests: config.security.manualRefreshRateLimitMax,
    message: 'Manual refresh rate limit exceeded. Please wait before refreshing again.'
  });

  // Routes
  router.get('/api/v1/parcels', (req, res) => {
    parcelController.listParcels(req, res);
  });

  router.get('/api/v1/parcels/:parcelId', (req, res, params, url) => {
    parcelController.getParcel(req, res, params, url);
  });

  router.get('/api/v1/parcels/:parcelId/history', (req, res, params, url) => {
    parcelController.getParcelHistory(req, res, params, url);
  });

  router.post('/api/v1/parcels/:parcelId/refresh', (req, res, params, url, body) => {
    parcelController.requestRefresh(req, res, params, url, body);
  });

  router.get('/api/v1/parcels/:parcelId/sync-status', (req, res, params) => {
    syncController.getSyncStatus(req, res, params);
  });

  router.get('/api/v1/sync/health', (req, res) => {
    syncController.getHealth(req, res);
  });

  router.post('/api/v1/parcels/lookup', (req, res, params, url, body) => {
    parcelController.lookupOrCreate(req, res, params, url, body);
  });

  router.post('/api/v1/parcels/by-location', (req, res, params, url, body) => {
    parcelController.lookupByLocation(req, res, params, url, body);
  });

  router.post('/api/v1/parcels/verify-location', (req, res, params, url, body) => {
    parcelController.lookupByLocation(req, res, params, url, body);
  });

  // Static file handler for UI
  const publicDir = path.resolve(__dirname, '../../public');

  const server = http.createServer(async (req, res) => {
    Middleware.applySecurityHeaders(res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `http://${host}`);
    const pathname = parsedUrl.pathname;

    // Static assets
    if (req.method === 'GET' && (!pathname.startsWith('/api/') || pathname === '/')) {
      const filePath = pathname === '/' 
        ? path.join(publicDir, 'index.html') 
        : path.join(publicDir, pathname.replace(/^\/+/, ''));

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json',
          '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // Match API routes
    const matched = router.match(req.method, pathname);
    if (!matched) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOT_FOUND', message: `Route ${req.method} ${pathname} not found` }));
      return;
    }

    // Apply Rate Limiting
    if (pathname.includes('/refresh')) {
      refreshRateLimiter(req, res, () => proceed());
    } else {
      globalRateLimiter(req, res, () => proceed());
    }

    async function proceed() {
      try {
        let body = null;
        if (req.method === 'POST') {
          body = await Middleware.parseJsonBody(req);
        }

        const handler = matched.handlers[0];
        handler(req, res, matched.params, parsedUrl, body);
      } catch (err) {
        console.error('[SERVER] Request processing error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'BAD_REQUEST', message: err.message }));
      }
    }
  });

  return {
    server,
    dbManager,
    cacheService,
    jobQueue,
    syncWorker,
    parcelRepo,
    versioningService,
    syncService
  };
}

function startServer(port = config.port) {
  // Ensure migrations and seeding
  runMigrations();
  seedDataSources();

  const app = createApp();
  app.syncWorker.start();

  app.server.listen(port, config.host, () => {
    console.log(`[PROJECT GREEN] Server running at http://${config.host}:${port}`);
    console.log(`[PROJECT GREEN] Mode: ${config.env} | Database: ${config.database.type} | Cache: ${config.cache.type}`);
  });

  return app;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};
