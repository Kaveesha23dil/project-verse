'use strict';
const express = require('express');
const { z } = require('zod');
const { query, one, execute } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { wrap, notify, badRequest, forbidden, notFound, logActivity } = require('../lib/helpers');

const router = express.Router();
router.use(requireAuth, requireRole('university'));

function requireAffiliation(req) {
  if (!req.user.university_id) throw forbidden('This account is not linked to a university yet');
  return req.user.university_id;
}

// -------------------------------------------------------------- overview
router.get(
  '/stats',
  wrap(async (req, res) => {
    const uid = requireAffiliation(req);
    const [members, publications, pendingVerifications, collaborations] = await Promise.all([
      one(
        `SELECT COUNT(*) AS total,
                SUM(r.code = 'student') AS students,
                SUM(r.code = 'researcher') AS researchers,
                SUM(u.verification_status = 'verified') AS verified,
                SUM(u.verification_status = 'pending') AS awaiting
           FROM users u JOIN roles r ON r.id = u.role_id
          WHERE u.university_id = ? AND u.deleted_at IS NULL`,
        [uid]
      ),
      one(
        `SELECT COUNT(*) AS total,
                SUM(status = 'approved') AS approved,
                SUM(status = 'pending') AS in_review,
                COALESCE(SUM(view_count),0) AS views,
                COALESCE(SUM(save_count),0) AS saves
           FROM publications WHERE university_id = ? AND deleted_at IS NULL`,
        [uid]
      ),
      one('SELECT COUNT(*) AS n FROM verification_requests WHERE university_id = ? AND status = "pending"', [uid]),
      one(
        `SELECT COUNT(*) AS total, SUM(cr.status = 'accepted') AS accepted
           FROM collaboration_requests cr
           JOIN publications pb ON pb.id = cr.publication_id
          WHERE pb.university_id = ?`,
        [uid]
      ),
    ]);
    const topPublications = await query(
      `SELECT id, slug, title, view_count, save_count, request_count, rating_avg, status
         FROM publications WHERE university_id = ? AND status = 'approved' AND deleted_at IS NULL
        ORDER BY view_count DESC LIMIT 8`,
      [uid]
    );
    res.json({ data: { members, publications, pendingVerifications: pendingVerifications.n, collaborations, topPublications } });
  })
);

// ------------------------------------------------------------ verification
router.get(
  '/verifications',
  wrap(async (req, res) => {
    const uid = requireAffiliation(req);
    const rows = await query(
      `SELECT v.*, u.full_name, u.email, u.created_at AS registered_at, r.code AS role_code,
              sp.student_number, sp.degree_program, sp.faculty,
              rp.designation, rp.department
         FROM verification_requests v
         JOIN users u ON u.id = v.user_id
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN researcher_profiles rp ON rp.user_id = u.id
        WHERE v.university_id = ?
        ORDER BY FIELD(v.status,'pending','approved','rejected'), v.created_at ASC`,
      [uid]
    );
    res.json({ data: rows });
  })
);

router.post(
  '/verifications/:id',
  wrap(async (req, res) => {
    const uid = requireAffiliation(req);
    const schema = z.object({ decision: z.enum(['approved', 'rejected']), note: z.string().max(500).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose approve or reject', 'validation');

    const row = await one('SELECT * FROM verification_requests WHERE id = ?', [req.params.id]);
    if (!row) throw notFound('That request does not exist');
    if (row.university_id !== uid) throw forbidden('That request belongs to another university');
    if (row.status !== 'pending') throw badRequest('This request was already answered', 'already_answered');

    await execute(
      `UPDATE verification_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE id = ?`,
      [parsed.data.decision, req.user.id, parsed.data.note || null, row.id]
    );
    await execute(
      `UPDATE users SET verification_status = ?, verified_by_user_id = ?, verified_at = ? WHERE id = ?`,
      [
        parsed.data.decision === 'approved' ? 'verified' : 'rejected',
        parsed.data.decision === 'approved' ? req.user.id : null,
        parsed.data.decision === 'approved' ? new Date() : null,
        row.user_id,
      ]
    );
    await notify(row.user_id, {
      type: `verification.${parsed.data.decision}`,
      title: parsed.data.decision === 'approved' ? 'Your university verified you' : 'Verification was not approved',
      body: parsed.data.decision === 'approved'
        ? 'Your publications now carry your university badge.'
        : parsed.data.note || 'Contact your faculty office for the correct evidence.',
      link: '/settings/profile',
      priority: 'priority',
    });
    await logActivity(req, `verification.${parsed.data.decision}`, 'user', row.user_id);
    res.json({ message: `Member ${parsed.data.decision}` });
  })
);

// ------------------------------------------------------------- members
router.get(
  '/members',
  wrap(async (req, res) => {
    const uid = requireAffiliation(req);
    const rows = await query(
      `SELECT u.id, u.full_name, u.email, u.verification_status, u.account_status, u.created_at,
              r.code AS role_code, sp.degree_program, sp.year_of_study, rp.designation, rp.research_field,
              (SELECT COUNT(*) FROM publications pb WHERE pb.owner_id = u.id AND pb.status = 'approved') AS approved_publications
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN researcher_profiles rp ON rp.user_id = u.id
        WHERE u.university_id = ? AND u.deleted_at IS NULL AND r.code IN ('student','researcher')
        ORDER BY u.full_name`,
      [uid]
    );
    res.json({ data: rows });
  })
);

// -------------------------------------------------------- monitor projects
router.get(
  '/publications',
  wrap(async (req, res) => {
    const uid = requireAffiliation(req);
    const params = [uid];
    let filter = '';
    if (req.query.status) { filter = 'AND pb.status = ?'; params.push(req.query.status); }
    const rows = await query(
      `SELECT pb.id, pb.slug, pb.title, pb.status, pb.publication_type, pb.submitted_at, pb.published_at,
              pb.view_count, pb.save_count, pb.request_count, pb.rating_avg, pb.is_featured,
              u.full_name AS owner_name, r.code AS owner_role, c.name AS category_name
         FROM publications pb
         JOIN users u ON u.id = pb.owner_id
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN categories c ON c.id = pb.category_id
        WHERE pb.university_id = ? AND pb.deleted_at IS NULL ${filter}
        ORDER BY pb.updated_at DESC`,
      params
    );
    res.json({ data: rows });
  })
);

// Universities promote their own approved work onto the featured shelf.
router.post(
  '/publications/:id/feature',
  wrap(async (req, res) => {
    const uid = requireAffiliation(req);
    const pub = await one('SELECT id, title, owner_id, university_id, status, is_featured FROM publications WHERE id = ?', [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');
    if (pub.university_id !== uid) throw forbidden('That publication belongs to another university');
    if (pub.status !== 'approved') throw badRequest('Only an approved publication can be promoted', 'invalid_state');

    const next = pub.is_featured ? 0 : 1;
    await execute('UPDATE publications SET is_featured = ? WHERE id = ?', [next, pub.id]);
    if (next) {
      await notify(pub.owner_id, {
        type: 'publication.featured',
        title: 'Your university promoted your work',
        body: `"${pub.title}" is on the featured shelf.`,
        link: `/publications/${pub.id}`,
        priority: 'priority',
      });
    }
    res.json({ isFeatured: !!next, message: next ? 'Promoted to featured' : 'Removed from featured' });
  })
);

// Collaboration oversight across the institution
router.get(
  '/collaborations',
  wrap(async (req, res) => {
    const uid = requireAffiliation(req);
    const rows = await query(
      `SELECT cr.id, cr.request_type, cr.subject, cr.status, cr.proposed_amount, cr.created_at,
              pb.title AS publication_title, pb.slug AS publication_slug,
              owner.full_name AS member_name, requester.full_name AS partner_name,
              rr.code AS partner_role, COALESCE(bp.company_name, ip.firm_name) AS partner_org
         FROM collaboration_requests cr
         JOIN publications pb ON pb.id = cr.publication_id
         JOIN users owner ON owner.id = cr.recipient_id
         JOIN users requester ON requester.id = cr.requester_id
         JOIN roles rr ON rr.id = requester.role_id
         LEFT JOIN business_profiles bp ON bp.user_id = requester.id
         LEFT JOIN investor_profiles ip ON ip.user_id = requester.id
        WHERE pb.university_id = ?
        ORDER BY cr.created_at DESC LIMIT 100`,
      [uid]
    );
    res.json({ data: rows });
  })
);

module.exports = router;
