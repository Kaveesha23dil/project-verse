'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { pool, one, execute } = require('../src/db');
const { signAccessToken } = require('../src/middleware/auth');
const app = require('../src/app');

test('admin deletion and timed project visibility', async () => {
  const admin = await one("SELECT u.id, u.email, r.code AS role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'admin' AND u.deleted_at IS NULL LIMIT 1");
  const member = await one("SELECT u.id, u.email, r.code AS role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'student' AND u.deleted_at IS NULL AND u.account_status = 'active' LIMIT 1");
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const uuid = randomUUID();
  const slug = 'visibility-test-' + uuid;
  const title = 'Visibility fixture ' + uuid;
  let id;
  const request = async (path, token, body) => {
    const response = await fetch(base + path, { method: body ? 'POST' : 'GET',
      headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const result = await execute("INSERT INTO publications (uuid, owner_id, title, slug, abstract, status) VALUES (?, ?, ?, ?, 'Temporary test fixture only', 'approved')", [uuid, admin.id, title, slug]);
    id = result.insertId;
    const token = signAccessToken(admin);
    const path = '/admin/projects/' + id + '/manage';
    const reason = 'Integration verification fixture';
    assert.equal((await request(path, null, { action: 'delete', reason })).status, 401);
    assert.equal((await request(path, signAccessToken(member), { action: 'delete', reason })).status, 403);
    assert.equal((await request('/publications/' + slug)).status, 200);
    assert.equal((await request(path, token, { action: 'hide', reason, until: new Date(Date.now() - 60000).toISOString() })).status, 400);
    assert.equal((await request(path, token, { action: 'hide', reason: 'no', until: new Date(Date.now() + 60000).toISOString() })).status, 400);
    assert.equal((await request(path, token, { action: 'hide', reason, until: new Date(Date.now() + 60000).toISOString() })).status, 200);
    assert.equal((await request('/publications/' + slug)).status, 404);
    assert.equal((await request('/publications/' + slug, token)).status, 200);
    assert.equal((await request('/publications?q=' + encodeURIComponent(title))).body.data.some(p => p.id === id), false);
    assert.equal((await request('/admin/projects', token)).body.data.find(p => p.id === id).is_hidden, 1);
    assert.equal((await request(path, token, { action: 'restore', reason })).status, 200);
    assert.equal((await request('/publications/' + slug)).status, 200);
    await request(path, token, { action: 'hide', reason, until: new Date(Date.now() + 60000).toISOString() });
    await execute('UPDATE publications SET hidden_until = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 SECOND) WHERE id = ?', [id]);
    assert.equal((await request('/publications/' + slug)).status, 200, 'Expiry automatically restores visibility');
    assert.equal((await request('/publications?q=' + encodeURIComponent(title))).body.data.some(p => p.id === id), true);
    assert.equal((await request(path, token, { action: 'delete', reason })).status, 200);
    assert.equal((await request('/publications/' + slug)).status, 404);
    assert.equal((await request('/publications/' + slug, token)).status, 404);
    assert.equal((await request('/admin/projects', token)).body.data.some(p => p.id === id), false);
    assert.equal((await request(path, token, { action: 'restore', reason })).status, 404);
    const audit = await one("SELECT COUNT(*) AS n FROM moderation_logs WHERE entity_type = 'publication' AND entity_id = ?", [id]);
    assert.equal(audit.n, 4);
  } finally {
    if (id) {
      await execute("DELETE FROM notifications WHERE user_id = ? AND body LIKE ?", [admin.id, title + ':%']);
      await execute("DELETE FROM moderation_logs WHERE entity_type = 'publication' AND entity_id = ?", [id]);
      await execute('DELETE FROM publications WHERE id = ?', [id]);
    }
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
