'use strict';
const express = require('express');
const { z } = require('zod');
const { query, one, execute } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { wrap, notify, badRequest, notFound, logActivity } = require('../lib/helpers');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));
router.use('/projects', require('./admin-projects'));

const { generateReview } = require('../lib/ai-review');
const { rateLimit } = require('express-rate-limit');
const aiLimit = rateLimit({ windowMs: 60000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Please wait a minute before requesting another AI review.', code: 'ai_rate_limit' } });

router.post('/publications/:id/ai-review', aiLimit, wrap(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) throw badRequest('Invalid publication ID');
  const publication = await one(
    `SELECT pb.title, pb.abstract, pb.publication_type, pb.keywords, pb.status,
            c.name AS category,
            (SELECT GROUP_CONCAT(t.name SEPARATOR ', ') FROM publication_technologies pt
             JOIN technologies t ON t.id = pt.technology_id WHERE pt.publication_id = pb.id) AS technologies
       FROM publications pb LEFT JOIN categories c ON c.id = pb.category_id
      WHERE pb.id = ? AND pb.deleted_at IS NULL`, [req.params.id]);
  if (!publication) throw notFound('That publication does not exist');
  if (publication.status !== 'pending') throw badRequest('This publication is not waiting for review', 'invalid_state');
  const { status, ...submission } = publication;
  res.json({ data: await generateReview(submission) });
}));

// ------------------------------------------------------------ overview
router.get(
  '/stats',
  wrap(async (req, res) => {
    const [users, pubs, products, orders, revenue, subs] = await Promise.all([
      one(`SELECT COUNT(*) AS total,
                  SUM(account_status = 'active') AS active,
                  SUM(account_status = 'suspended') AS suspended,
                  SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_30d
             FROM users WHERE deleted_at IS NULL`),
      one(`SELECT COUNT(*) AS total,
                  SUM(status = 'pending') AS pending,
                  SUM(status = 'approved') AS approved,
                  SUM(status = 'rejected') AS rejected,
                  SUM(status = 'draft') AS drafts
             FROM publications WHERE deleted_at IS NULL`),
      one(`SELECT COUNT(*) AS total,
                  SUM(status = 'pending') AS pending,
                  SUM(status = 'active') AS active
             FROM products WHERE deleted_at IS NULL`),
      one(`SELECT COUNT(*) AS total, COALESCE(SUM(grand_total),0) AS gmv,
                  COALESCE(SUM(platform_fee),0) AS fees
             FROM orders WHERE payment_status = 'paid'`),
      one(`SELECT COALESCE(SUM(amount),0) AS subscription_revenue
             FROM subscription_invoices WHERE status = 'paid'`),
      one(`SELECT SUM(p.code = 'premium') AS premium, SUM(p.code = 'basic') AS basic
             FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
            WHERE s.status = 'active'`),
    ]);

    const byRole = await query(
      `SELECT r.code, r.name, COUNT(u.id) AS n
         FROM roles r LEFT JOIN users u ON u.role_id = r.id AND u.deleted_at IS NULL
        GROUP BY r.id ORDER BY r.id`
    );
    const trend = await query(
      `SELECT DATE_FORMAT(published_at, '%Y-%m') AS month, COUNT(*) AS n
         FROM publications
        WHERE status = 'approved' AND published_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month ORDER BY month`
    );
    res.json({ data: { users, publications: pubs, products, orders, revenue, subscriptions: subs, byRole, trend } });
  })
);

// ---------------------------------------------------- moderation queue
router.get(
  '/moderation',
  wrap(async (req, res) => {
    const publications = await query(
      `SELECT pb.id, pb.slug, pb.title, pb.abstract, pb.publication_type, pb.submitted_at,
              pb.keywords, u.id AS owner_id, u.full_name AS owner_name, r.code AS owner_role,
              un.name AS university_name, c.name AS category_name,
              (SELECT GROUP_CONCAT(t.name SEPARATOR ', ') FROM publication_technologies pt
                 JOIN technologies t ON t.id = pt.technology_id WHERE pt.publication_id = pb.id) AS technologies,
              (SELECT COUNT(*) FROM publication_documents d WHERE d.publication_id = pb.id) AS document_count
         FROM publications pb
         JOIN users u ON u.id = pb.owner_id
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN universities un ON un.id = pb.university_id
         LEFT JOIN categories c ON c.id = pb.category_id
        WHERE pb.status = 'pending' AND pb.deleted_at IS NULL
        ORDER BY pb.submitted_at ASC`
    );
    const products = await query(
      `SELECT p.id, p.slug, p.title, p.short_description, p.price, p.currency, p.product_type,
              p.created_at, u.id AS seller_id, u.full_name AS seller_name, r.code AS seller_role,
              pc.name AS category_name
         FROM products p
         JOIN users u ON u.id = p.seller_id
         JOIN roles r ON r.id = u.role_id
         JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.status = 'pending' AND p.deleted_at IS NULL
        ORDER BY p.created_at ASC`
    );
    res.json({ data: { publications, products, total: publications.length + products.length } });
  })
);

router.post(
  '/publications/:id/review',
  wrap(async (req, res) => {
    const schema = z.object({
      decision: z.enum(['approved', 'rejected']),
      note: z.string().max(600).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose approve or reject', 'validation');
    if (parsed.data.decision === 'rejected' && !parsed.data.note) {
      throw badRequest('Tell the owner what needs to change', 'note_required');
    }

    const pub = await one('SELECT id, title, owner_id, slug, status FROM publications WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');
    if (pub.status !== 'pending') throw badRequest('This publication is not waiting for review', 'invalid_state');

    await execute(
      `UPDATE publications SET status = ?, reviewed_by = ?, rejection_reason = ? WHERE id = ?`,
      [parsed.data.decision, req.user.id, parsed.data.decision === 'rejected' ? parsed.data.note : null, pub.id]
    );
    await notify(pub.owner_id, {
      type: `publication.${parsed.data.decision}`,
      title: parsed.data.decision === 'approved' ? 'Your publication is live' : 'Your publication needs changes',
      body: parsed.data.decision === 'approved'
        ? `"${pub.title}" is now visible in the marketplace.`
        : `"${pub.title}" was not approved: ${parsed.data.note}`,
      link: parsed.data.decision === 'approved' ? `/publications/${pub.slug}` : '/dashboard',
      priority: 'priority',
    });
    await logActivity(req, `publication.${parsed.data.decision}`, 'publication', pub.id);
    res.json({ status: parsed.data.decision, message: `Publication ${parsed.data.decision}` });
  })
);

router.post(
  '/products/:id/review',
  wrap(async (req, res) => {
    const schema = z.object({ decision: z.enum(['approved', 'rejected']), note: z.string().max(600).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose approve or reject', 'validation');

    const product = await one('SELECT id, title, seller_id, status, is_digital, stock_quantity FROM products WHERE id = ?', [req.params.id]);
    if (!product) throw notFound('That listing does not exist');
    if (product.status !== 'pending') throw badRequest('This listing is not waiting for review', 'invalid_state');

    const newStatus = parsed.data.decision === 'approved' ? 'active' : 'rejected';
    await execute(
      `UPDATE products SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?`,
      [newStatus, req.user.id, parsed.data.decision === 'rejected' ? parsed.data.note || null : null, product.id]
    );
    await execute(
      `INSERT INTO moderation_logs (actor_id, entity_type, entity_id, action, from_status, to_status, note)
       VALUES (?, 'product', ?, ?, 'pending', ?, ?)`,
      [req.user.id, product.id, `status:${newStatus}`, newStatus, parsed.data.note || null]
    );
    await notify(product.seller_id, {
      type: `product.${parsed.data.decision}`,
      title: parsed.data.decision === 'approved' ? 'Your listing is live' : 'Your listing needs changes',
      body: parsed.data.decision === 'approved'
        ? `"${product.title}" is now on sale in the marketplace.`
        : `"${product.title}" was not approved: ${parsed.data.note || 'no reason given'}`,
      link: '/dashboard?tab=listings',
      priority: 'priority',
    });
    res.json({ status: newStatus, message: `Listing ${parsed.data.decision}` });
  })
);

// -------------------------------------------------------- user management
router.get(
  '/users',
  wrap(async (req, res) => {
    const where = ['u.deleted_at IS NULL'];
    const params = [];
    if (req.query.role) { where.push('r.code = ?'); params.push(req.query.role); }
    if (req.query.status) { where.push('u.account_status = ?'); params.push(req.query.status); }
    if (req.query.q) { where.push('(u.full_name LIKE ? OR u.email LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }

    const rows = await query(
      `SELECT u.id, u.full_name, u.email, u.account_status, u.verification_status, u.created_at,
              u.last_login_at, r.code AS role_code, r.name AS role_name, un.name AS university_name,
              COALESCE(p.code,'basic') AS plan_code,
              (SELECT COUNT(*) FROM publications pb WHERE pb.owner_id = u.id AND pb.deleted_at IS NULL) AS publication_count,
              (SELECT COUNT(*) FROM products pr WHERE pr.seller_id = u.id AND pr.deleted_at IS NULL) AS listing_count
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN universities un ON un.id = u.university_id
         LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
         LEFT JOIN subscription_plans p ON p.id = s.plan_id
        WHERE ${where.join(' AND ')}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT 200`,
      params
    );
    res.json({ data: rows });
  })
);

router.patch(
  '/users/:id/status',
  wrap(async (req, res) => {
    const schema = z.object({
      accountStatus: z.enum(['active', 'suspended', 'deactivated']),
      reason: z.string().max(600).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose a valid account status', 'validation');

    const target = await one('SELECT u.id, u.full_name, u.account_status, r.code AS role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?', [req.params.id]);
    if (!target) throw notFound('That user does not exist');
    if (target.role_code === 'admin') throw badRequest('Administrator accounts cannot be changed here', 'protected_account');
    if (Number(req.params.id) === req.user.id) throw badRequest('You cannot change your own account status', 'self_action');

    await execute('UPDATE users SET account_status = ? WHERE id = ?', [parsed.data.accountStatus, target.id]);
    await execute(
      `INSERT INTO moderation_logs (actor_id, entity_type, entity_id, action, from_status, to_status, note)
       VALUES (?, 'user', ?, ?, ?, ?, ?)`,
      [req.user.id, target.id, `account:${parsed.data.accountStatus}`, target.account_status, parsed.data.accountStatus, parsed.data.reason || null]
    );
    if (parsed.data.accountStatus === 'active') {
      await notify(target.id, { type: 'account.restored', title: 'Your account is active again', body: 'You can sign in and publish as usual.', link: '/dashboard' });
    }
    await logActivity(req, `user.${parsed.data.accountStatus}`, 'user', target.id);
    res.json({ message: `Account ${parsed.data.accountStatus}` });
  })
);

// ----------------------------------------------------------- audit trail
router.get(
  '/logs',
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT m.*, u.full_name AS actor_name, r.code AS actor_role
         FROM moderation_logs m
         LEFT JOIN users u ON u.id = m.actor_id
         LEFT JOIN roles r ON r.id = u.role_id
        ORDER BY m.created_at DESC LIMIT 100`
    );
    const activity = await query(
      `SELECT a.*, u.full_name FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC LIMIT 100`
    );
    res.json({ data: { moderation: rows, activity } });
  })
);

// --------------------------------------------------------- system settings
router.get(
  '/settings',
  wrap(async (req, res) => res.json({ data: await query('SELECT * FROM system_settings ORDER BY setting_key') }))
);

router.put(
  '/settings/:key',
  wrap(async (req, res) => {
    const value = String(req.body.value ?? '').slice(0, 500);
    if (!value) throw badRequest('Enter a value', 'validation');
    await execute(
      `INSERT INTO system_settings (setting_key, setting_value) VALUES (?,?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [req.params.key, value]
    );
    res.json({ message: 'Setting saved' });
  })
);

module.exports = router;
