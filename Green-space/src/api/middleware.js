// src/api/middleware.js
// API Security, Rate Limiting, JSON body parsing, and error handling middleware

const config = require('../config');

class Middleware {
  /**
   * In-memory sliding window rate limiter.
   */
  static createRateLimiter({ windowMs, maxRequests, message = 'Rate limit exceeded.' }) {
    const clients = new Map(); // ip -> [timestamps]

    return (req, res, next) => {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const cutoff = now - windowMs;

      let timestamps = clients.get(clientIp) || [];
      // Clean timestamps older than window
      timestamps = timestamps.filter(ts => ts > cutoff);

      if (timestamps.length >= maxRequests) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(windowMs / 1000)
        });
        res.end(JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfterSeconds: Math.ceil(windowMs / 1000)
        }));
        return;
      }

      timestamps.push(now);
      clients.set(clientIp, timestamps);
      next();
    };
  }

  /**
   * Validates optional Admin API Key for restricted administrative endpoints (e.g. /sync/health).
   */
  static authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const apiKey = req.headers['x-api-key'] || '';

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKey;

    // In development mode, allow localhost access without key if header absent
    if (config.env === 'development' && (!token || token === '')) {
      return next();
    }

    if (token !== config.security.adminApiKey) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Valid administrative API key required.'
      }));
      return;
    }

    next();
  }

  /**
   * Helper to parse JSON body from incoming stream.
   */
  static async parseJsonBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1024 * 1024) { // 1MB payload limit
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        if (!body.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error('Malformed JSON payload'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Adds standard CORS and security headers.
   */
  static applySecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  }
}

module.exports = Middleware;
