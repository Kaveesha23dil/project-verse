'use strict';
const crypto = require('crypto');
const { execute, query } = require('../db');

class ApiError extends Error {
  constructor(status, message, code = null, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const badRequest = (m, code) => new ApiError(400, m, code);
const unauthorized = (m = 'Sign in to continue') => new ApiError(401, m, 'unauthenticated');
const forbidden = (m = 'You do not have access to this') => new ApiError(403, m, 'forbidden');
const notFound = (m = 'Not found') => new ApiError(404, m, 'not_found');
const conflict = (m, code) => new ApiError(409, m, code);

const uuid = () => crypto.randomUUID();

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

/** Slug that is guaranteed unique within a table. */
async function uniqueSlug(table, text) {
  const base = slugify(text) || 'item';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await query(`SELECT id FROM \`${table}\` WHERE slug = ? LIMIT 1`, [slug]);
    if (!rows.length) return slug;
    slug = `${base}-${++n}`;
  }
}

function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function paginate(qs) {
  const page = Math.max(1, Number.parseInt(qs.page, 10) || 1);
  const size = Math.min(60, Math.max(1, Number.parseInt(qs.pageSize, 10) || 12));
  return { page, size, offset: (page - 1) * size };
}

function meta(page, size, total) {
  return { page, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) };
}

async function notify(userId, { type, title, body = null, link = null, priority = 'normal' }) {
  await execute(
    `INSERT INTO notifications (user_id, type, title, body, link_url, priority)
     VALUES (?,?,?,?,?,?)`,
    [userId, type, title, body, link, priority]
  );
}

async function notifyAdmins(payload) {
  const admins = await query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'admin' AND u.account_status = 'active'`
  );
  await Promise.all(admins.map((a) => notify(a.id, payload)));
}

async function logActivity(req, action, entityType = null, entityId = null) {
  try {
    await execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES (?,?,?,?,?,?)`,
      [
        req.user?.id || null,
        action,
        entityType,
        entityId,
        req.ip?.slice(0, 45) || null,
        (req.get('user-agent') || '').slice(0, 255),
      ]
    );
  } catch {
    /* logging must never break a request */
  }
}

/** Wrap an async route handler so rejections reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function orderNumber(prefix = 'PV') {
  const y = new Date().getUTCFullYear();
  const rand = crypto.randomInt(0, 999999).toString().padStart(6, '0');
  return `${prefix}-${y}-${rand}`;
}

module.exports = {
  ApiError, badRequest, unauthorized, forbidden, notFound, conflict,
  uuid, slugify, uniqueSlug, periodKey, paginate, meta,
  notify, notifyAdmins, logActivity, wrap, orderNumber,
};
