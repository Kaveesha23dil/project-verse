'use strict';
const { one, execute, query } = require('../db');
const { periodKey, ApiError } = require('../lib/helpers');

/**
 * Metrics the plan matrix meters.
 * A NULL monthly_limit on the plan means unlimited.
 * A limit of 0 means the feature belongs to Premium only.
 */
const METRICS = {
  FULL_VIEW: 'publication_full_view',
  SAVE: 'saved_publication',
  REQUEST: 'outgoing_request',
  MEETING: 'meeting_request',
  DOCUMENT: 'document_request',
};

const PLAN_ID = { basic: 1, premium: 2 };

async function limitFor(planCode, metric) {
  const row = await one(
    'SELECT monthly_limit FROM plan_limits WHERE plan_id = ? AND metric = ? LIMIT 1',
    [PLAN_ID[planCode] || 1, metric]
  );
  return row ? row.monthly_limit : null;
}

async function usedThisMonth(userId, metric) {
  const row = await one(
    'SELECT used_count FROM usage_counters WHERE user_id = ? AND period_key = ? AND metric = ? LIMIT 1',
    [userId, periodKey(), metric]
  );
  return row ? row.used_count : 0;
}

/** Snapshot of every meter for the account — powers the dashboard usage widget. */
async function usageSummary(user) {
  const limits = await query('SELECT metric, monthly_limit FROM plan_limits WHERE plan_id = ?', [
    PLAN_ID[user.plan_code] || 1,
  ]);
  const counters = await query(
    'SELECT metric, used_count FROM usage_counters WHERE user_id = ? AND period_key = ?',
    [user.id, periodKey()]
  );
  const usedMap = Object.fromEntries(counters.map((c) => [c.metric, c.used_count]));

  // Saves are a standing total, not a monthly flow.
  const saved = await one(
    'SELECT COUNT(*) AS n FROM saved_publications WHERE user_id = ?', [user.id]
  );

  return {
    plan: user.plan_code,
    period: periodKey(),
    metrics: limits.map((l) => {
      const used = l.metric === METRICS.SAVE ? saved.n : usedMap[l.metric] || 0;
      return {
        metric: l.metric,
        used,
        limit: l.monthly_limit,
        unlimited: l.monthly_limit === null,
        remaining: l.monthly_limit === null ? null : Math.max(0, l.monthly_limit - used),
      };
    }),
  };
}

function quotaError(metric, limit) {
  const messages = {
    [METRICS.FULL_VIEW]: `Basic includes ${limit} full publication views a month. Upgrade to keep reading.`,
    [METRICS.SAVE]: `Basic saves up to ${limit} publications. Remove one or upgrade for unlimited saves.`,
    [METRICS.REQUEST]: `Basic sends ${limit} collaboration or investment requests a month. Upgrade to send more.`,
    [METRICS.MEETING]: 'Scheduling meetings with project owners is a Premium feature.',
    [METRICS.DOCUMENT]: 'Requesting project documents is a Premium feature.',
  };
  return new ApiError(402, messages[metric] || 'Your plan limit is reached', 'quota_exceeded', {
    metric,
    limit,
    upgradeTo: 'premium',
  });
}

/**
 * Charge one unit of a metric. Premium plans short-circuit as unlimited.
 * Idempotent metrics (a repeat view of the same publication in the same month)
 * are handled by the caller before calling this.
 */
async function consume(user, metric) {
  const limit = await limitFor(user.plan_code, metric);
  if (limit === null) return { allowed: true, unlimited: true };
  if (limit === 0) throw quotaError(metric, limit);

  const used = await usedThisMonth(user.id, metric);
  if (used >= limit) throw quotaError(metric, limit);

  await execute(
    `INSERT INTO usage_counters (user_id, period_key, metric, used_count)
     VALUES (?,?,?,1)
     ON DUPLICATE KEY UPDATE used_count = used_count + 1`,
    [user.id, periodKey(), metric]
  );
  return { allowed: true, used: used + 1, limit, remaining: limit - used - 1 };
}

/** Route guard for Premium-only endpoints. */
function requirePremium(featureLabel) {
  return (req, res, next) => {
    if (req.user?.plan_code === 'premium') return next();
    next(
      new ApiError(402, `${featureLabel} is available on Premium.`, 'premium_required', {
        upgradeTo: 'premium',
      })
    );
  };
}

/** Guard for a metered action, used as middleware where the metric is fixed. */
function meter(metric) {
  return async (req, res, next) => {
    try {
      req.quota = await consume(req.user, metric);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { METRICS, consume, meter, requirePremium, usageSummary, limitFor, usedThisMonth };
