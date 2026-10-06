'use strict';
const jwt = require('jsonwebtoken');
const { one } = require('../db');
const { unauthorized, forbidden } = require('../lib/helpers');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role_code, email: user.email },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

function readToken(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

/** Loads the signed-in user together with the plan the API enforces against. */
async function loadUser(userId) {
  return one(
    `SELECT u.id, u.uuid, u.full_name, u.email, u.avatar_url, u.headline,
            u.account_status, u.verification_status, u.university_id,
            r.code AS role_code, r.name AS role_name, r.dashboard_route,
            un.name AS university_name,
            COALESCE(p.code, 'basic') AS plan_code,
            s.id AS subscription_id, s.billing_cycle, s.current_period_end, s.auto_renew
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN universities un ON un.id = u.university_id
       LEFT JOIN subscriptions s
              ON s.user_id = u.id AND s.status = 'active'
             AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
       LEFT JOIN subscription_plans p ON p.id = s.plan_id
      WHERE u.id = ? AND u.deleted_at IS NULL
      ORDER BY s.plan_id DESC
      LIMIT 1`,
    [userId]
  );
}

/** Required authentication. */
async function requireAuth(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) throw unauthorized();
    let payload;
    try {
      payload = jwt.verify(token, SECRET);
    } catch {
      throw unauthorized('Your session expired. Sign in again.');
    }
    const user = await loadUser(payload.sub);
    if (!user) throw unauthorized('Account not found');
    if (user.account_status === 'suspended') throw forbidden('This account is suspended');
    if (user.account_status === 'deactivated') throw forbidden('This account is deactivated');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional authentication — public endpoints that behave differently when signed in. */
async function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = await loadUser(payload.sub);
  } catch {
    /* ignore an invalid token on a public route */
  }
  next();
}

/** Role guard: requireRole('admin'), requireRole('student', 'researcher') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role_code)) {
      return next(forbidden(`This area is for ${roles.join(' or ')} accounts`));
    }
    next();
  };
}

/** Only students and researchers own publications. */
const requirePublisher = requireRole('student', 'researcher');

module.exports = { signAccessToken, requireAuth, optionalAuth, requireRole, requirePublisher, loadUser, SECRET };
