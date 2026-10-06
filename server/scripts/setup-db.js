'use strict';
/**
 * Loads 01_schema.sql, 02_seed.sql and 03_dataset.sql into the configured MySQL server.
 *
 * The schema uses DELIMITER for triggers and procedures. DELIMITER is a client
 * directive the server never sees, so this splitter honours it and sends one
 * statement at a time.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function splitStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';
  let i = 0;
  let quote = null;

  while (i < sql.length) {
    const ch = sql[i];
    const rest = sql.slice(i);

    if (!quote) {
      // line comment
      if (rest.startsWith('--') || ch === '#') {
        const end = sql.indexOf('\n', i);
        i = end === -1 ? sql.length : end + 1;
        buffer += '\n';
        continue;
      }
      // block comment
      if (rest.startsWith('/*')) {
        const end = sql.indexOf('*/', i + 2);
        i = end === -1 ? sql.length : end + 2;
        continue;
      }
      // DELIMITER directive, only valid at the start of a line
      const atLineStart = buffer.trim() === '' || buffer.endsWith('\n');
      if (atLineStart && /^delimiter[ \t]+/i.test(rest)) {
        const eol = sql.indexOf('\n', i);
        const line = sql.slice(i, eol === -1 ? sql.length : eol);
        delimiter = line.split(/[ \t]+/)[1].trim();
        i = eol === -1 ? sql.length : eol + 1;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; }
      if (rest.startsWith(delimiter)) {
        const stmt = buffer.trim();
        if (stmt) statements.push(stmt);
        buffer = '';
        i += delimiter.length;
        continue;
      }
    } else {
      if (ch === '\\') { buffer += ch + (sql[i + 1] || ''); i += 2; continue; }
      if (ch === quote) quote = null;
    }

    buffer += ch;
    i += 1;
  }
  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements;
}

(async () => {
  const roots = [
    path.join(__dirname, '..', '..', 'projectverse-database'),
    path.join(__dirname, '..', '..', 'database'),
  ];
  const dbDir = roots.find((dir) => fs.existsSync(path.join(dir, '01_schema.sql')));
  if (!dbDir) {
    console.error(`Could not find 01_schema.sql in any of:\n  ${roots.join('\n  ')}`);
    process.exit(1);
  }

  const files = ['01_schema.sql', '02_seed.sql', '03_dataset.sql'].map((f) => path.join(dbDir, f));
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false,
    ...(String(process.env.DB_SSL).toLowerCase() === 'true'
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });

  for (const file of files) {
    const statements = splitStatements(fs.readFileSync(file, 'utf8'));
    process.stdout.write(`${path.basename(file)}: ${statements.length} statements `);
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        console.error(`\nFailed on:\n${stmt.slice(0, 200)}…\n${err.message}`);
        process.exit(1);
      }
    }
    console.log('✓');
  }

  await conn.end();
  console.log('\nDatabase ready. Demo password for every account: Password123!');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
