// src/index.js
// Main application entrypoint

const { startServer } = require('./api/server');

const app = startServer();

module.exports = app;
