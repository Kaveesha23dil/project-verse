'use strict';
const express = require('express');
const { z } = require('zod');
const { query, one, execute, transaction } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  wrap, uuid, uniqueSlug, paginate, meta, notify, notifyAdmins,
  badRequest, forbidden, notFound, orderNumber, logActivity,
} = require('../lib/helpers');

const router = express.Router();
const FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 5);

// Every role can sell in the marketplace except the administrator.
const SELLER_ROLES = ['student', 'researcher', 'university', 'business', 'investor'];

const productSchema = z.object({
  title: z.string().min(6).max(200),
  shortDescription: z.string().max(400).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  categoryId: z.number().int().positive(),
  publicationId: z.number().int().positive().optional().nullable(),
  productType: z.enum(['physical', 'digital', 'service', 'dataset', 'license', 'component']),
  conditionType: z.enum(['new', 'used', 'prototype', 'not_applicable']).optional(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional().nullable(),
  stockQuantity: z.number().int().min(0).optional(),
  isDigital: z.boolean().optional(),
  digitalFileUrl: z.string().max(500).optional().nullable(),
  shippingFee: z.number().nonnegative().optional(),
  shipsFromCity: z.string().max(80).optional().nullable(),
  images: z.array(z.string().max(500)).max(8).optional(),
  attributes: z.array(z.object({ name: z.string().max(80), value: z.string().max(240) })).max(20).optional(),
});

// ------------------------------------------------------------- browse
router.get(
  '/products',
  optionalAuth,
  wrap(async (req, res) => {
    const { page, size, offset } = paginate(req.query);
    const where = ["p.status = 'active'", 'p.deleted_at IS NULL'];
    const params = [];

    if (req.query.q) {
      where.push('(MATCH(p.title, p.short_description, p.description) AGAINST (? IN NATURAL LANGUAGE MODE) OR p.title LIKE ?)');
      params.push(req.query.q, `%${req.query.q}%`);
    }
    if (req.query.category) { where.push('pc.slug = ?'); params.push(req.query.category); }
    if (req.query.type) { where.push('p.product_type = ?'); params.push(req.query.type); }
    if (req.query.sellerRole) { where.push('r.code = ?'); params.push(req.query.sellerRole); }
    if (req.query.minPrice) { where.push('p.price >= ?'); params.push(Number(req.query.minPrice)); }
    if (req.query.maxPrice) { where.push('p.price <= ?'); params.push(Number(req.query.maxPrice)); }

    const sortMap = {
      recent: 'p.created_at DESC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      popular: 'p.sold_count DESC',
      rating: 'p.rating_avg DESC',
    };
    const orderBy = sortMap[req.query.sort] || sortMap.recent;
    const whereSql = where.join(' AND ');

    const rows = await query(
      `SELECT p.id, p.uuid, p.slug, p.title, p.short_description, p.price, p.compare_at_price, p.currency,
              p.product_type, p.condition_type, p.stock_quantity, p.is_digital, p.shipping_fee,
              p.rating_avg, p.rating_count, p.sold_count, p.created_at,
              pc.name AS category_name, pc.slug AS category_slug,
              s.id AS seller_id, s.full_name AS seller_name, r.code AS seller_role,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id
                ORDER BY pi.is_primary DESC, pi.position LIMIT 1) AS image_url
         FROM products p
         JOIN product_categories pc ON pc.id = p.category_id
         JOIN users s ON s.id = p.seller_id
         JOIN roles r ON r.id = s.role_id
        WHERE ${whereSql}
        ORDER BY ${orderBy}
        LIMIT ${size} OFFSET ${offset}`,
      params
    );
    const total = await one(
      `SELECT COUNT(*) AS n FROM products p
         JOIN product_categories pc ON pc.id = p.category_id
         JOIN users s ON s.id = p.seller_id
         JOIN roles r ON r.id = s.role_id
        WHERE ${whereSql}`,
      params
    );
    res.json({ data: rows, meta: meta(page, size, total.n) });
  })
);

router.get(
  '/products/mine',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT p.*, pc.name AS category_name,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image_url
         FROM products p JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.seller_id = ? AND p.deleted_at IS NULL
        ORDER BY FIELD(p.status,'rejected','pending','draft','active','out_of_stock','archived'), p.updated_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  })
);

router.get(
  '/products/:slug',
  optionalAuth,
  wrap(async (req, res) => {
    const product = await one(
      `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug,
              s.full_name AS seller_name, s.avatar_url AS seller_avatar, s.headline AS seller_headline,
              r.code AS seller_role, un.name AS seller_university,
              pb.title AS publication_title, pb.slug AS publication_slug
         FROM products p
         JOIN product_categories pc ON pc.id = p.category_id
         JOIN users s ON s.id = p.seller_id
         JOIN roles r ON r.id = s.role_id
         LEFT JOIN universities un ON un.id = s.university_id
         LEFT JOIN publications pb ON pb.id = p.publication_id
        WHERE p.slug = ? AND p.deleted_at IS NULL LIMIT 1`,
      [req.params.slug]
    );
    if (!product) throw notFound('That listing does not exist');

    const isSeller = req.user?.id === product.seller_id;
    const isAdmin = req.user?.role_code === 'admin';
    if (!['active', 'out_of_stock'].includes(product.status) && !isSeller && !isAdmin) {
      throw notFound('That listing does not exist');
    }

    const [images, attributes, reviews] = await Promise.all([
      query('SELECT image_url, alt_text, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, position', [product.id]),
      query('SELECT attr_name, attr_value FROM product_attributes WHERE product_id = ?', [product.id]),
      query(
        `SELECT pr.rating, pr.comment, pr.created_at, u.full_name, u.avatar_url
           FROM product_reviews pr JOIN users u ON u.id = pr.buyer_id
          WHERE pr.product_id = ? AND pr.status = 'visible' ORDER BY pr.created_at DESC LIMIT 20`,
        [product.id]
      ),
    ]);
    await execute('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id]);
    res.json({ data: { ...product, images, attributes, reviews, isSeller } });
  })
);

// ------------------------------------------------------------- selling
router.post(
  '/products',
  requireAuth,
  wrap(async (req, res) => {
    if (!SELLER_ROLES.includes(req.user.role_code)) throw forbidden('Administrator accounts do not sell');
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    if (d.publicationId) {
      const owns = await one('SELECT id FROM publications WHERE id = ? AND owner_id = ?', [d.publicationId, req.user.id]);
      if (!owns) throw forbidden('You can only link your own publication to a listing');
    }
    const isDigital = d.isDigital ?? ['digital', 'dataset', 'license'].includes(d.productType);
    if (!isDigital && (d.stockQuantity ?? 0) <= 0) throw badRequest('Set the stock quantity for a physical item', 'validation');

    const slug = await uniqueSlug('products', d.title);
    const id = await transaction(async (conn) => {
      const [r] = await conn.execute(
        `INSERT INTO products
           (uuid, seller_id, publication_id, category_id, title, slug, short_description, description,
            product_type, condition_type, price, compare_at_price, stock_quantity, is_digital,
            digital_file_url, shipping_fee, ships_from_city, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
        [
          uuid(), req.user.id, d.publicationId || null, d.categoryId, d.title, slug,
          d.shortDescription || null, d.description || null, d.productType,
          d.conditionType || (isDigital ? 'not_applicable' : 'new'), d.price, d.compareAtPrice ?? null,
          isDigital ? 0 : d.stockQuantity, isDigital ? 1 : 0, d.digitalFileUrl || null,
          isDigital ? 0 : (d.shippingFee ?? 0), d.shipsFromCity || null,
        ]
      );
      const pid = r.insertId;
      let pos = 0;
      for (const url of d.images || []) {
        await conn.execute(
          'INSERT INTO product_images (product_id, image_url, position, is_primary) VALUES (?,?,?,?)',
          [pid, url, pos, pos === 0 ? 1 : 0]
        );
        pos += 1;
      }
      for (const a of d.attributes || []) {
        await conn.execute('INSERT INTO product_attributes (product_id, attr_name, attr_value) VALUES (?,?,?)', [pid, a.name, a.value]);
      }
      return pid;
    });

    await notifyAdmins({
      type: 'moderation.new_product',
      title: 'A listing is waiting for review',
      body: `"${d.title}" was submitted by ${req.user.full_name}.`,
      link: '/admin?tab=moderation',
    });
    await logActivity(req, 'product.created', 'product', id);
    res.status(201).json({ id, slug, status: 'pending', message: 'Listing sent for approval' });
  })
);

router.put(
  '/products/:id',
  requireAuth,
  wrap(async (req, res) => {
    const product = await one('SELECT id, seller_id, status FROM products WHERE id = ?', [req.params.id]);
    if (!product) throw notFound('That listing does not exist');
    if (product.seller_id !== req.user.id) throw forbidden('You can only edit your own listings');

    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message, 'validation');
    const d = parsed.data;

    const map = {
      title: 'title', shortDescription: 'short_description', description: 'description',
      categoryId: 'category_id', productType: 'product_type', conditionType: 'condition_type',
      price: 'price', compareAtPrice: 'compare_at_price', stockQuantity: 'stock_quantity',
      digitalFileUrl: 'digital_file_url', shippingFee: 'shipping_fee', shipsFromCity: 'ships_from_city',
    };
    const sets = [];
    const params = [];
    for (const [k, col] of Object.entries(map)) {
      if (d[k] !== undefined) { sets.push(`${col} = ?`); params.push(d[k]); }
    }
    // Any edit to an approved listing sends it back through review.
    if (product.status === 'active') sets.push("status = 'pending'");
    if (!sets.length) return res.json({ message: 'Nothing to change' });

    params.push(product.id);
    await execute(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ message: product.status === 'active' ? 'Saved. The listing is back in review.' : 'Changes saved' });
  })
);

router.delete(
  '/products/:id',
  requireAuth,
  wrap(async (req, res) => {
    const product = await one('SELECT id, seller_id FROM products WHERE id = ?', [req.params.id]);
    if (!product) throw notFound('That listing does not exist');
    if (product.seller_id !== req.user.id) throw forbidden('You can only remove your own listings');
    await execute('UPDATE products SET deleted_at = NOW(), status = "archived" WHERE id = ?', [product.id]);
    res.json({ message: 'Listing removed' });
  })
);

// ---------------------------------------------------------------- cart
async function cartFor(userId) {
  let cart = await one('SELECT id FROM carts WHERE user_id = ?', [userId]);
  if (!cart) {
    const r = await execute('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    cart = { id: r.insertId };
  }
  return cart;
}

router.get(
  '/cart',
  requireAuth,
  wrap(async (req, res) => {
    const cart = await cartFor(req.user.id);
    const items = await query(
      `SELECT ci.id, ci.quantity, p.id AS product_id, p.title, p.slug, p.price, p.currency,
              p.shipping_fee, p.stock_quantity, p.is_digital, p.status, p.seller_id,
              s.full_name AS seller_name,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image_url
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         JOIN users s ON s.id = p.seller_id
        WHERE ci.cart_id = ?
        ORDER BY ci.added_at DESC`,
      [cart.id]
    );
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = items.reduce((sum, i) => sum + (i.is_digital ? 0 : Number(i.shipping_fee)), 0);
    const fee = Number(((subtotal * FEE_PERCENT) / 100).toFixed(2));
    res.json({
      data: { items, totals: { subtotal, shipping, platformFee: fee, grandTotal: Number((subtotal + shipping + fee).toFixed(2)) } },
    });
  })
);

router.post(
  '/cart',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(50).default(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose a valid product and quantity', 'validation');

    const product = await one(`SELECT id, seller_id, stock_quantity, is_digital, status FROM products WHERE id = ?`, [parsed.data.productId]);
    if (!product || product.status !== 'active') throw notFound('That listing is not available');
    if (product.seller_id === req.user.id) throw badRequest('You cannot buy your own listing', 'own_product');
    if (!product.is_digital && product.stock_quantity < parsed.data.quantity) {
      throw badRequest(`Only ${product.stock_quantity} left in stock`, 'insufficient_stock');
    }

    const cart = await cartFor(req.user.id);
    await execute(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [cart.id, product.id, parsed.data.quantity]
    );
    res.status(201).json({ message: 'Added to cart' });
  })
);

router.patch(
  '/cart/:itemId',
  requireAuth,
  wrap(async (req, res) => {
    const qty = Number(req.body.quantity);
    if (!Number.isInteger(qty) || qty < 0 || qty > 50) throw badRequest('Enter a quantity between 0 and 50', 'validation');
    const cart = await cartFor(req.user.id);
    if (qty === 0) {
      await execute('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [req.params.itemId, cart.id]);
      return res.json({ message: 'Removed from cart' });
    }
    await execute('UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?', [qty, req.params.itemId, cart.id]);
    res.json({ message: 'Cart updated' });
  })
);

router.delete(
  '/cart/:itemId',
  requireAuth,
  wrap(async (req, res) => {
    const cart = await cartFor(req.user.id);
    await execute('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [req.params.itemId, cart.id]);
    res.json({ message: 'Removed from cart' });
  })
);

// ------------------------------------------------------------ checkout
router.post(
  '/checkout',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      shippingAddressId: z.number().int().positive().optional().nullable(),
      paymentMethodId: z.number().int().positive().optional().nullable(),
      buyerNote: z.string().max(600).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Check your delivery and payment details', 'validation');

    const cart = await cartFor(req.user.id);
    const items = await query(
      `SELECT ci.quantity, p.id, p.title, p.price, p.shipping_fee, p.stock_quantity,
              p.is_digital, p.seller_id, p.status,
              (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image_url
         FROM cart_items ci JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = ?`,
      [cart.id]
    );
    if (!items.length) throw badRequest('Your cart is empty', 'empty_cart');

    const physical = items.filter((i) => !i.is_digital);
    if (physical.length && !parsed.data.shippingAddressId) {
      throw badRequest('Choose a delivery address for the physical items', 'address_required');
    }
    for (const i of items) {
      if (i.status !== 'active') throw badRequest(`"${i.title}" is no longer available`, 'unavailable');
      if (!i.is_digital && i.stock_quantity < i.quantity) throw badRequest(`Only ${i.stock_quantity} of "${i.title}" left`, 'insufficient_stock');
    }

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping = physical.reduce((s, i) => s + Number(i.shipping_fee), 0);
    const fee = Number(((subtotal * FEE_PERCENT) / 100).toFixed(2));
    const grand = Number((subtotal + shipping + fee).toFixed(2));

    const order = await transaction(async (conn) => {
      const orderNo = orderNumber();
      const [r] = await conn.execute(
        `INSERT INTO orders (order_no, buyer_id, shipping_address_id, subtotal, shipping_total,
                             platform_fee, grand_total, order_status, payment_status, payment_method_id, buyer_note)
         VALUES (?,?,?,?,?,?,?, 'paid', 'paid', ?, ?)`,
        [
          orderNo, req.user.id, parsed.data.shippingAddressId || null, subtotal, shipping, fee, grand,
          parsed.data.paymentMethodId || null, parsed.data.buyerNote || null,
        ]
      );
      const orderId = r.insertId;

      for (const i of items) {
        const [it] = await conn.execute(
          `INSERT INTO order_items (order_id, product_id, seller_id, title_snapshot, image_snapshot,
                                    unit_price, quantity, line_total, item_status)
           VALUES (?,?,?,?,?,?,?,?, 'confirmed')`,
          [orderId, i.id, i.seller_id, i.title, i.image_url, i.price, i.quantity, i.price * i.quantity]
        );
        if (!i.is_digital) {
          await conn.execute('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [i.quantity, i.id]);
        }
        await conn.execute('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [i.quantity, i.id]);

        const gross = i.price * i.quantity;
        const sellerFee = Number(((gross * FEE_PERCENT) / 100).toFixed(2));
        await conn.execute(
          `INSERT INTO seller_payouts (seller_id, order_item_id, gross_amount, fee_amount, net_amount)
           VALUES (?,?,?,?,?)`,
          [i.seller_id, it.insertId, gross, sellerFee, Number((gross - sellerFee).toFixed(2))]
        );
      }
      await conn.execute('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
      return { id: orderId, orderNo, grand };
    });

    const sellers = [...new Set(items.map((i) => i.seller_id))];
    await Promise.all(
      sellers.map((sid) =>
        notify(sid, {
          type: 'order.received',
          title: 'You made a sale',
          body: `Order ${order.orderNo} includes one of your listings.`,
          link: '/dashboard?tab=sales',
          priority: 'priority',
        })
      )
    );
    await notify(req.user.id, {
      type: 'order.paid',
      title: 'Order confirmed',
      body: `Order ${order.orderNo} is confirmed. Total $${order.grand.toFixed(2)}.`,
      link: `/orders/${order.orderNo}`,
    });
    await logActivity(req, 'order.placed', 'order', order.id);
    res.status(201).json({ data: order, message: 'Order placed' });
  })
);

// ------------------------------------------------------------- orders
router.get(
  '/orders',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT o.*, COUNT(oi.id) AS item_count
         FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.buyer_id = ?
        GROUP BY o.id
        ORDER BY o.placed_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  })
);

router.get(
  '/orders/:orderNo',
  requireAuth,
  wrap(async (req, res) => {
    const order = await one('SELECT * FROM orders WHERE order_no = ?', [req.params.orderNo]);
    if (!order) throw notFound('That order does not exist');
    const items = await query(
      `SELECT oi.*, u.full_name AS seller_name, p.slug AS product_slug
         FROM order_items oi JOIN users u ON u.id = oi.seller_id
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?`,
      [order.id]
    );
    const isBuyer = order.buyer_id === req.user.id;
    const isSeller = items.some((i) => i.seller_id === req.user.id);
    if (!isBuyer && !isSeller && req.user.role_code !== 'admin') throw forbidden('This order is not yours');

    const address = order.shipping_address_id
      ? await one('SELECT * FROM addresses WHERE id = ?', [order.shipping_address_id])
      : null;
    res.json({ data: { ...order, items: isBuyer || req.user.role_code === 'admin' ? items : items.filter((i) => i.seller_id === req.user.id), address } });
  })
);

// Seller view of incoming sales
router.get(
  '/sales',
  requireAuth,
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT oi.*, o.order_no, o.placed_at, o.order_status, b.full_name AS buyer_name,
              a.city AS ship_city, a.recipient_name
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN users b ON b.id = o.buyer_id
         LEFT JOIN addresses a ON a.id = o.shipping_address_id
        WHERE oi.seller_id = ?
        ORDER BY o.placed_at DESC`,
      [req.user.id]
    );
    const payouts = await one(
      `SELECT COALESCE(SUM(net_amount),0) AS total, COALESCE(SUM(CASE WHEN status='pending' THEN net_amount END),0) AS pending
         FROM seller_payouts WHERE seller_id = ?`,
      [req.user.id]
    );
    res.json({ data: rows, payouts });
  })
);

router.patch(
  '/sales/:itemId',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({
      itemStatus: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled']),
      trackingNo: z.string().max(80).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Choose a valid status', 'validation');

    const item = await one('SELECT oi.*, o.order_no, o.buyer_id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.id = ?', [req.params.itemId]);
    if (!item) throw notFound('That order item does not exist');
    if (item.seller_id !== req.user.id) throw forbidden('This sale is not yours');

    await execute('UPDATE order_items SET item_status = ?, tracking_no = COALESCE(?, tracking_no) WHERE id = ?', [
      parsed.data.itemStatus, parsed.data.trackingNo || null, item.id,
    ]);
    await notify(item.buyer_id, {
      type: `order.${parsed.data.itemStatus}`,
      title: `Order ${item.order_no} ${parsed.data.itemStatus}`,
      body: `"${item.title_snapshot}" is now ${parsed.data.itemStatus}.`,
      link: `/orders/${item.order_no}`,
    });
    res.json({ message: 'Status updated' });
  })
);

router.post(
  '/products/:id/review',
  requireAuth,
  wrap(async (req, res) => {
    const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Give a rating between 1 and 5', 'validation');

    const bought = await one(
      `SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.buyer_id = ? AND oi.product_id = ? AND o.payment_status = 'paid' LIMIT 1`,
      [req.user.id, req.params.id]
    );
    if (!bought) throw badRequest('Only buyers can review a listing', 'not_a_buyer');

    await execute(
      `INSERT INTO product_reviews (product_id, order_item_id, buyer_id, rating, comment)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [req.params.id, bought.id, req.user.id, parsed.data.rating, parsed.data.comment || null]
    );
    res.status(201).json({ message: 'Review posted' });
  })
);

module.exports = router;
