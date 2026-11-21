// src/db/seed.js
// Seeds registered data sources into the central repository

const { defaultDbManager } = require('./database');
const { runMigrations } = require('./migrate');

function seedDataSources(dbManager = defaultDbManager) {
  const db = dbManager.getDb();
  console.log('[SEED] Seeding official and authorized data sources registry...');

  const sources = [
    {
      id: 'KA_BHOOMI_CADASTRE',
      name: 'Karnataka Bhoomi Cadastral Land Records (Authorized Adapter)',
      source_type: 'GOVERNMENT_CADASTRAL',
      access_method: 'AUTHORIZED_REST_GATEWAY',
      is_enabled: 1,
      reliability_score: 0.98,
      config: JSON.stringify({
        jurisdiction: 'Karnataka, India',
        rate_limit_per_minute: 60,
        supports_spatial: true,
        note: 'Configured for production cadastral gateway with PKI mutual-TLS authentication.'
      })
    },
    {
      id: 'MH_MAHABHUMI_REVENUE',
      name: 'Maharashtra MahaBhumi Land Records (Authorized Adapter)',
      source_type: 'LAND_REVENUE_PORTAL',
      access_method: 'AUTHORIZED_REST_GATEWAY',
      is_enabled: 1,
      reliability_score: 0.95,
      config: JSON.stringify({
        jurisdiction: 'Maharashtra, India',
        rate_limit_per_minute: 60,
        supports_spatial: false
      })
    },
    {
      id: 'MOCK_CADASTRAL_SANDBOX',
      name: 'Project Green Cadastral Sandbox Adapter (MOCK / TESTING ONLY)',
      source_type: 'MOCK_ADAPTER',
      access_method: 'INTERNAL_SANDBOX_ADAPTER',
      is_enabled: 1,
      reliability_score: 1.00,
      config: JSON.stringify({
        environment: 'testing_and_development',
        disclaimer: 'This data is synthetic and simulated for integration testing and architecture validation. NEVER claim mock data is real government data.'
      })
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO data_sources (id, name, source_type, access_method, is_enabled, reliability_score, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      source_type = excluded.source_type,
      access_method = excluded.access_method,
      is_enabled = excluded.is_enabled,
      reliability_score = excluded.reliability_score,
      config = excluded.config,
      updated_at = datetime('now')
  `);

  for (const s of sources) {
    stmt.run(s.id, s.name, s.source_type, s.access_method, s.is_enabled, s.reliability_score, s.config);
  }

  console.log(`[SEED] Successfully registered ${sources.length} data sources.`);
}

if (require.main === module) {
  try {
    runMigrations();
    seedDataSources();
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Failed to seed database:', err);
    process.exit(1);
  }
}

module.exports = { seedDataSources };
