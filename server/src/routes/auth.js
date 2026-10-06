'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { one, execute, transaction } = require('../db');
const { signAccessToken, requireAuth, loadUser } = require('../middleware/auth');
const { wrap, uuid, badRequest, conflict, unauthorized, logActivity } = require('../lib/helpers');

const router = express.Router();

const ROLE_IDS = { student: 1, researcher: 2, university: 3, business: 4, investor: 5 };

const registerSchema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(72),
  role: z.enum(['student', 'researcher', 'university', 'business', 'investor']),
  universityId: z.number().int().positive().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  // role extensions
  studentNumber: z.string().max(40).optional(),
  degreeProgram: z.string().max(160).optional(),
  faculty: z.string().max(120).optional(),
  designation: z.string().max(120).optional(),
  researchField: z.string().max(160).optional(),
  companyName: z.string().max(160).optional(),
  industry: z.string().max(120).optional(),
  firmName: z.string().max(160).optional(),
  investorType: z.enum(['angel', 'vc', 'corporate', 'grant_body', 'individual']).optional(),
  officialRole: z.string().max(120).optional(),
});

router.post(
  '/register',
  wrap(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    const existing = await one('SELECT id FROM users WHERE email = ? LIMIT 1', [d.email]);
    if (existing) throw conflict('That email is already registered', 'email_taken');

    if ((d.role === 'student' || d.role === 'researcher' || d.role === 'university') && !d.universityId) {
      throw badRequest('Choose your university to continue', 'university_required');
    }
    if (d.role === 'business' && !d.companyName) throw badRequest('Company name is required', 'validation');

    const hash = await bcrypt.hash(d.password, 10);

    const userId = await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO users (uuid, role_id, university_id, full_name, email, password_hash, phone,
                            account_status, verification_status)
         VALUES (?,?,?,?,?,?,?, 'active', ?)`,
        [
          uuid(), ROLE_IDS[d.role], d.universityId || null, d.fullName, d.email, hash,
          d.phone || null,
          ['student', 'researcher', 'university'].includes(d.role) ? 'pending' : 'unverified',
        ]
      );
      const id = result.insertId;

      if (d.role === 'student') {
        await conn.execute(
          `INSERT INTO student_profiles (user_id, student_number, faculty, degree_program) VALUES (?,?,?,?)`,
          [id, d.studentNumber || null, d.faculty || null, d.degreeProgram || null]
        );
      } else if (d.role === 'researcher') {
        await conn.execute(
          `INSERT INTO researcher_profiles (user_id, designation, research_field) VALUES (?,?,?)`,
          [id, d.designation || null, d.researchField || null]
        );
      } else if (d.role === 'university') {
        await conn.execute(
          `INSERT INTO university_profiles (user_id, official_role) VALUES (?,?)`,
          [id, d.officialRole || null]
        );
      } else if (d.role === 'business') {
        await conn.execute(
          `INSERT INTO business_profiles (user_id, company_name, industry) VALUES (?,?,?)`,
          [id, d.companyName, d.industry || null]
        );
      } else if (d.role === 'investor') {
        await conn.execute(
          `INSERT INTO investor_profiles (user_id, firm_name, investor_type) VALUES (?,?,?)`,
          [id, d.firmName || null, d.investorType || 'individual']
        );
      }

      // Members of a university queue for verification by their own institution.
      if (['student', 'researcher', 'university'].includes(d.role) && d.universityId) {
        await conn.execute(
          `INSERT INTO verification_requests (user_id, university_id, note) VALUES (?,?,?)`,
          [id, d.universityId, 'Created at registration']
        );
      }
      return id;
    });

    const user = await loadUser(userId);
    req.user = user;
    await logActivity(req, 'auth.register', 'user', userId);
    res.status(201).json({ token: signAccessToken(user), user });
  })
);

router.post(
  '/login',
  wrap(async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Enter your email and password', 'validation');

    const row = await one(
      `SELECT u.id, u.password_hash, u.account_status
         FROM users u WHERE u.email = ? AND u.deleted_at IS NULL LIMIT 1`,
      [parsed.data.email]
    );
    // Same message either way — never confirm which half was wrong.
    if (!row) throw unauthorized('Email or password is incorrect');
    const ok = await bcrypt.compare(parsed.data.password, row.password_hash);
    if (!ok) throw unauthorized('Email or password is incorrect');
    if (row.account_status === 'suspended') throw unauthorized('This account is suspended. Contact support.');

    await execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [row.id]);
    const user = await loadUser(row.id);
    req.user = user;
    await logActivity(req, 'auth.login', 'user', row.id);
    res.json({ token: signAccessToken(user), user });
  })
);

router.get('/me', requireAuth, wrap(async (req, res) => res.json({ user: req.user })));

router.post(
  '/change-password',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('New password must be at least 8 characters', 'validation');

    const row = await one('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const ok = await bcrypt.compare(parsed.data.currentPassword, row.password_hash);
    if (!ok) throw badRequest('Current password is incorrect', 'wrong_password');

    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [
      await bcrypt.hash(parsed.data.newPassword, 10), req.user.id,
    ]);
    await logActivity(req, 'auth.password_changed', 'user', req.user.id);
    res.json({ message: 'Password changed' });
  })
);

module.exports = router;
