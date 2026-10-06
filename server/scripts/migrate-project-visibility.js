'use strict';
const { pool, query, execute } = require('../src/db');
(async () => {
  const columns = await query("SHOW COLUMNS FROM publications LIKE 'hidden_until'");
  if (!columns.length) await execute('ALTER TABLE publications ADD COLUMN hidden_until DATETIME NULL');
  console.log('Project visibility migration complete.');
})().catch(() => { console.error('Migration failed'); process.exitCode = 1; }).finally(() => pool.end());
