'use strict';
const express = require('express');
const { z } = require('zod');
const { query, one, execute } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { METRICS, consume, requirePremium } = require('../middleware/quota');
const { wrap, notify, badRequest, forbidden, notFound, logActivity } = require('../lib/helpers');

const router = express.Router();

// ------------------------------------------------ collaboration / investment
router.post(
  '/collaboration',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      publicationId: z.number().int().positive().optional().nullable(),
      recipientId: z.number().int().positive(),
      requestType: z.enum(['collaboration', 'investment', 'licensing', 'mentorship']).default('collaboration'),
      subject: z.string().min(5).max(180),
      message: z.string().min(20).max(4000),
      proposedAmount: z.number().nonnegative().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    if (d.recipientId === req.user.id) throw badRequest('You cannot send a request to yourself', 'self_request');
    const recipient = await one('SELECT id, full_name FROM users WHERE id = ? AND account_status = "active"', [d.recipientId]);
    if (!recipient) throw notFound('That user is not available');

    if (d.publicationId) {
      const pub = await one(`SELECT id, owner_id, open_to_collaboration, open_to_investment FROM publications WHERE id = ? AND status = 'approved' AND deleted_at IS NULL AND (hidden_until IS NULL OR hidden_until <= UTC_TIMESTAMP())`, [d.publicationId]);
      if (!pub) throw notFound('That publication does not exist');
      if (d.requestType === 'investment' && !pub.open_to_investment) {
        throw badRequest('This publication is not open to investment', 'not_open');
      }
    }

    // Metered on Basic: 3 outgoing requests a month.
    const quota = await consume(req.user, METRICS.REQUEST);

    const result = await execute(
      `INSERT INTO collaboration_requests
         (publication_id, requester_id, recipient_id, request_type, subject, message, proposed_amount)
       VALUES (?,?,?,?,?,?,?)`,
      [d.publicationId || null, req.user.id, d.recipientId, d.requestType, d.subject, d.message, d.proposedAmount ?? null]
    );
    if (d.publicationId) {
      await execute('UPDATE publications SET request_count = request_count + 1 WHERE id = ?', [d.publicationId]);
    }
    await notify(d.recipientId, {
      type: 'request.received',
      title: d.requestType === 'investment' ? 'New investment request' : 'New collaboration request',
      body: `${req.user.full_name}: ${d.subject}`,
      link: '/requests',
      priority: req.user.plan_code === 'premium' ? 'priority' : 'normal',
    });
    await logActivity(req, 'request.sent', 'collaboration_request', result.insertId);
    res.status(201).json({ id: result.insertId, quota, message: 'Request sent' });
  })
);

// Requests I received
router.get(
  '/inbox',
  requireAuth,
  wrap(async (req, res) => {
    const status = req.query.status;
    const params = [req.user.id];
    let filter = '';
    if (status) { filter = 'AND cr.status = ?'; params.push(status); }

    const rows = await query(
      `SELECT cr.*, u.full_name AS requester_name, u.avatar_url AS requester_avatar,
              u.headline AS requester_headline, r.code AS requester_role,
              pb.title AS publication_title, pb.slug AS publication_slug,
              COALESCE(bp.company_name, ip.firm_name) AS requester_org
         FROM collaboration_requests cr
         JOIN users u ON u.id = cr.requester_id
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN business_profiles bp ON bp.user_id = u.id
         LEFT JOIN investor_profiles ip ON ip.user_id = u.id
         LEFT JOIN publications pb ON pb.id = cr.publication_id
        WHERE cr.recipient_id = ? ${filter}
        ORDER BY FIELD(cr.status,'pending','accepted','declined','withdrawn','closed'), cr.created_at DESC`,
      params
    );
    res.json({ data: rows });
  })
);

// Requests I sent
router.get(
  '/sent',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT cr.*, u.full_name AS recipient_name, u.avatar_url AS recipient_avatar,
              r.code AS recipient_role, pb.title AS publication_title, pb.slug AS publication_slug
         FROM collaboration_requests cr
         JOIN users u ON u.id = cr.recipient_id
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN publications pb ON pb.id = cr.publication_id
        WHERE cr.requester_id = ?
        ORDER BY cr.created_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  })
);

router.patch(
  '/collaboration/:id',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      status: z.enum(['accepted', 'declined', 'withdrawn', 'closed']),
      responseNote: z.string().max(1000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose a valid response', 'validation');

    const reqRow = await one('SELECT * FROM collaboration_requests WHERE id = ?', [req.params.id]);
    if (!reqRow) throw notFound('That request does not exist');

    const isRecipient = reqRow.recipient_id === req.user.id;
    const isRequester = reqRow.requester_id === req.user.id;
    if (!isRecipient && !isRequester) throw forbidden('This request is not yours');
    if (parsed.data.status === 'withdrawn' && !isRequester) throw forbidden('Only the sender can withdraw a request');
    if (['accepted', 'declined'].includes(parsed.data.status) && !isRecipient) {
      throw forbidden('Only the recipient can respond to a request');
    }
    if (reqRow.status !== 'pending') throw badRequest('This request was already answered', 'already_answered');

    await execute(
      `UPDATE collaboration_requests SET status = ?, response_note = ?, responded_at = NOW() WHERE id = ?`,
      [parsed.data.status, parsed.data.responseNote || null, reqRow.id]
    );

    const target = isRecipient ? reqRow.requester_id : reqRow.recipient_id;
    await notify(target, {
      type: `request.${parsed.data.status}`,
      title: `Request ${parsed.data.status}`,
      body: `${req.user.full_name} ${parsed.data.status} "${reqRow.subject}".`,
      link: '/requests',
      priority: parsed.data.status === 'accepted' ? 'priority' : 'normal',
    });

    // An accepted request opens a private thread between the two parties.
    if (parsed.data.status === 'accepted') {
      const conv = await execute(
        `INSERT INTO conversations (subject, publication_id, request_id, last_message_at) VALUES (?,?,?,NOW())`,
        [reqRow.subject, reqRow.publication_id, reqRow.id]
      );
      for (const uid of [reqRow.requester_id, reqRow.recipient_id]) {
        await execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [conv.insertId, uid]);
      }
      await execute(
        'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)',
        [conv.insertId, req.user.id, parsed.data.responseNote || 'Request accepted. Let us take this forward.']
      );
    }
    res.json({ status: parsed.data.status, message: `Request ${parsed.data.status}` });
  })
);

// ------------------------------------------------------------- threads
// Accepting a request opens a private thread. These endpoints are what let the
// two parties actually carry the collaboration forward.
router.get(
  '/threads',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT c.id, c.subject, c.last_message_at, c.publication_id,
              pb.title AS publication_title, pb.slug AS publication_slug,
              other.id AS other_id, other.full_name AS other_name, other.avatar_url AS other_avatar,
              r.code AS other_role,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id
                ORDER BY m.sent_at DESC LIMIT 1) AS last_body,
              (SELECT COUNT(*) FROM messages m
                WHERE m.conversation_id = c.id AND m.sender_id <> ?
                  AND (cp.last_read_at IS NULL OR m.sent_at > cp.last_read_at)) AS unread
         FROM conversation_participants cp
         JOIN conversations c ON c.id = cp.conversation_id
         JOIN conversation_participants op ON op.conversation_id = c.id AND op.user_id <> cp.user_id
         JOIN users other ON other.id = op.user_id
         JOIN roles r ON r.id = other.role_id
         LEFT JOIN publications pb ON pb.id = c.publication_id
        WHERE cp.user_id = ?
        ORDER BY c.last_message_at DESC, c.id DESC`,
      [req.user.id, req.user.id]
    );
    res.json({ data: rows });
  })
);

router.get(
  '/threads/:id',
  requireAuth,
  wrap(async (req, res) => {
    const seat = await one(
      'SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!seat) throw forbidden('That conversation is not yours');

    const messages = await query(
      `SELECT m.id, m.body, m.attachment_url, m.sent_at, m.sender_id,
              u.full_name AS sender_name, u.avatar_url AS sender_avatar
         FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ? ORDER BY m.sent_at ASC`,
      [req.params.id]
    );
    await execute(
      'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ data: messages });
  })
);

router.post(
  '/threads/:id',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({ body: z.string().min(1).max(4000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Write a message first', 'validation');

    const seat = await one(
      'SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!seat) throw forbidden('That conversation is not yours');

    const result = await execute(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)',
      [req.params.id, req.user.id, parsed.data.body]
    );
    await execute('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [req.params.id]);

    const other = await one(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id <> ?',
      [req.params.id, req.user.id]
    );
    if (other) {
      await notify(other.user_id, {
        type: 'message.received',
        title: `New message from ${req.user.full_name}`,
        body: parsed.data.body.slice(0, 140),
        link: `/requests?tab=threads&thread=${req.params.id}`,
      });
    }
    res.status(201).json({ id: result.insertId, message: 'Message sent' });
  })
);

// ------------------------------------------------------ meetings (Premium)
router.post(
  '/meetings',
  requireAuth,
  requirePremium('Scheduling meetings with project owners'),
  wrap(async (req, res) => {
    const schema = z.object({
      publicationId: z.number().int().positive().optional().nullable(),
      recipientId: z.number().int().positive(),
      title: z.string().min(5).max(180),
      agenda: z.string().max(2000).optional(),
      meetingMode: z.enum(['online', 'onsite']).default('online'),
      location: z.string().max(255).optional().nullable(),
      meetingLink: z.string().max(255).optional().nullable(),
      proposedStart: z.string().min(10),
      proposedEnd: z.string().min(10),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    if (new Date(d.proposedEnd) <= new Date(d.proposedStart)) {
      throw badRequest('The meeting must end after it starts', 'validation');
    }
    if (new Date(d.proposedStart) < new Date()) {
      throw badRequest('Choose a time in the future', 'validation');
    }
    await consume(req.user, METRICS.MEETING);

    const result = await execute(
      `INSERT INTO meeting_requests
         (publication_id, requester_id, recipient_id, title, agenda, meeting_mode, location, meeting_link, proposed_start, proposed_end)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        d.publicationId || null, req.user.id, d.recipientId, d.title, d.agenda || null,
        d.meetingMode, d.location || null, d.meetingLink || null,
        new Date(d.proposedStart), new Date(d.proposedEnd),
      ]
    );
    await notify(d.recipientId, {
      type: 'meeting.requested',
      title: 'Meeting request',
      body: `${req.user.full_name} proposed "${d.title}".`,
      link: '/requests?tab=meetings',
      priority: 'priority',
    });
    res.status(201).json({ id: result.insertId, message: 'Meeting request sent' });
  })
);

router.get(
  '/meetings',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT m.*, ru.full_name AS requester_name, tu.full_name AS recipient_name,
              pb.title AS publication_title
         FROM meeting_requests m
         JOIN users ru ON ru.id = m.requester_id
         JOIN users tu ON tu.id = m.recipient_id
         LEFT JOIN publications pb ON pb.id = m.publication_id
        WHERE m.requester_id = ? OR m.recipient_id = ?
        ORDER BY m.proposed_start ASC`,
      [req.user.id, req.user.id]
    );
    res.json({ data: rows.map((r) => ({ ...r, direction: r.requester_id === req.user.id ? 'sent' : 'received' })) });
  })
);

router.patch(
  '/meetings/:id',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      status: z.enum(['accepted', 'declined', 'cancelled', 'completed']),
      responseNote: z.string().max(600).optional(),
      meetingLink: z.string().max(255).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose a valid response', 'validation');

    const row = await one('SELECT * FROM meeting_requests WHERE id = ?', [req.params.id]);
    if (!row) throw notFound('That meeting does not exist');
    if (![row.requester_id, row.recipient_id].includes(req.user.id)) throw forbidden('This meeting is not yours');

    await execute(
      `UPDATE meeting_requests SET status = ?, response_note = ?, meeting_link = COALESCE(?, meeting_link), responded_at = NOW() WHERE id = ?`,
      [parsed.data.status, parsed.data.responseNote || null, parsed.data.meetingLink || null, row.id]
    );
    const target = req.user.id === row.recipient_id ? row.requester_id : row.recipient_id;
    await notify(target, {
      type: `meeting.${parsed.data.status}`,
      title: `Meeting ${parsed.data.status}`,
      body: `${req.user.full_name} ${parsed.data.status} "${row.title}".`,
      link: '/requests?tab=meetings',
      priority: 'priority',
    });
    res.json({ status: parsed.data.status, message: `Meeting ${parsed.data.status}` });
  })
);

// ---------------------------------------------- document access decisions
router.get(
  '/documents',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT d.*, pb.title AS publication_title, pb.slug AS publication_slug,
              ru.full_name AS requester_name, ru.headline AS requester_headline,
              doc.file_name
         FROM document_access_requests d
         JOIN publications pb ON pb.id = d.publication_id
         JOIN users ru ON ru.id = d.requester_id
         LEFT JOIN publication_documents doc ON doc.id = d.document_id
        WHERE d.owner_id = ? OR d.requester_id = ?
        ORDER BY d.created_at DESC`,
      [req.user.id, req.user.id]
    );
    res.json({ data: rows.map((r) => ({ ...r, direction: r.owner_id === req.user.id ? 'received' : 'sent' })) });
  })
);

router.patch(
  '/documents/:id',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({ status: z.enum(['granted', 'denied']), days: z.number().int().min(1).max(365).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose grant or deny', 'validation');

    const row = await one('SELECT * FROM document_access_requests WHERE id = ?', [req.params.id]);
    if (!row) throw notFound('That request does not exist');
    if (row.owner_id !== req.user.id) throw forbidden('Only the owner can answer this request');

    const until = parsed.data.status === 'granted'
      ? new Date(Date.now() + (parsed.data.days || 30) * 86400000)
      : null;

    await execute(
      `UPDATE document_access_requests SET status = ?, granted_until = ?, responded_at = NOW() WHERE id = ?`,
      [parsed.data.status, until, row.id]
    );
    await notify(row.requester_id, {
      type: `document.${parsed.data.status}`,
      title: parsed.data.status === 'granted' ? 'Document access granted' : 'Document access denied',
      body: parsed.data.status === 'granted'
        ? `You can download the documents until ${until.toISOString().slice(0, 10)}.`
        : 'The owner did not grant access this time.',
      link: '/requests?tab=documents',
      priority: 'priority',
    });
    res.json({ status: parsed.data.status, message: `Access ${parsed.data.status}` });
  })
);

module.exports = router;
