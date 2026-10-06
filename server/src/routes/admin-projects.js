'use strict';
const router = require('express').Router();
const { z } = require('zod');
const { query, transaction } = require('../db');
const { wrap, badRequest, notFound } = require('../lib/helpers');
router.get('/', wrap(async (req, res) => {
  const projects = await query("SELECT p.id, p.title, p.slug, p.status, p.hidden_until, p.hidden_until > UTC_TIMESTAMP() AS is_hidden, u.full_name AS owner_name FROM publications p JOIN users u ON u.id = p.owner_id WHERE p.deleted_at IS NULL ORDER BY p.updated_at DESC");
  res.json({ data: projects });
}));
router.post('/:id/manage', wrap(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) throw badRequest('Invalid project ID');
  const parsed = z.object({ action: z.enum(['hide', 'restore', 'delete']),
    until: z.string().datetime().optional(), reason: z.string().trim().min(5).max(600) }).safeParse(req.body);
  if (!parsed.success) throw badRequest('Choose an action and provide a reason of 5–600 characters');
  const { action, until, reason } = parsed.data;
  const expiry = until ? new Date(until) : null;
  if (action === 'hide' && (!expiry || expiry.getTime() <= Date.now())) throw badRequest('Choose a future date and time');
  await transaction(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM publications WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [req.params.id]);
    const p = rows[0];
    if (!p) throw notFound('That project does not exist');
    if (action === 'hide' && p.status !== 'approved') throw badRequest('Only published projects can be hidden');
    if (action === 'delete') await conn.execute('UPDATE publications SET deleted_at = UTC_TIMESTAMP() WHERE id = ?', [p.id]);
    else await conn.execute('UPDATE publications SET hidden_until = ? WHERE id = ?', [action === 'hide' ? expiry.toISOString().slice(0, 19).replace('T', ' ') : null, p.id]);
    await conn.execute("INSERT INTO moderation_logs (actor_id, entity_type, entity_id, action, from_status, to_status, note) VALUES (?, 'publication', ?, ?, ?, ?, ?)",
      [req.user.id, p.id, action, p.status, action === 'delete' ? 'deleted' : action === 'hide' ? 'hidden' : p.status,
        action === 'hide' ? (reason + ' Until ' + expiry.toISOString()).slice(0, 600) : reason]);
    await conn.execute("INSERT INTO notifications (user_id, type, title, body, link_url, priority) VALUES (?, ?, ?, ?, '/dashboard', 'priority')",
      [p.owner_id, 'publication.' + action, action === 'hide' ? 'Your project is temporarily hidden' : action === 'delete' ? 'Your project was removed' : 'Your project visibility was restored',
        p.title + ': ' + reason + (action === 'hide' ? ' Hidden until ' + expiry.toISOString() : '')]);
  });
  res.json({ message: action === 'hide' ? 'Project hidden until the selected time' : action === 'delete' ? 'Project deleted' : 'Project visibility restored' });
}));
module.exports = router;
