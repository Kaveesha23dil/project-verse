'use strict';
const express = require('express');
const { z } = require('zod');
const { query, one, execute, transaction } = require('../db');
const { requireAuth, optionalAuth, requirePublisher } = require('../middleware/auth');
const { METRICS, consume, requirePremium } = require('../middleware/quota');
const {
  wrap, uuid, uniqueSlug, paginate, meta, notify, notifyAdmins,
  badRequest, forbidden, notFound, periodKey, logActivity,
} = require('../lib/helpers');

const router = express.Router();

const bodySchema = z.object({
  title: z.string().min(8).max(220),
  abstract: z.string().min(40).max(1200),
  description: z.string().max(20000).optional().nullable(),
  methodology: z.string().max(8000).optional().nullable(),
  results: z.string().max(8000).optional().nullable(),
  publicationType: z.enum(['final_year_project', 'research_paper', 'innovation', 'prototype', 'patent', 'thesis', 'dataset']),
  categoryId: z.number().int().positive().optional().nullable(),
  industryId: z.number().int().positive().optional().nullable(),
  keywords: z.string().max(400).optional().nullable(),
  coverImageUrl: z.string().max(500).optional().nullable(),
  demoUrl: z.string().max(500).optional().nullable(),
  repositoryUrl: z.string().max(500).optional().nullable(),
  academicYear: z.string().max(12).optional().nullable(),
  completionDate: z.string().max(10).optional().nullable(),
  openToCollaboration: z.boolean().optional(),
  openToInvestment: z.boolean().optional(),
  fundingRequired: z.number().nonnegative().optional().nullable(),
  technologyIds: z.array(z.number().int().positive()).max(20).optional(),
  coAuthors: z.array(z.object({
    displayName: z.string().min(2).max(120),
    affiliation: z.string().max(160).optional().nullable(),
    authorRole: z.enum(['lead', 'co_author', 'supervisor', 'contributor']).optional(),
  })).max(15).optional(),
});

// ---------------------------------------------------------------- browse
// Public listing. Only approved publications are ever returned here.
router.get(
  '/',
  optionalAuth,
  wrap(async (req, res) => {
    const { page, size, offset } = paginate(req.query);
    const isPremium = req.user?.plan_code === 'premium';
    const where = ["pb.status = 'approved'", 'pb.deleted_at IS NULL', '(pb.hidden_until IS NULL OR pb.hidden_until <= UTC_TIMESTAMP())'];
    const params = [];

    if (req.query.q) {
      where.push('(MATCH(pb.title, pb.abstract, pb.keywords) AGAINST (? IN NATURAL LANGUAGE MODE) OR pb.title LIKE ?)');
      params.push(req.query.q, `%${req.query.q}%`);
    }
    if (req.query.type) { where.push('pb.publication_type = ?'); params.push(req.query.type); }
    if (req.query.category) { where.push('c.slug = ?'); params.push(req.query.category); }
    if (req.query.collaboration === 'true') where.push('pb.open_to_collaboration = 1');
    if (req.query.investment === 'true') where.push('pb.open_to_investment = 1');

    // Advanced filters are a Premium feature — Basic gets category and keyword only.
    const advanced = ['technology', 'university', 'industry', 'minRating'].filter((k) => req.query[k]);
    if (advanced.length && !isPremium) {
      return res.status(402).json({
        error: 'Filtering by technology, university and industry is available on Premium.',
        code: 'premium_required',
        upgradeTo: 'premium',
      });
    }
    if (req.query.technology) {
      where.push('EXISTS (SELECT 1 FROM publication_technologies pt JOIN technologies t ON t.id = pt.technology_id WHERE pt.publication_id = pb.id AND t.slug = ?)');
      params.push(req.query.technology);
    }
    if (req.query.university) { where.push('pb.university_id = ?'); params.push(Number(req.query.university)); }
    if (req.query.industry) { where.push('pb.industry_id = ?'); params.push(Number(req.query.industry)); }
    if (req.query.minRating) { where.push('pb.rating_avg >= ?'); params.push(Number(req.query.minRating)); }

    const sortMap = {
      recent: 'pb.published_at DESC',
      popular: 'pb.view_count DESC',
      saved: 'pb.save_count DESC',
      rating: 'pb.rating_avg DESC, pb.rating_count DESC',
    };
    const orderBy = sortMap[req.query.sort] || sortMap.recent;
    const whereSql = where.join(' AND ');

    const rows = await query(
      `SELECT pb.id, pb.uuid, pb.slug, pb.title, pb.abstract, pb.publication_type, pb.cover_image_url,
              pb.published_at, pb.view_count, pb.save_count, pb.rating_avg, pb.rating_count,
              pb.open_to_collaboration, pb.open_to_investment, pb.funding_required,
              c.name AS category_name, c.slug AS category_slug,
              un.name AS university_name,
              u.id AS owner_id, u.full_name AS owner_name, u.avatar_url AS owner_avatar, r.code AS owner_role,
              (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',')
                 FROM publication_technologies pt JOIN technologies t ON t.id = pt.technology_id
                WHERE pt.publication_id = pb.id) AS technologies
         FROM publications pb
         JOIN users u ON u.id = pb.owner_id
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN categories c ON c.id = pb.category_id
         LEFT JOIN universities un ON un.id = pb.university_id
        WHERE ${whereSql}
        ORDER BY ${orderBy}
        LIMIT ${size} OFFSET ${offset}`,
      params
    );

    const totalRow = await one(
      `SELECT COUNT(*) AS n FROM publications pb
         LEFT JOIN categories c ON c.id = pb.category_id
        WHERE ${whereSql}`,
      params
    );

    res.json({
      data: rows.map((r) => ({ ...r, technologies: r.technologies ? r.technologies.split(',') : [] })),
      meta: meta(page, size, totalRow.n),
    });
  })
);

// ------------------------------------------------------------ my content
router.get(
  '/mine',
  requireAuth,
  requirePublisher,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT pb.id, pb.slug, pb.title, pb.status, pb.publication_type, pb.abstract,
              pb.submitted_at, pb.published_at, pb.rejection_reason, pb.view_count, pb.save_count,
              pb.request_count, pb.rating_avg, pb.updated_at, pb.hidden_until,
              c.name AS category_name
         FROM publications pb
         LEFT JOIN categories c ON c.id = pb.category_id
        WHERE pb.owner_id = ? AND pb.deleted_at IS NULL
        ORDER BY FIELD(pb.status,'rejected','pending','draft','approved','archived'), pb.updated_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  })
);

router.get(
  '/saved',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT pb.id, pb.slug, pb.title, pb.abstract, pb.publication_type, pb.cover_image_url,
              pb.rating_avg, sp.saved_at, u.full_name AS owner_name, c.name AS category_name
         FROM saved_publications sp
         JOIN publications pb ON pb.id = sp.publication_id
         JOIN users u ON u.id = pb.owner_id
         LEFT JOIN categories c ON c.id = pb.category_id
        WHERE sp.user_id = ? AND pb.deleted_at IS NULL AND pb.status = 'approved' AND (pb.hidden_until IS NULL OR pb.hidden_until <= UTC_TIMESTAMP())
        ORDER BY sp.saved_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  })
);

// ---------------------------------------------------------- edit source
// The editor needs every field back, not the summary the listing returns.
// Owner-only, and never metered — you are not "viewing" your own draft.
router.get(
  '/:id/edit',
  requireAuth,
  wrap(async (req, res) => {
    const pub = await one(
      'SELECT * FROM publications WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!pub) throw notFound('That publication does not exist');
    if (pub.owner_id !== req.user.id) throw forbidden('That publication is not yours');

    const technologies = await query(
      'SELECT technology_id FROM publication_technologies WHERE publication_id = ?',
      [pub.id]
    );

    res.json({
      data: {
        id: pub.id,
        slug: pub.slug,
        status: pub.status,
        title: pub.title,
        abstract: pub.abstract,
        description: pub.description,
        methodology: pub.methodology,
        results: pub.results,
        publicationType: pub.publication_type,
        categoryId: pub.category_id,
        industryId: pub.industry_id,
        keywords: pub.keywords,
        demoUrl: pub.demo_url,
        repositoryUrl: pub.repository_url,
        academicYear: pub.academic_year,
        openToCollaboration: !!pub.open_to_collaboration,
        openToInvestment: !!pub.open_to_investment,
        fundingRequired: pub.funding_required,
        rejectionReason: pub.rejection_reason,
        technologyIds: technologies.map((t) => t.technology_id),
      },
    });
  })
);

// ------------------------------------------------------------- detail
// Full detail is metered: Basic accounts get 20 distinct publications a month.
// Re-opening one already counted this month is free, and owners are never charged.
router.get(
  '/:slug',
  optionalAuth,
  wrap(async (req, res) => {
    const pub = await one(
      `SELECT pb.*, c.name AS category_name, c.slug AS category_slug,
              i.name AS industry_name, un.name AS university_name,
              u.full_name AS owner_name, u.avatar_url AS owner_avatar, u.headline AS owner_headline,
              u.email AS owner_email, r.code AS owner_role
         FROM publications pb
         JOIN users u ON u.id = pb.owner_id
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN categories c ON c.id = pb.category_id
         LEFT JOIN industries i ON i.id = pb.industry_id
         LEFT JOIN universities un ON un.id = pb.university_id
        WHERE pb.slug = ? AND pb.deleted_at IS NULL LIMIT 1`,
      [req.params.slug]
    );
    if (!pub) throw notFound('That publication does not exist');

    const isOwner = req.user?.id === pub.owner_id;
    const isAdmin = req.user?.role_code === 'admin';
    const isUniStaff = req.user?.role_code === 'university' && req.user.university_id === pub.university_id;

    if ((pub.status !== 'approved' || (pub.hidden_until && new Date(pub.hidden_until).getTime() > Date.now())) && !isOwner && !isAdmin && !isUniStaff) {
      throw notFound('That publication does not exist');
    }

    const technologies = await query(
      `SELECT t.id, t.name, t.slug FROM publication_technologies pt
         JOIN technologies t ON t.id = pt.technology_id WHERE pt.publication_id = ?`,
      [pub.id]
    );
    const authors = await query(
      `SELECT display_name, affiliation, author_role, user_id FROM publication_authors
        WHERE publication_id = ? ORDER BY author_order`,
      [pub.id]
    );
    const feedback = await query(
      `SELECT f.rating, f.comment, f.created_at, u.full_name, u.avatar_url
         FROM publication_feedback f JOIN users u ON u.id = f.user_id
        WHERE f.publication_id = ? AND f.status = 'visible' ORDER BY f.created_at DESC LIMIT 20`,
      [pub.id]
    );

    // Card-level fields every visitor sees.
    const card = {
      id: pub.id, slug: pub.slug, title: pub.title, abstract: pub.abstract,
      publicationType: pub.publication_type, status: pub.status,
      coverImageUrl: pub.cover_image_url, categoryName: pub.category_name,
      universityName: pub.university_name, publishedAt: pub.published_at,
      viewCount: pub.view_count, saveCount: pub.save_count,
      ratingAvg: pub.rating_avg, ratingCount: pub.rating_count,
      openToCollaboration: !!pub.open_to_collaboration,
      openToInvestment: !!pub.open_to_investment,
      owner: {
        id: pub.owner_id, name: pub.owner_name, avatarUrl: pub.owner_avatar,
        headline: pub.owner_headline, role: pub.owner_role,
      },
      technologies, authors,
    };

    if (!req.user) {
      return res.json({ data: card, access: { level: 'preview', reason: 'sign_in_required' } });
    }

    let quota = null;
    if (!isOwner && !isAdmin && pub.status === 'approved') {
      const already = await one(
        `SELECT id FROM publication_views
          WHERE user_id = ? AND publication_id = ? AND period_key = ? LIMIT 1`,
        [req.user.id, pub.id, periodKey()]
      );
      if (!already) {
        try {
          quota = await consume(req.user, METRICS.FULL_VIEW);
        } catch (err) {
          if (err.code === 'quota_exceeded') {
            return res.status(402).json({
              data: card,
              access: { level: 'preview', reason: 'quota_exceeded' },
              error: err.message,
              code: err.code,
              upgradeTo: 'premium',
            });
          }
          throw err;
        }
        await execute(
          `INSERT IGNORE INTO publication_views (publication_id, user_id, period_key, ip_address)
           VALUES (?,?,?,?)`,
          [pub.id, req.user.id, periodKey(), req.ip?.slice(0, 45) || null]
        );
        await execute('UPDATE publications SET view_count = view_count + 1 WHERE id = ?', [pub.id]);
      }
    }

    const documents = await query(
      `SELECT id, file_name, file_type, file_size_kb, doc_type, access_level
         FROM publication_documents WHERE publication_id = ?`,
      [pub.id]
    );
    const grantedDocs = await query(
      `SELECT document_id FROM document_access_requests
        WHERE requester_id = ? AND publication_id = ? AND status = 'granted'`,
      [req.user.id, pub.id]
    );
    const grantedIds = new Set(grantedDocs.map((d) => d.document_id));

    const saved = await one(
      'SELECT 1 AS yes FROM saved_publications WHERE user_id = ? AND publication_id = ? LIMIT 1',
      [req.user.id, pub.id]
    );

    res.json({
      data: {
        ...card,
        description: pub.description,
        methodology: pub.methodology,
        results: pub.results,
        keywords: pub.keywords,
        demoUrl: pub.demo_url,
        repositoryUrl: pub.repository_url,
        academicYear: pub.academic_year,
        completionDate: pub.completion_date,
        fundingRequired: pub.funding_required,
        fundingCurrency: pub.funding_currency,
        rejectionReason: isOwner || isAdmin ? pub.rejection_reason : undefined,
        ownerEmail: isOwner || isAdmin ? pub.owner_email : undefined,
        documents: documents.map((d) => ({
          ...d,
          downloadable: isOwner || isAdmin || d.access_level === 'public' || grantedIds.has(d.id),
        })),
        feedback,
        isSaved: !!saved,
        isOwner,
      },
      access: { level: 'full', quota },
    });
  })
);

// -------------------------------------------------------------- create
router.post(
  '/',
  requireAuth,
  requirePublisher,
  wrap(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;
    const slug = await uniqueSlug('publications', d.title);

    const id = await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO publications
           (uuid, owner_id, university_id, category_id, industry_id, title, slug, publication_type,
            abstract, description, methodology, results, keywords, cover_image_url, demo_url,
            repository_url, academic_year, completion_date, open_to_collaboration, open_to_investment,
            funding_required, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'draft')`,
        [
          uuid(), req.user.id, req.user.university_id || null, d.categoryId || null, d.industryId || null,
          d.title, slug, d.publicationType, d.abstract, d.description || null, d.methodology || null,
          d.results || null, d.keywords || null, d.coverImageUrl || null, d.demoUrl || null,
          d.repositoryUrl || null, d.academicYear || null, d.completionDate || null,
          d.openToCollaboration === false ? 0 : 1, d.openToInvestment ? 1 : 0, d.fundingRequired ?? null,
        ]
      );
      const pubId = result.insertId;

      for (const techId of d.technologyIds || []) {
        await conn.execute(
          'INSERT IGNORE INTO publication_technologies (publication_id, technology_id) VALUES (?,?)',
          [pubId, techId]
        );
        await conn.execute('UPDATE technologies SET usage_count = usage_count + 1 WHERE id = ?', [techId]);
      }

      await conn.execute(
        `INSERT INTO publication_authors (publication_id, user_id, display_name, affiliation, author_role, author_order)
         VALUES (?,?,?,?, 'lead', 1)`,
        [pubId, req.user.id, req.user.full_name, req.user.university_name || null]
      );
      let order = 2;
      for (const a of d.coAuthors || []) {
        await conn.execute(
          `INSERT INTO publication_authors (publication_id, display_name, affiliation, author_role, author_order)
           VALUES (?,?,?,?,?)`,
          [pubId, a.displayName, a.affiliation || null, a.authorRole || 'co_author', order++]
        );
      }
      return pubId;
    });

    await logActivity(req, 'publication.created', 'publication', id);
    const created = await one('SELECT id, slug, title, status FROM publications WHERE id = ? AND deleted_at IS NULL', [id]);
    res.status(201).json({ data: created, message: 'Saved as a draft' });
  })
);

// -------------------------------------------------------------- update
router.put(
  '/:id',
  requireAuth,
  requirePublisher,
  wrap(async (req, res) => {
    const pub = await one('SELECT id, owner_id, status FROM publications WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');
    if (pub.owner_id !== req.user.id) throw forbidden('You can only edit your own publications');
    if (['pending', 'approved'].includes(pub.status)) {
      throw badRequest(
        pub.status === 'pending'
          ? 'This publication is with the administrator for review. Withdraw it first to make changes.'
          : 'Approved publications are locked. Contact an administrator to request an edit.',
        'locked'
      );
    }

    const parsed = bodySchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    const map = {
      title: 'title', abstract: 'abstract', description: 'description', methodology: 'methodology',
      results: 'results', publicationType: 'publication_type', categoryId: 'category_id',
      industryId: 'industry_id', keywords: 'keywords', coverImageUrl: 'cover_image_url',
      demoUrl: 'demo_url', repositoryUrl: 'repository_url', academicYear: 'academic_year',
      completionDate: 'completion_date', fundingRequired: 'funding_required',
    };
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(map)) {
      if (d[key] !== undefined) { sets.push(`${column} = ?`); params.push(d[key]); }
    }
    if (d.openToCollaboration !== undefined) { sets.push('open_to_collaboration = ?'); params.push(d.openToCollaboration ? 1 : 0); }
    if (d.openToInvestment !== undefined) { sets.push('open_to_investment = ?'); params.push(d.openToInvestment ? 1 : 0); }

    if (sets.length) {
      params.push(pub.id);
      await execute(`UPDATE publications SET ${sets.join(', ')} WHERE id = ?`, params);
    }
    if (d.technologyIds) {
      await execute('DELETE FROM publication_technologies WHERE publication_id = ?', [pub.id]);
      for (const t of d.technologyIds) {
        await execute('INSERT IGNORE INTO publication_technologies (publication_id, technology_id) VALUES (?,?)', [pub.id, t]);
      }
    }
    await logActivity(req, 'publication.updated', 'publication', pub.id);
    res.json({ message: 'Changes saved' });
  })
);

// -------------------------------------------------- submit for approval
router.post(
  '/:id/submit',
  requireAuth,
  requirePublisher,
  wrap(async (req, res) => {
    const pub = await one(
      'SELECT id, owner_id, status, title, abstract, category_id FROM publications WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!pub) throw notFound('That publication does not exist');
    if (pub.owner_id !== req.user.id) throw forbidden('You can only publish your own work');
    if (!['draft', 'rejected'].includes(pub.status)) {
      throw badRequest('Only a draft can be sent for approval', 'invalid_state');
    }
    if (!pub.category_id) throw badRequest('Choose a category before publishing', 'category_required');

    await execute(
      `UPDATE publications SET status = 'pending', rejection_reason = NULL WHERE id = ?`,
      [pub.id]
    );
    await notifyAdmins({
      type: 'moderation.new_submission',
      title: 'A publication is waiting for review',
      body: `"${pub.title}" was submitted by ${req.user.full_name}.`,
      link: '/admin?tab=moderation',
    });
    await notify(req.user.id, {
      type: 'publication.submitted',
      title: 'Sent for approval',
      body: `"${pub.title}" is with the administrator. You will be notified once it is reviewed.`,
      link: '/dashboard',
    });
    await logActivity(req, 'publication.submitted', 'publication', pub.id);
    res.json({ status: 'pending', message: 'Sent for approval' });
  })
);

router.post(
  '/:id/withdraw',
  requireAuth,
  requirePublisher,
  wrap(async (req, res) => {
    const pub = await one('SELECT id, owner_id, status FROM publications WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');
    if (pub.owner_id !== req.user.id) throw forbidden('You can only withdraw your own work');
    if (pub.status !== 'pending') throw badRequest('Only a publication under review can be withdrawn', 'invalid_state');
    await execute(`UPDATE publications SET status = 'draft' WHERE id = ?`, [pub.id]);
    res.json({ status: 'draft', message: 'Moved back to drafts' });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requirePublisher,
  wrap(async (req, res) => {
    const pub = await one('SELECT id, owner_id, status FROM publications WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');
    if (pub.owner_id !== req.user.id) throw forbidden('You can only delete your own work');
    await execute('UPDATE publications SET deleted_at = NOW() WHERE id = ?', [pub.id]);
    await logActivity(req, 'publication.deleted', 'publication', pub.id);
    res.json({ message: 'Publication deleted' });
  })
);

// ------------------------------------------------------------ save / unsave
router.post(
  '/:id/save',
  requireAuth,
  wrap(async (req, res) => {
    const pub = await one(`SELECT id, title FROM publications WHERE id = ? AND status = 'approved' AND deleted_at IS NULL AND (hidden_until IS NULL OR hidden_until <= UTC_TIMESTAMP())`, [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');

    const already = await one('SELECT 1 AS yes FROM saved_publications WHERE user_id = ? AND publication_id = ?', [req.user.id, pub.id]);
    if (already) return res.json({ saved: true, message: 'Already saved' });

    // Saves are a standing total on Basic, so check the count rather than a monthly meter.
    if (req.user.plan_code !== 'premium') {
      const count = await one('SELECT COUNT(*) AS n FROM saved_publications WHERE user_id = ?', [req.user.id]);
      const limit = await one(`SELECT monthly_limit FROM plan_limits WHERE plan_id = 1 AND metric = 'saved_publication'`);
      if (count.n >= limit.monthly_limit) {
        return res.status(402).json({
          error: `Basic saves up to ${limit.monthly_limit} publications. Remove one or upgrade for unlimited saves.`,
          code: 'quota_exceeded', metric: 'saved_publication', limit: limit.monthly_limit, upgradeTo: 'premium',
        });
      }
    }
    await execute('INSERT INTO saved_publications (user_id, publication_id) VALUES (?,?)', [req.user.id, pub.id]);
    res.status(201).json({ saved: true, message: 'Saved' });
  })
);

router.delete(
  '/:id/save',
  requireAuth,
  wrap(async (req, res) => {
    await execute('DELETE FROM saved_publications WHERE user_id = ? AND publication_id = ?', [req.user.id, req.params.id]);
    res.json({ saved: false, message: 'Removed from saved' });
  })
);

// -------------------------------------------------------------- feedback
router.post(
  '/:id/feedback',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Give a rating between 1 and 5', 'validation');

    const pub = await one(`SELECT id, owner_id, title FROM publications WHERE id = ? AND status = 'approved' AND deleted_at IS NULL AND (hidden_until IS NULL OR hidden_until <= UTC_TIMESTAMP())`, [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');
    if (pub.owner_id === req.user.id) throw badRequest('You cannot review your own publication', 'own_content');

    await execute(
      `INSERT INTO publication_feedback (publication_id, user_id, rating, comment)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [pub.id, req.user.id, parsed.data.rating, parsed.data.comment || null]
    );
    await notify(pub.owner_id, {
      type: 'publication.feedback',
      title: 'New feedback on your publication',
      body: `${req.user.full_name} rated "${pub.title}" ${parsed.data.rating} out of 5.`,
      link: `/publications/${req.params.id}`,
    });
    res.status(201).json({ message: 'Feedback posted' });
  })
);

// ------------------------------------------- document access (Premium)
router.post(
  '/:id/document-access',
  requireAuth,
  requirePremium('Requesting project documents'),
  wrap(async (req, res) => {
    const schema = z.object({ documentId: z.number().int().positive().optional(), reason: z.string().min(15).max(800) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Tell the owner why you need the documents (at least 15 characters)', 'validation');

    const pub = await one(`SELECT id, owner_id, title FROM publications WHERE id = ? AND status = 'approved' AND deleted_at IS NULL AND (hidden_until IS NULL OR hidden_until <= UTC_TIMESTAMP())`, [req.params.id]);
    if (!pub) throw notFound('That publication does not exist');
    if (pub.owner_id === req.user.id) throw badRequest('You already own these documents', 'own_content');

    await consume(req.user, METRICS.DOCUMENT);
    const result = await execute(
      `INSERT INTO document_access_requests (document_id, publication_id, requester_id, owner_id, reason)
       VALUES (?,?,?,?,?)`,
      [parsed.data.documentId || null, pub.id, req.user.id, pub.owner_id, parsed.data.reason]
    );
    await notify(pub.owner_id, {
      type: 'document.access_requested',
      title: 'Someone requested your project documents',
      body: `${req.user.full_name} asked for access to documents on "${pub.title}".`,
      link: '/requests',
      priority: 'priority',
    });
    res.status(201).json({ id: result.insertId, message: 'Request sent to the owner' });
  })
);

module.exports = router;
