'use strict';
const express = require('express');
const { query, one } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { usageSummary } = require('../middleware/quota');
const { wrap } = require('../lib/helpers');

const router = express.Router();
router.use(requireAuth);

/** Shared header strip: unread count, plan usage, open requests. */
async function common(user) {
  const [unread, requests, usage] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [user.id]),
    one(`SELECT COUNT(*) AS n FROM collaboration_requests WHERE recipient_id = ? AND status = 'pending'`, [user.id]),
    usageSummary(user),
  ]);
  return { unreadNotifications: unread.n, pendingRequests: requests.n, usage };
}

const publisherPanel = async (user) => {
  const stats = await one(
    `SELECT COUNT(*) AS total,
            SUM(status = 'draft') AS drafts,
            SUM(status = 'pending') AS in_review,
            SUM(status = 'approved') AS approved,
            SUM(status = 'rejected') AS rejected,
            COALESCE(SUM(view_count),0) AS views,
            COALESCE(SUM(save_count),0) AS saves,
            COALESCE(SUM(request_count),0) AS requests
       FROM publications WHERE owner_id = ? AND deleted_at IS NULL`,
    [user.id]
  );
  const recent = await query(
    `SELECT id, slug, title, status, publication_type, view_count, save_count, rejection_reason,
            submitted_at, published_at, updated_at, hidden_until
       FROM publications WHERE owner_id = ? AND deleted_at IS NULL
      ORDER BY updated_at DESC LIMIT 6`,
    [user.id]
  );
  const incoming = await query(
    `SELECT cr.id, cr.request_type, cr.subject, cr.status, cr.proposed_amount, cr.created_at,
            u.full_name AS requester_name, r.code AS requester_role,
            COALESCE(bp.company_name, ip.firm_name) AS requester_org,
            pb.title AS publication_title
       FROM collaboration_requests cr
       JOIN users u ON u.id = cr.requester_id
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       LEFT JOIN investor_profiles ip ON ip.user_id = u.id
       LEFT JOIN publications pb ON pb.id = cr.publication_id
      WHERE cr.recipient_id = ?
      ORDER BY FIELD(cr.status,'pending','accepted','declined'), cr.created_at DESC LIMIT 6`,
    [user.id]
  );
  const sales = await one(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(oi.line_total),0) AS gross
       FROM order_items oi WHERE oi.seller_id = ?`,
    [user.id]
  );
  const listings = await one(
    `SELECT COUNT(*) AS total, SUM(status='active') AS active, SUM(status='pending') AS in_review
       FROM products WHERE seller_id = ? AND deleted_at IS NULL`,
    [user.id]
  );
  return { stats, recent, incoming, sales, listings };
};

const buyerPanel = async (user) => {
  const saved = await query(
    `SELECT pb.id, pb.slug, pb.title, pb.abstract, pb.rating_avg, c.name AS category_name,
            u.full_name AS owner_name, sp.saved_at
       FROM saved_publications sp
       JOIN publications pb ON pb.id = sp.publication_id
       JOIN users u ON u.id = pb.owner_id
       LEFT JOIN categories c ON c.id = pb.category_id
      WHERE sp.user_id = ? AND pb.deleted_at IS NULL AND pb.status = 'approved' AND (pb.hidden_until IS NULL OR pb.hidden_until <= UTC_TIMESTAMP()) ORDER BY sp.saved_at DESC LIMIT 6`,
    [user.id]
  );
  const sent = await query(
    `SELECT cr.id, cr.request_type, cr.subject, cr.status, cr.proposed_amount, cr.created_at,
            u.full_name AS recipient_name, pb.title AS publication_title, pb.slug AS publication_slug
       FROM collaboration_requests cr
       JOIN users u ON u.id = cr.recipient_id
       LEFT JOIN publications pb ON pb.id = cr.publication_id
      WHERE cr.requester_id = ? ORDER BY cr.created_at DESC LIMIT 6`,
    [user.id]
  );
  const meetings = await query(
    `SELECT m.id, m.title, m.proposed_start, m.status, m.meeting_mode, u.full_name AS recipient_name
       FROM meeting_requests m JOIN users u ON u.id = m.recipient_id
      WHERE m.requester_id = ? AND m.proposed_start > NOW()
      ORDER BY m.proposed_start LIMIT 5`,
    [user.id]
  );
  const orders = await one(
    `SELECT COUNT(*) AS total, COALESCE(SUM(grand_total),0) AS spent
       FROM orders WHERE buyer_id = ? AND payment_status = 'paid'`,
    [user.id]
  );
  const matches = await query(
    `SELECT pb.id, pb.slug, pb.title, pb.abstract, pb.funding_required, pb.rating_avg,
            c.name AS category_name, un.name AS university_name, u.full_name AS owner_name
       FROM publications pb
       JOIN users u ON u.id = pb.owner_id
       LEFT JOIN categories c ON c.id = pb.category_id
       LEFT JOIN universities un ON un.id = pb.university_id
      WHERE pb.status = 'approved' AND pb.deleted_at IS NULL AND (pb.hidden_until IS NULL OR pb.hidden_until <= UTC_TIMESTAMP())
        AND (? = 0 OR pb.open_to_investment = 1)
      ORDER BY pb.published_at DESC LIMIT 6`,
    [user.role_code === 'investor' ? 1 : 0]
  );
  return { saved, sent, meetings, orders, matches };
};

router.get(
  '/',
  wrap(async (req, res) => {
    const base = await common(req.user);
    const role = req.user.role_code;
    let panel = {};

    if (role === 'student' || role === 'researcher') {
      panel = await publisherPanel(req.user);
    } else if (role === 'business' || role === 'investor') {
      panel = await buyerPanel(req.user);
    } else if (role === 'university') {
      const uid = req.user.university_id;
      panel = {
        members: await one(
          `SELECT COUNT(*) AS total, SUM(verification_status='pending') AS awaiting
             FROM users WHERE university_id = ? AND deleted_at IS NULL`, [uid]
        ),
        publications: await one(
          `SELECT COUNT(*) AS total, SUM(status='approved') AS approved, SUM(status='pending') AS in_review,
                  COALESCE(SUM(view_count),0) AS views
             FROM publications WHERE university_id = ? AND deleted_at IS NULL`, [uid]
        ),
        pendingVerifications: await query(
          `SELECT v.id, v.created_at, u.full_name, u.email, r.code AS role_code
             FROM verification_requests v JOIN users u ON u.id = v.user_id JOIN roles r ON r.id = u.role_id
            WHERE v.university_id = ? AND v.status = 'pending' ORDER BY v.created_at LIMIT 6`, [uid]
        ),
        topPublications: await query(
          `SELECT id, slug, title, view_count, save_count, request_count
             FROM publications WHERE university_id = ? AND status = 'approved'
            ORDER BY view_count DESC LIMIT 5`, [uid]
        ),
      };
    } else if (role === 'admin') {
      panel = {
        queue: await one(
          `SELECT (SELECT COUNT(*) FROM publications WHERE status='pending' AND deleted_at IS NULL) AS publications,
                  (SELECT COUNT(*) FROM products WHERE status='pending' AND deleted_at IS NULL) AS products`
        ),
        users: await one(
          `SELECT COUNT(*) AS total, SUM(account_status='suspended') AS suspended,
                  SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS new_7d
             FROM users WHERE deleted_at IS NULL`
        ),
        commerce: await one(
          `SELECT COUNT(*) AS orders, COALESCE(SUM(grand_total),0) AS gmv, COALESCE(SUM(platform_fee),0) AS fees
             FROM orders WHERE payment_status='paid'`
        ),
        oldestPending: await query(
          `SELECT pb.id, pb.title, pb.submitted_at, u.full_name AS owner_name
             FROM publications pb JOIN users u ON u.id = pb.owner_id
            WHERE pb.status = 'pending' ORDER BY pb.submitted_at LIMIT 5`
        ),
      };
    }

    res.json({ data: { role, ...base, panel } });
  })
);

module.exports = router;
