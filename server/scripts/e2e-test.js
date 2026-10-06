'use strict';
/* Exercises the real workflows against a running API. */
const BASE = 'http://localhost:4000/api';
let pass = 0;
let fail = 0;

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

function check(label, condition, detail) {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`); }
  else { fail += 1; console.log(`  ✗ ${label}${detail ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ''}`); }
}

const login = async (email) => {
  const r = await call('/auth/login', { method: 'POST', body: { email, password: 'Password123!' } });
  if (!r.body?.token) throw new Error(`login failed for ${email}: ${JSON.stringify(r.body)}`);
  return r.body.token;
};

(async () => {
  console.log('\n── auth ──');
  const student = await login('malsha@sltc.ac.lk');
  const admin = await login('admin@projectverse.io');
  const business = await login('kavindu@orbittech.lk');
  const investor = await login('rashmi@lankaventures.com');
  const university = await login('research@sltc.ac.lk');
  check('six demo accounts sign in', true);

  const me = await call('/auth/me', { token: business });
  check('business starts on Basic', me.body.user.plan_code === 'basic', me.body.user);
  const inv = await call('/auth/me', { token: investor });
  check('seeded investor is Premium', inv.body.user.plan_code === 'premium', inv.body.user);

  const bad = await call('/auth/login', { method: 'POST', body: { email: 'malsha@sltc.ac.lk', password: 'wrong' } });
  check('wrong password rejected', bad.status === 401);

  console.log('\n── publication workflow: draft → pending → approved ──');
  const created = await call('/publications', {
    method: 'POST', token: student,
    body: {
      title: 'Acoustic Leak Detection for Municipal Water Mains',
      abstract: 'A low-cost acoustic sensor array and classifier that locates leaks in buried distribution pipes without excavation, validated on 4 km of municipal network.',
      description: 'Full description of the system architecture and field trial.',
      publicationType: 'final_year_project',
      categoryId: 1,
      openToCollaboration: true,
      openToInvestment: true,
      fundingRequired: 15000,
      technologyIds: [1, 2],
    },
  });
  check('publication saves as a draft', created.body?.data?.status === 'draft', created.body);
  const pubId = created.body?.data?.id;

  const publicList = await call('/publications');
  check('draft is not publicly visible', !publicList.body.data.some((p) => p.id === pubId));

  const submitted = await call(`/publications/${pubId}/submit`, { method: 'POST', token: student });
  check('submitting moves it to pending', submitted.body?.status === 'pending', submitted.body);

  const queue = await call('/admin/moderation', { token: admin });
  check('it appears on the admin queue', queue.body.data.publications.some((p) => p.id === pubId), queue.body?.error);

  const stillHidden = await call('/publications');
  check('pending is still not public', !stillHidden.body.data.some((p) => p.id === pubId));

  const rejectNoNote = await call(`/admin/publications/${pubId}/review`, {
    method: 'POST', token: admin, body: { decision: 'rejected' },
  });
  check('rejecting without a note is refused', rejectNoNote.status === 400, rejectNoNote.body);

  const approved = await call(`/admin/publications/${pubId}/review`, {
    method: 'POST', token: admin, body: { decision: 'approved', note: 'Clear methodology.' },
  });
  check('admin approves', approved.body?.status === 'approved', approved.body);

  const nowPublic = await call('/publications');
  check('approved publication is public', nowPublic.body.data.some((p) => p.id === pubId));

  const notif = await call('/notifications', { token: student });
  check('owner is notified of approval', notif.body.data.some((n) => n.type === 'publication.approved'));

  const editLocked = await call(`/publications/${pubId}`, {
    method: 'PUT', token: student, body: { title: 'Changed after approval' },
  });
  check('approved publication is locked from editing', editLocked.status === 400, editLocked.body);

  console.log('\n── plan limits ──');
  const slug = nowPublic.body.data.find((p) => p.id === pubId).slug;
  const view1 = await call(`/publications/${slug}`, { token: business });
  check('Basic user opens a full record', view1.body?.access?.level === 'full', view1.body?.access);

  const view2 = await call(`/publications/${slug}`, { token: business });
  check('reopening the same record is not charged again',
    view2.body?.access?.used === view1.body?.access?.used, view2.body?.access);

  const anon = await call(`/publications/${slug}`);
  check('signed-out visitor sees the abstract only', anon.body?.access?.level === 'preview', anon.body?.access);

  const advanced = await call('/publications?technology=machine-learning', { token: business });
  check('Basic is blocked from advanced filters', advanced.status === 402, advanced.body);
  const advancedOk = await call('/publications?technology=machine-learning', { token: investor });
  check('Premium may use advanced filters', advancedOk.status === 200, advancedOk.body);

  // Basic allows 3 outgoing requests a month; the seed already used some.
  let sent = 0;
  let blocked = null;
  for (let i = 0; i < 5; i += 1) {
    const r = await call('/requests/collaboration', {
      method: 'POST', token: business,
      body: {
        publicationId: pubId, recipientId: 3, requestType: 'collaboration',
        subject: `Pilot proposal ${i}`,
        message: 'We would like to run a pilot deployment across our municipal client network this quarter.',
      },
    });
    if (r.status === 201) sent += 1;
    else if (r.status === 402) { blocked = r.body; break; }
  }
  check('Basic request quota stops the run', blocked?.code === 'quota_exceeded', blocked || `sent ${sent}`);

  const meetingBasic = await call('/requests/meetings', {
    method: 'POST', token: business,
    body: {
      publicationId: pubId, recipientId: 3, title: 'Intro call',
      proposedStart: new Date(Date.now() + 864e5).toISOString(),
      proposedEnd: new Date(Date.now() + 864e5 + 36e5).toISOString(),
    },
  });
  check('meetings are Premium-only', meetingBasic.status === 402 && meetingBasic.body.code === 'premium_required', meetingBasic.body);

  const meetingPremium = await call('/requests/meetings', {
    method: 'POST', token: investor,
    body: {
      publicationId: pubId, recipientId: 3, title: 'Funding conversation',
      proposedStart: new Date(Date.now() + 1728e5).toISOString(),
      proposedEnd: new Date(Date.now() + 1728e5 + 27e5).toISOString(),
    },
  });
  check('Premium can propose a meeting', meetingPremium.status === 201, meetingPremium.body);

  console.log('\n── upgrade ──');
  const badCard = await call('/subscriptions/upgrade', {
    method: 'POST', token: business,
    body: { billingCycle: 'yearly', cardNumber: '4242424242424241', holderName: 'K Perera', expMonth: 4, expYear: 2030, cvv: '123' },
  });
  check('a card failing the Luhn check is refused', badCard.status === 400 && badCard.body.code === 'card_invalid', badCard.body);

  const upgrade = await call('/subscriptions/upgrade', {
    method: 'POST', token: business,
    body: { billingCycle: 'yearly', cardNumber: '4242 4242 4242 4242', holderName: 'Kavindu Perera', expMonth: 4, expYear: 2030, cvv: '123' },
  });
  check('valid card activates Premium', upgrade.status === 201 && upgrade.body.user.plan_code === 'premium', upgrade.body);

  const afterUpgrade = await call('/publications?technology=machine-learning', { token: business });
  check('advanced filters unlock immediately', afterUpgrade.status === 200, afterUpgrade.body);

  const usage = await call('/subscriptions/usage', { token: business });
  const reqMetric = usage.body.data.metrics.find((m) => m.metric === 'outgoing_request');
  check('request limit is now unlimited', reqMetric.unlimited === true, reqMetric);

  const invoices = await call('/subscriptions/invoices', { token: business });
  check('an invoice was written', invoices.body.data.length === 1 && invoices.body.data[0].status === 'paid', invoices.body);

  console.log('\n── marketplace ──');
  const products = await call('/marketplace/products');
  check('marketplace lists approved products', products.body.data.length > 0);

  const first = products.body.data[0];
  const addCart = await call('/marketplace/cart', { method: 'POST', token: investor, body: { productId: first.id, quantity: 1 } });
  check('add to cart', addCart.status === 201, addCart.body);

  const addr = await call('/addresses', {
    method: 'POST', token: investor,
    body: { recipientName: 'Rashmi Jayawardena', phone: '0771234567', line1: '14 Layards Road', city: 'Colombo', country: 'Sri Lanka', isDefault: true },
  });
  const checkout = await call('/marketplace/checkout', {
    method: 'POST', token: investor, body: { shippingAddressId: addr.body.id },
  });
  check('checkout creates an order', checkout.status === 201 && checkout.body.data.orderNo, checkout.body);

  const orderNo = checkout.body?.data?.orderNo;
  const order = await call(`/marketplace/orders/${orderNo}`, { token: investor });
  check('order reads back with items', order.body?.data?.items?.length > 0, order.body);
  check('platform fee is charged', Number(order.body?.data?.platform_fee) > 0, order.body?.data?.platform_fee);

  const emptyCart = await call('/marketplace/cart', { token: investor });
  check('cart is cleared after checkout', emptyCart.body.data.items.length === 0);

  const sellerList = await call('/marketplace/products', { token: student });
  const newListing = await call('/marketplace/products', {
    method: 'POST', token: student,
    body: { title: 'Acoustic sensor array reference board', categoryId: 1, productType: 'physical', price: 240, stockQuantity: 4 },
  });
  check('new listing starts pending approval', newListing.body?.status === 'pending', newListing.body);

  console.log('\n── editing preserves content ──');
  const draft = await call('/publications', {
    method: 'POST', token: student,
    body: {
      title: 'Rooftop Solar Yield Forecasting for Tropical Microclimates',
      abstract: 'A short-horizon irradiance model that corrects satellite forecasts using local sky-camera imagery, cutting day-ahead yield error across monsoon conditions.',
      description: 'Detailed system description that must survive a round trip through the editor.',
      methodology: 'Sky imagery paired with inverter telemetry over eighteen months.',
      results: 'Day-ahead error reduced from 19% to 8% during monsoon months.',
      publicationType: 'research_paper',
      categoryId: 2, keywords: 'solar, forecasting', academicYear: '2025/2026',
      openToCollaboration: true, technologyIds: [1, 3],
    },
  });
  const draftId = draft.body?.data?.id;
  const edit = await call(`/publications/${draftId}/edit`, { token: student });
  check('edit endpoint returns every field', edit.body?.data?.methodology && edit.body?.data?.results, edit.body);
  check('edit endpoint returns technology ids', edit.body?.data?.technologyIds?.length === 2, edit.body?.data?.technologyIds);

  // Round-trip exactly what the editor loaded, changing only the title.
  const d = edit.body.data;
  await call(`/publications/${draftId}`, {
    method: 'PUT', token: student,
    body: {
      title: 'Rooftop Solar Yield Forecasting (revised)',
      abstract: d.abstract, description: d.description, methodology: d.methodology,
      results: d.results, publicationType: d.publicationType, categoryId: d.categoryId,
      keywords: d.keywords, academicYear: d.academicYear,
      openToCollaboration: d.openToCollaboration, technologyIds: d.technologyIds,
    },
  });
  const after = await call(`/publications/${draftId}/edit`, { token: student });
  check('editing does not wipe the other fields',
    after.body.data.methodology === d.methodology && after.body.data.results === d.results,
    after.body.data);
  check('technologies survive the edit', after.body.data.technologyIds.length === 2, after.body.data.technologyIds);

  const notMine = await call(`/publications/${draftId}/edit`, { token: business });
  check('another account cannot load it for editing', notMine.status === 403, notMine.body);

  console.log('\n── conversation threads ──');
  // The student accepts one of the pending requests, which should open a thread.
  const inbox = await call('/requests/inbox', { token: student });
  const pendingReq = inbox.body.data.find((r) => r.status === 'pending');
  check('student has a pending request to accept', !!pendingReq, inbox.body?.data?.length);

  if (pendingReq) {
    const accepted = await call(`/requests/collaboration/${pendingReq.id}`, {
      method: 'PATCH', token: student,
      body: { status: 'accepted', responseNote: 'Happy to run the pilot with you.' },
    });
    check('request is accepted', accepted.status === 200, accepted.body);

    const threads = await call('/requests/threads', { token: student });
    check('accepting opened a thread', threads.body.data.length > 0, threads.body);

    const threadId = threads.body.data[0]?.id;
    const msgs = await call(`/requests/threads/${threadId}`, { token: student });
    check('thread contains the opening message', msgs.body.data.length > 0, msgs.body);

    const reply = await call(`/requests/threads/${threadId}`, {
      method: 'POST', token: business, body: { body: 'Great — can we start the week of the 14th?' },
    });
    check('the other party can reply', reply.status === 201, reply.body);

    const afterReply = await call(`/requests/threads/${threadId}`, { token: student });
    check('reply appears in the thread', afterReply.body.data.length === msgs.body.data.length + 1, afterReply.body.data.length);

    const threadNotif = await call('/notifications', { token: student });
    check('a reply notifies the other party', threadNotif.body.data.some((n) => n.type === 'message.received'));

    const outsider = await call(`/requests/threads/${threadId}`, { token: investor });
    check('an outsider cannot read the thread', outsider.status === 403, outsider.body);

    const outsiderPost = await call(`/requests/threads/${threadId}`, {
      method: 'POST', token: investor, body: { body: 'let me in' },
    });
    check('an outsider cannot post to the thread', outsiderPost.status === 403);
  }

  console.log('\n── role boundaries ──');
  const adminByStudent = await call('/admin/moderation', { token: student });
  check('students cannot reach admin routes', adminByStudent.status === 403, adminByStudent.body);
  const uniByBusiness = await call('/university/verifications', { token: business });
  check('businesses cannot reach the university console', uniByBusiness.status === 403);
  const pubByBusiness = await call('/publications', { method: 'POST', token: business, body: { title: 'x', abstract: 'y' } });
  check('non-publishers cannot create publications', pubByBusiness.status === 403 || pubByBusiness.status === 400);

  console.log('\n── university console ──');
  const verifications = await call('/university/verifications', { token: university });
  check('verification queue loads', Array.isArray(verifications.body.data), verifications.body);
  const pending = verifications.body.data.find((v) => v.status === 'pending');
  if (pending) {
    const decided = await call(`/university/verifications/${pending.id}`, {
      method: 'POST', token: university, body: { decision: 'approved' },
    });
    check('university verifies a member', decided.status === 200, decided.body);
  }
  const uniPubs = await call('/university/publications', { token: university });
  check('university monitors its projects', uniPubs.body.data.length > 0, uniPubs.body);

  console.log('\n── dashboards ──');
  for (const [label, token] of [['student', student], ['business', business], ['university', university], ['admin', admin]]) {
    const d = await call('/dashboard', { token });
    check(`${label} dashboard returns its own panel`, d.status === 200 && d.body.data.panel, d.body?.error);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('\nTest run crashed:', err.message);
  process.exit(1);
});
