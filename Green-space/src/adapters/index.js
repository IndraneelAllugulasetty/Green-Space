// src/adapters/index.js
// Data source adapter registry and factory

const MockCadastralAdapter = require('./mock-cadastral-adapter');

class SourceAdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    // Default mock adapter for tests and local development
    const mock = new MockCadastralAdapter();
    this.register(mock);
  }

  register(adapter) {
    this.adapters.set(adapter.id, adapter);
  }

  get(sourceId) {
    return this.adapters.get(sourceId) || null;
  }

  getDefault() {
    return this.adapters.get('MOCK_CADASTRAL_SANDBOX');
  }

  list() {
    return Array.from(this.adapters.values()).map(a => ({
      id: a.id,
      name: a.name,
      sourceType: a.sourceType,
      isEnabled: a.isEnabled
    }));
  }
}

const defaultRegistry = new SourceAdapterRegistry();

module.exports = {
  SourceAdapterRegistry,
  defaultRegistry
};
