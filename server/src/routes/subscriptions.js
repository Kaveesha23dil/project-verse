'use strict';
const express = require('express');
const { z } = require('zod');
const { query, one, execute, transaction } = require('../db');
const { requireAuth, loadUser } = require('../middleware/auth');
const { usageSummary } = require('../middleware/quota');
const { wrap, notify, badRequest, notFound, logActivity } = require('../lib/helpers');

const router = express.Router();

// --------------------------------------------------------------- plans
router.get(
  '/plans',
  wrap(async (req, res) => {
    const plans = await query('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY id');
    const features = await query('SELECT * FROM plan_features ORDER BY plan_id, sort_order');
    const limits = await query('SELECT * FROM plan_limits');
    res.json({
      data: plans.map((p) => ({
        ...p,
        features: features.filter((f) => f.plan_id === p.id),
        limits: limits.filter((l) => l.plan_id === p.id),
      })),
    });
  })
);

// ---------------------------------------------------- current + usage
router.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const sub = await one(
      `SELECT s.*, p.code AS plan_code, p.name AS plan_name, p.price_monthly, p.price_yearly,
              pm.card_brand, pm.card_last4, pm.exp_month, pm.exp_year
         FROM subscriptions s
         JOIN subscription_plans p ON p.id = s.plan_id
         LEFT JOIN payment_methods pm ON pm.id = s.payment_method_id
        WHERE s.user_id = ? AND s.status = 'active'
        ORDER BY s.plan_id DESC LIMIT 1`,
      [req.user.id]
    );
    const usage = await usageSummary(req.user);
    res.json({ data: { subscription: sub, usage } });
  })
);

router.get(
  '/usage',
  requireAuth,
  wrap(async (req, res) => res.json({ data: await usageSummary(req.user) }))
);

router.get(
  '/invoices',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT id, invoice_no, amount, currency, billing_cycle, period_start, period_end, status, paid_at
         FROM subscription_invoices WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  })
);

// ------------------------------------------------------------- upgrade
// Demo gateway: the card is validated, tokenised and only the brand plus the
// last four digits are stored. A real deployment swaps checkoutWithGateway()
// for the provider SDK and never lets the PAN reach this server at all.
function luhnValid(number) {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function detectBrand(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6/.test(n)) return 'discover';
  return 'card';
}

async function checkoutWithGateway({ amount, currency }) {
  // Stand-in for the payment provider call.
  return { ok: true, reference: `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, amount, currency };
}

router.post(
  '/upgrade',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      billingCycle: z.enum(['monthly', 'yearly']),
      cardNumber: z.string().min(13).max(23),
      holderName: z.string().min(3).max(120),
      expMonth: z.number().int().min(1).max(12),
      expYear: z.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 20),
      cvv: z.string().min(3).max(4),
      billingCountry: z.string().max(80).optional(),
      saveCard: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    if (req.user.plan_code === 'premium') throw badRequest('Premium is already active on this account', 'already_premium');
    if (!luhnValid(d.cardNumber)) throw badRequest('That card number is not valid', 'card_invalid');
    if (!/^\d{3,4}$/.test(d.cvv)) throw badRequest('Enter the 3 or 4 digit security code', 'cvv_invalid');

    const now = new Date();
    const expiry = new Date(d.expYear, d.expMonth, 0, 23, 59, 59);
    if (expiry < now) throw badRequest('That card has expired', 'card_expired');

    const plan = await one("SELECT * FROM subscription_plans WHERE code = 'premium'");
    const amount = d.billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

    const payment = await checkoutWithGateway({ amount, currency: plan.currency });
    if (!payment.ok) throw badRequest('The payment was declined. Try another card.', 'payment_declined');

    const periodEnd = new Date(now);
    if (d.billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const result = await transaction(async (conn) => {
      const digits = d.cardNumber.replace(/\D/g, '');
      const [pm] = await conn.execute(
        `INSERT INTO payment_methods (user_id, card_brand, card_last4, card_token, holder_name,
                                      exp_month, exp_year, billing_country, is_default)
         VALUES (?,?,?,?,?,?,?,?,1)`,
        [
          req.user.id, detectBrand(digits), digits.slice(-4),
          `tok_${payment.reference}`, d.holderName, d.expMonth, d.expYear, d.billingCountry || null,
        ]
      );
      const pmId = pm.insertId;

      // Close the standing Basic subscription and open the Premium one.
      await conn.execute(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW()
          WHERE user_id = ? AND status = 'active'`,
        [req.user.id]
      );
      const [sub] = await conn.execute(
        `INSERT INTO subscriptions (user_id, plan_id, billing_cycle, status, amount, currency,
                                    payment_method_id, current_period_start, current_period_end, auto_renew)
         VALUES (?,?,?, 'active', ?,?,?,?,?,1)`,
        [req.user.id, plan.id, d.billingCycle, amount, plan.currency, pmId, now, periodEnd]
      );
      const subId = sub.insertId;

      const year = now.getFullYear();
      const [countRow] = await conn.execute(
        'SELECT COUNT(*) AS n FROM subscription_invoices WHERE invoice_no LIKE ?', [`INV-${year}-%`]
      );
      const invoiceNo = `INV-${year}-${String(countRow[0].n + 1).padStart(6, '0')}`;

      await conn.execute(
        `INSERT INTO subscription_invoices (invoice_no, subscription_id, user_id, amount, currency,
                                            billing_cycle, period_start, period_end, payment_method_id,
                                            gateway_reference, status, paid_at)
         VALUES (?,?,?,?,?,?,?,?,?,?, 'paid', NOW())`,
        [invoiceNo, subId, req.user.id, amount, plan.currency, d.billingCycle, now, periodEnd, pmId, payment.reference]
      );
      return { subId, invoiceNo, periodEnd };
    });

    await notify(req.user.id, {
      type: 'billing.paid',
      title: 'Premium is active',
      body: `Your ${d.billingCycle} plan runs until ${result.periodEnd.toISOString().slice(0, 10)}. Invoice ${result.invoiceNo}.`,
      link: '/settings/billing',
      priority: 'priority',
    });
    await logActivity(req, 'subscription.upgraded', 'subscription', result.subId);

    const user = await loadUser(req.user.id);
    res.status(201).json({
      data: { plan: 'premium', billingCycle: d.billingCycle, periodEnd: result.periodEnd, invoiceNo: result.invoiceNo },
      user,
      message: 'Premium is active',
    });
  })
);

// -------------------------------------------------------------- cancel
router.post(
  '/cancel',
  requireAuth,
  wrap(async (req, res) => {
    const sub = await one(
      `SELECT s.*, p.code FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.plan_id DESC LIMIT 1`,
      [req.user.id]
    );
    if (!sub || sub.code !== 'premium') throw badRequest('There is no paid plan to cancel', 'no_paid_plan');

    // Access continues to the end of the paid period, then the account falls back to Basic.
    await execute(
      'UPDATE subscriptions SET auto_renew = 0, cancelled_at = NOW() WHERE id = ?', [sub.id]
    );
    await notify(req.user.id, {
      type: 'billing.cancelled',
      title: 'Premium will not renew',
      body: `You keep Premium until ${new Date(sub.current_period_end).toISOString().slice(0, 10)}, then the account returns to Basic.`,
      link: '/settings/billing',
    });
    await logActivity(req, 'subscription.cancelled', 'subscription', sub.id);
    res.json({ message: 'Premium will not renew', accessUntil: sub.current_period_end });
  })
);

router.post(
  '/resume',
  requireAuth,
  wrap(async (req, res) => {
    const sub = await one(
      `SELECT s.id FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = ? AND s.status = 'active' AND p.code = 'premium' AND s.auto_renew = 0 LIMIT 1`,
      [req.user.id]
    );
    if (!sub) throw notFound('There is no cancelled plan to resume');
    await execute('UPDATE subscriptions SET auto_renew = 1, cancelled_at = NULL WHERE id = ?', [sub.id]);
    res.json({ message: 'Renewal turned back on' });
  })
);

// ------------------------------------------------------- payment methods
router.get(
  '/payment-methods',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT id, card_brand, card_last4, holder_name, exp_month, exp_year, is_default
         FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, id DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  })
);

router.delete(
  '/payment-methods/:id',
  requireAuth,
  wrap(async (req, res) => {
    const active = await one(
      `SELECT s.id FROM subscriptions s
        WHERE s.user_id = ? AND s.status = 'active' AND s.payment_method_id = ? AND s.auto_renew = 1`,
      [req.user.id, req.params.id]
    );
    if (active) throw badRequest('This card pays for your active plan. Cancel renewal first.', 'card_in_use');
    await execute('DELETE FROM payment_methods WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Card removed' });
  })
);

module.exports = router;
