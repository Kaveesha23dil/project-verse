'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'projectverse',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: false,
  decimalNumbers: true,
  timezone: 'Z',
  // Hosted MySQL (Railway, Aiven, PlanetScale...) requires TLS.
  // Set DB_SSL=true in the environment when you deploy.
  ...(String(process.env.DB_SSL).toLowerCase() === 'true'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

/** Run a query and return all rows. */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Run a query and return the first row (or null). */
async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

/** Run an INSERT/UPDATE/DELETE and return the raw result. */
async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

/** Run a set of statements inside one transaction. */
async function transaction(handler) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await handler(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, one, execute, transaction };
