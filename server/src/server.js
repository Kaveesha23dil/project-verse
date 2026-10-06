'use strict';
require('dotenv').config();
const app = require('./app');
const { pool } = require('./db');

const PORT = Number(process.env.PORT || 4000);

const server = app.listen(PORT, () => {
  console.log(`ProjectVerse API listening on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received, closing.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
