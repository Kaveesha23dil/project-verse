'use strict';
const express = require('express');
const { z } = require('zod');
const { query, one, execute } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { wrap, badRequest, notFound } = require('../lib/helpers');

const router = express.Router();

// ---------------------------------------------------------- public profile
router.get(
  '/users/:id',
  wrap(async (req, res) => {
    const user = await one(
      `SELECT u.id, u.full_name, u.headline, u.bio, u.avatar_url, u.city, u.country,
              u.linkedin_url, u.website_url, u.verification_status, u.created_at,
              r.code AS role_code, r.name AS role_name, un.name AS university_name
         FROM users u JOIN roles r ON r.id = u.role_id
         LEFT JOIN universities un ON un.id = u.university_id
        WHERE u.id = ? AND u.deleted_at IS NULL AND u.account_status = 'active'`,
      [req.params.id]
    );
    if (!user) throw notFound('That profile does not exist');

    const extras = {};
    if (user.role_code === 'student') Object.assign(extras, await one('SELECT degree_program, faculty, year_of_study, graduation_year FROM student_profiles WHERE user_id = ?', [user.id]) || {});
    if (user.role_code === 'researcher') Object.assign(extras, await one('SELECT designation, department, research_field, orcid_id FROM researcher_profiles WHERE user_id = ?', [user.id]) || {});
    if (user.role_code === 'business') Object.assign(extras, await one('SELECT company_name, industry, company_size, company_website FROM business_profiles WHERE user_id = ?', [user.id]) || {});
    if (user.role_code === 'investor') Object.assign(extras, await one('SELECT firm_name, investor_type, focus_areas FROM investor_profiles WHERE user_id = ?', [user.id]) || {});

    const publications = await query(
      `SELECT id, slug, title, abstract, publication_type, rating_avg, published_at
         FROM publications WHERE owner_id = ? AND status = 'approved' AND deleted_at IS NULL AND (hidden_until IS NULL OR hidden_until <= UTC_TIMESTAMP())
        ORDER BY published_at DESC LIMIT 12`,
      [user.id]
    );
    const listings = await query(
      `SELECT id, slug, title, price, currency, product_type FROM products
        WHERE seller_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 8`,
      [user.id]
    );
    res.json({ data: { ...user, ...extras, publications, listings } });
  })
);

// -------------------------------------------------------------- my profile
router.put(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      fullName: z.string().min(3).max(120).optional(),
      headline: z.string().max(160).optional().nullable(),
      bio: z.string().max(4000).optional().nullable(),
      phone: z.string().max(30).optional().nullable(),
      avatarUrl: z.string().max(500).optional().nullable(),
      city: z.string().max(80).optional().nullable(),
      country: z.string().max(80).optional().nullable(),
      linkedinUrl: z.string().max(255).optional().nullable(),
      websiteUrl: z.string().max(255).optional().nullable(),
      profile: z.record(z.any()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    const map = {
      fullName: 'full_name', headline: 'headline', bio: 'bio', phone: 'phone',
      avatarUrl: 'avatar_url', city: 'city', country: 'country',
      linkedinUrl: 'linkedin_url', websiteUrl: 'website_url',
    };
    const sets = [];
    const params = [];
    for (const [k, col] of Object.entries(map)) {
      if (d[k] !== undefined) { sets.push(`${col} = ?`); params.push(d[k]); }
    }
    if (sets.length) {
      params.push(req.user.id);
      await execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    // Role extension tables — only the columns that belong to this role are writable.
    const tables = {
      student: { table: 'student_profiles', cols: { studentNumber: 'student_number', faculty: 'faculty', degreeProgram: 'degree_program', yearOfStudy: 'year_of_study', graduationYear: 'graduation_year', supervisorName: 'supervisor_name' } },
      researcher: { table: 'researcher_profiles', cols: { designation: 'designation', department: 'department', researchField: 'research_field', orcidId: 'orcid_id', googleScholar: 'google_scholar' } },
      university: { table: 'university_profiles', cols: { officialRole: 'official_role', department: 'department', officePhone: 'office_phone' } },
      business: { table: 'business_profiles', cols: { companyName: 'company_name', registrationNo: 'registration_no', industry: 'industry', companySize: 'company_size', companyWebsite: 'company_website', interests: 'interests' } },
      investor: { table: 'investor_profiles', cols: { firmName: 'firm_name', investorType: 'investor_type', ticketMin: 'ticket_min', ticketMax: 'ticket_max', focusAreas: 'focus_areas', portfolioUrl: 'portfolio_url' } },
    };
    const spec = tables[req.user.role_code];
    if (spec && d.profile) {
      const s = [];
      const p = [];
      for (const [k, col] of Object.entries(spec.cols)) {
        if (d.profile[k] !== undefined) { s.push(`${col} = ?`); p.push(d.profile[k]); }
      }
      if (s.length) {
        p.push(req.user.id);
        const exists = await one(`SELECT user_id FROM ${spec.table} WHERE user_id = ?`, [req.user.id]);
        if (!exists) await execute(`INSERT INTO ${spec.table} (user_id) VALUES (?)`, [req.user.id]);
        await execute(`UPDATE ${spec.table} SET ${s.join(', ')} WHERE user_id = ?`, p);
      }
    }
    res.json({ message: 'Profile updated' });
  })
);

router.get(
  '/me/profile',
  requireAuth,
  wrap(async (req, res) => {
    const base = await one(
      `SELECT id, full_name, email, phone, headline, bio, avatar_url, city, country,
              linkedin_url, website_url, university_id, verification_status
         FROM users WHERE id = ?`,
      [req.user.id]
    );
    const tables = {
      student: 'student_profiles', researcher: 'researcher_profiles', university: 'university_profiles',
      business: 'business_profiles', investor: 'investor_profiles',
    };
    const t = tables[req.user.role_code];
    const extra = t ? await one(`SELECT * FROM ${t} WHERE user_id = ?`, [req.user.id]) : null;
    res.json({ data: { ...base, profile: extra || {} } });
  })
);

// ------------------------------------------------------------ notifications
router.get(
  '/notifications',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT id, type, title, body, link_url, priority, is_read, created_at
         FROM notifications WHERE user_id = ?
        ORDER BY is_read ASC, FIELD(priority,'priority','normal'), created_at DESC LIMIT 60`,
      [req.user.id]
    );
    const unread = await one('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ data: rows, unread: unread.n });
  })
);

router.post(
  '/notifications/read',
  requireAuth,
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter((n) => Number.isInteger(n)) : null;
    if (ids && ids.length) {
      await execute(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
        [req.user.id, ...ids]
      );
    } else {
      await execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    }
    res.json({ message: 'Marked as read' });
  })
);

// ---------------------------------------------------------------- addresses
router.get(
  '/addresses',
  requireAuth,
  wrap(async (req, res) => res.json({ data: await query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [req.user.id]) }))
);

router.post(
  '/addresses',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      label: z.string().max(40).optional(),
      recipientName: z.string().min(3).max(120),
      phone: z.string().min(7).max(30),
      line1: z.string().min(4).max(200),
      line2: z.string().max(200).optional().nullable(),
      city: z.string().min(2).max(80),
      district: z.string().max(80).optional().nullable(),
      postalCode: z.string().max(20).optional().nullable(),
      country: z.string().max(80).optional(),
      isDefault: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    if (d.isDefault) await execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    const r = await execute(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, line1, line2, city, district, postal_code, country, is_default)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id, d.label || null, d.recipientName, d.phone, d.line1, d.line2 || null,
        d.city, d.district || null, d.postalCode || null, d.country || 'Sri Lanka', d.isDefault ? 1 : 0,
      ]
    );
    res.status(201).json({ id: r.insertId, message: 'Address saved' });
  })
);

router.delete(
  '/addresses/:id',
  requireAuth,
  wrap(async (req, res) => {
    await execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Address removed' });
  })
);

// ----------------------------------------------------------------- taxonomy
// Registration should not depend on unrelated catalogue tables.
router.get('/universities', wrap(async (req, res) => {
  try {
    const universities = await query(
      'SELECT id, name, short_name, city FROM universities WHERE is_active = 1 ORDER BY name'
    );
    res.json({ data: universities, registrationAvailable: true });
  } catch (err) {
    // These are the exact institutions and IDs shipped in 02_seed.sql.
    // Do not allow registration against these IDs while the database is unavailable.
    const unavailable = ['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'];
    if (!unavailable.includes(err.code)) throw err;
    res.json({
      data: [...require('../lib/seed-universities.json')].sort((a, b) => a.name.localeCompare(b.name)),
      registrationAvailable: false,
    });
  }
}));

router.get(
  '/taxonomy',
  wrap(async (req, res) => {
    const [categories, technologies, industries, universities, productCategories] = await Promise.all([
      query('SELECT id, parent_id, name, slug, icon FROM categories WHERE is_active = 1 ORDER BY sort_order, name'),
      query('SELECT id, name, slug, tech_type FROM technologies ORDER BY name'),
      query('SELECT id, name, slug FROM industries ORDER BY name'),
      query('SELECT id, name, short_name, city FROM universities WHERE is_active = 1 ORDER BY name'),
      query('SELECT id, parent_id, name, slug, icon FROM product_categories ORDER BY sort_order, name'),
    ]);
    res.json({ data: { categories, technologies, industries, universities, productCategories } });
  })
);

// Landing page counters and featured shelf
router.get(
  '/discover',
  wrap(async (req, res) => {
    const counts = await one(
      `SELECT (SELECT COUNT(*) FROM publications WHERE status='approved' AND deleted_at IS NULL AND (hidden_until IS NULL OR hidden_until <= UTC_TIMESTAMP())) AS publications,
              (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND account_status='active') AS members,
              (SELECT COUNT(*) FROM universities WHERE is_active=1) AS universities,
              (SELECT COUNT(*) FROM products WHERE status='active' AND deleted_at IS NULL) AS listings,
              (SELECT COUNT(*) FROM collaboration_requests WHERE status='accepted') AS collaborations`
    );
    const featured = await query(
      `SELECT pb.id, pb.slug, pb.title, pb.abstract, pb.publication_type, pb.cover_image_url,
              pb.rating_avg, pb.view_count, c.name AS category_name, un.name AS university_name,
              u.full_name AS owner_name
         FROM publications pb
         JOIN users u ON u.id = pb.owner_id
         LEFT JOIN categories c ON c.id = pb.category_id
         LEFT JOIN universities un ON un.id = pb.university_id
        WHERE pb.status = 'approved' AND pb.deleted_at IS NULL AND (pb.hidden_until IS NULL OR pb.hidden_until <= UTC_TIMESTAMP())
        ORDER BY pb.is_featured DESC, pb.view_count DESC LIMIT 6`
    );
    const topCategories = await query(
      `SELECT c.name, c.slug, COUNT(pb.id) AS n
         FROM categories c LEFT JOIN publications pb ON pb.category_id = c.id AND pb.status = 'approved' AND pb.deleted_at IS NULL AND (pb.hidden_until IS NULL OR pb.hidden_until <= UTC_TIMESTAMP())
        WHERE c.parent_id IS NULL
        GROUP BY c.id ORDER BY n DESC LIMIT 8`
    );
    res.json({ data: { counts, featured, topCategories } });
  })
);

module.exports = router;
