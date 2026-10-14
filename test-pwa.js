/* Node test harness for the Finance App PWA (app.js). Stubs browser globals. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DIR = path.join(__dirname);

// ---- browser stubs ----
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.window = {};
global.document = { addEventListener: () => {}, readyState: 'loading' };

// ---- load card-designs.js + app.js ----
const code = fs.readFileSync(path.join(DIR, 'card-designs.js'), 'utf8') + '\n' + fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
eval(code);
const F = global.window.FinanceApp;
assert.ok(F, 'FinanceApp API exposed');

// ---- helpers ----
function blank() { return F.blankState(); }
let passed = 0;
function t(name, fn) { fn(); passed++; console.log('ok -', name); }

// ---- recompute: ledger ----
t('recompute: income/expense/card/cardpayment/saving', () => {
  const st = blank();
  st.accounts.push({ id: 'a1', name: 'Checking', openingBalance: 1000 });
  st.cards.push({ id: 'c1', name: 'Visa', apr: 20, dueDay: 15, openingBalance: 200 });
  st.goals.push({ id: 'g1', name: 'Trip', target: 500, targetDate: '2026-12-31', initialSaved: 0 });
  st.transactions.push(
    { id: 't1', kind: 'income', date: '2026-10-01', amount: 500, accountId: 'a1', category: 'Paycheck' },
    { id: 't2', kind: 'expense', date: '2026-10-02', amount: 60, methodType: 'account', methodId: 'a1', category: 'Groceries' },
    { id: 't3', kind: 'expense', date: '2026-10-03', amount: 40, methodType: 'card', methodId: 'c1', category: 'Dining' },
    { id: 't4', kind: 'cardpayment', date: '2026-10-04', amount: 100, accountId: 'a1', cardId: 'c1' },
    { id: 't5', kind: 'saving', date: '2026-10-05', amount: 50, accountId: 'a1', goalId: 'g1' },
  );
  const r = F.recompute(st);
  assert.strictEqual(r.acctBal.a1, 1000 + 500 - 60 - 100 - 50); // 1290
  assert.strictEqual(r.cardBal.c1, 200 + 40 - 100); // 140
  assert.strictEqual(r.goalSaved.g1, 50);
});

t('recompute: edit/delete stay consistent via recompute', () => {
  const st = blank();
  st.accounts.push({ id: 'a1', name: 'Checking', openingBalance: 0 });
  st.transactions.push({ id: 't1', kind: 'income', date: '2026-10-01', amount: 100, accountId: 'a1' });
  assert.strictEqual(F.recompute(st).acctBal.a1, 100);
  st.transactions[0].amount = 250;
  assert.strictEqual(F.recompute(st).acctBal.a1, 250);
  st.transactions = [];
  assert.strictEqual(F.recompute(st).acctBal.a1, 0);
});

// ---- periods & summaries ----
t('periodRange: daily/weekly/monthly', () => {
  const d = F.periodRange('daily', '2026-10-11');
  assert.deepStrictEqual([d.start, d.end], ['2026-10-11', '2026-10-11']);
  const w = F.periodRange('weekly', '2026-10-11'); // Sunday
  assert.deepStrictEqual([w.start, w.end], ['2026-10-05', '2026-10-11']);
  const m = F.periodRange('monthly', '2026-10-11');
  assert.deepStrictEqual([m.start, m.end], ['2026-10-01', '2026-10-31']);
});

t('summarize: in/out/net/byCategory', () => {
  const st = blank();
  st.accounts.push({ id: 'a1', name: 'C', openingBalance: 0 });
  st.transactions.push(
    { id: 't1', kind: 'income', date: '2026-10-05', amount: 1000, accountId: 'a1', category: 'Paycheck' },
    { id: 't2', kind: 'expense', date: '2026-10-06', amount: 120, methodType: 'account', methodId: 'a1', category: 'Groceries' },
    { id: 't3', kind: 'expense', date: '2026-09-20', amount: 999, methodType: 'account', methodId: 'a1', category: 'Travel' },
  );
  const s = F.summarize(st, 'monthly', '2026-10-11');
  assert.strictEqual(s.inn, 1000);
  assert.strictEqual(s.out, 120);
  assert.strictEqual(s.net, 880);
  assert.deepStrictEqual(s.byCat, { Groceries: 120 });
});

// ---- card payment plan ----
t('cardPlan: scheduled twice-monthly, final = due - lead', () => {
  const plan = F.cardPlan({ dueDay: 25 }, 1000, 3, '2026-10-11');
  assert.strictEqual(plan.status, 'scheduled');
  assert.strictEqual(plan.due, '2026-10-25');
  assert.strictEqual(plan.payments[1].date, '2026-10-22'); // 3 days before
  assert.notStrictEqual(plan.payments[0].date, plan.payments[1].date);
  assert.strictEqual(plan.payments[0].amount + plan.payments[1].amount, 1000);
});

t('cardPlan: urgent when due within lead days', () => {
  const plan = F.cardPlan({ dueDay: 12 }, 500, 3, '2026-10-11'); // due tomorrow
  assert.strictEqual(plan.status, 'urgent');
  assert.strictEqual(plan.payments[0].label, 'Pay now');
  assert.strictEqual(plan.payments[0].amount, 500);
});

t('cardPlan: clear when no balance', () => {
  assert.strictEqual(F.cardPlan({ dueDay: 15 }, 0, 3, '2026-10-11').status, 'clear');
});

t('cardPlan: rolls to next month when due day passed', () => {
  const plan = F.cardPlan({ dueDay: 5 }, 300, 3, '2026-10-11');
  assert.strictEqual(plan.due, '2026-11-05');
  assert.strictEqual(plan.payments[1].date, '2026-11-02');
});

// ---- savings roadmap ----
t('savingsRoadmap: per day/week/month + milestones', () => {
  const rm = F.savingsRoadmap({ target: 1200, targetDate: '2026-12-10' }, 200, '2026-10-11');
  assert.strictEqual(rm.done, false);
  assert.strictEqual(rm.remaining, 1000);
  assert.strictEqual(rm.daysLeft, 60);
  assert.strictEqual(rm.perDay, 16.67);
  assert.ok(rm.milestones.length > 0);
  const last = rm.milestones[rm.milestones.length - 1];
  assert.deepStrictEqual([last.date, last.target], ['2026-12-10', 1200]);
});

t('savingsRoadmap: done + overdue', () => {
  assert.strictEqual(F.savingsRoadmap({ target: 500, targetDate: '2026-12-31' }, 500, '2026-10-11').done, true);
  const od = F.savingsRoadmap({ target: 500, targetDate: '2026-10-01' }, 100, '2026-10-11');
  assert.strictEqual(od.overdue, true);
});

// ---- CSV ----
t('csv: BOM + CRLF + quoting', () => {
  const csv = F.toCSV([['a', 'b'], ['x,"y"', 'line1\nline2']]);
  assert.ok(csv.charCodeAt(0) === 0xFEFF, 'starts with BOM');
  assert.ok(csv.includes('\r\n'), 'CRLF line endings');
  assert.ok(csv.includes('"x,""y"""'), 'quotes escaped, field quoted');
  assert.ok(csv.includes('"line1\nline2"'), 'newline field quoted');
});

t('csv exports: transactions/accounts/cards/goals', () => {
  const st = blank();
  st.accounts.push({ id: 'a1', name: 'Checking', openingBalance: 100 });
  st.cards.push({ id: 'c1', name: 'Visa', apr: 24.99, dueDay: 15, limit: 5000, minPayment: 25, openingBalance: 0 });
  st.goals.push({ id: 'g1', name: 'Fund', target: 1000, targetDate: '2027-01-01', initialSaved: 100 });
  st.transactions.push({ id: 't1', kind: 'expense', date: '2026-10-01', amount: 20, methodType: 'account', methodId: 'a1', category: 'Dining', note: 'Lunch, "great"' });
  for (const fn of [F.txCSV, F.accountsCSV, F.cardsCSV, F.goalsCSV]) {
    const out = fn(st);
    assert.ok(out.charCodeAt(0) === 0xFEFF && out.includes('\r\n'));
  }
  assert.ok(F.txCSV(st).includes('"Lunch, ""great"""'));
  assert.ok(F.cardsCSV(st).includes('24.99'));
});

// ---- backup/restore validation ----
t('validateBackup', () => {
  assert.strictEqual(F.validateBackup({ transactions: [], accounts: [], cards: [], goals: [] }), null);
  assert.ok(F.validateBackup({}) !== null);
  assert.ok(F.validateBackup(null) !== null);
  assert.ok(F.validateBackup({ transactions: [], accounts: [] }) !== null);
});

t('persist/loadState round-trip', () => {
  const st = blank();
  st.accounts.push({ id: 'a9', name: 'Save', openingBalance: 42 });
  st.settings.leadDays = 2;
  assert.ok(F.persist(st));
  const back = F.loadState();
  assert.strictEqual(back.accounts[0].openingBalance, 42);
  assert.strictEqual(back.settings.leadDays, 2);
});

// ---- reminders ----
t('dueReminders: urgent card + goal due soon', () => {
  const st = blank();
  st.cards.push({ id: 'c1', name: 'Visa', apr: 20, dueDay: 12, openingBalance: 400 });
  st.goals.push({ id: 'g1', name: 'Fund', target: 1000, targetDate: '2026-10-20', initialSaved: 900 });
  const items = F.dueReminders(st, '2026-10-11');
  assert.ok(items.some((i) => i.kind === 'card' && i.urgent), 'urgent card reminder');
  assert.ok(items.some((i) => i.kind === 'goal'), 'goal reminder');
});

t('dueReminders: silent when nothing due', () => {
  const st = blank();
  st.cards.push({ id: 'c1', name: 'Visa', apr: 20, dueDay: 25, openingBalance: 0 });
  assert.deepStrictEqual(F.dueReminders(st, '2026-10-11'), []);
});

t('theme: resolveTheme', () => {
  assert.strictEqual(F.resolveTheme('light', true), 'light');
  assert.strictEqual(F.resolveTheme('dark', false), 'dark');
  assert.strictEqual(F.resolveTheme('system', true), 'dark');
  assert.strictEqual(F.resolveTheme('system', false), 'light');
  assert.strictEqual(F.resolveTheme('bogus', true), 'dark'); // unknown falls back to device
  assert.strictEqual(F.resolveTheme(undefined, false), 'light');
});

t('theme: default is system; loadState keeps only valid themes', () => {
  assert.strictEqual(F.blankState().settings.theme, 'system');
  F.persist({ transactions: [], accounts: [], cards: [], goals: [], settings: { leadDays: 3, theme: 'dark' } });
  assert.strictEqual(F.loadState().settings.theme, 'dark');
  F.persist({ transactions: [], accounts: [], cards: [], goals: [], settings: { theme: 'neon' } });
  assert.strictEqual(F.loadState().settings.theme, 'system');
});

t('icons: every registry icon is a valid PNG', () => {
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let checked = 0;
  F.BANKS.forEach((b) => {
    const buf = fs.readFileSync(path.join(DIR, b.icon));
    assert.ok(buf.subarray(0, 8).equals(PNG_MAGIC), 'valid PNG: ' + b.icon);
    checked++;
  });
  assert.ok(checked >= 85, 'checked all icons');
});

t('banks: registry integrity, icons exist on disk', () => {
  const ids = new Set();
  assert.ok(Array.isArray(F.BANKS) && F.BANKS.length >= 90, 'covers issuers + all requested card products');
  F.BANKS.forEach((b) => {
    assert.ok(b.id && b.group && b.name && b.icon, 'complete entry');
    assert.ok(!ids.has(b.id), 'no duplicate id: ' + b.id);
    ids.add(b.id);
    assert.ok(fs.existsSync(path.join(DIR, b.icon)), 'icon file exists: ' + b.icon);
  });
  // every product from the user's list
  for (const want of ['chase-freedom', 'chase-sapphire', 'chase-slate', 'chase-ink',
      'chase-amazon', 'chase-southwest', 'chase-united', 'chase-hyatt', 'chase-ihg', 'chase-marriott',
      'amex-bluecash', 'amex-gold', 'amex-platinum', 'amex-green',
      'amex-hilton', 'amex-hilton-surpass', 'amex-hilton-aspire',
      'amex-delta-blue', 'amex-delta-gold', 'amex-delta-platinum', 'amex-delta-reserve',
      'amex-marriott-brilliant', 'amex-everyday',
      'capone-quicksilver', 'capone-venture', 'capone-venturex', 'capone-savor', 'capone-walmart',
      'citi-doublecash', 'citi-customcash', 'citi-strata', 'citi-costco', 'citi-aadvantage',
      'discover-it', 'discover-miles', 'discover-student', 'discover-secured',
      'bofa-customized', 'bofa-travel', 'bofa-premium', 'bofa-unlimited', 'bofa-alaska',
      'wells-activecash', 'wells-autograph', 'wells-reflect', 'wells-bilt', 'wells-attune',
      'usbank-altitude-go', 'usbank-altitude-reserve', 'usbank-cashplus', 'usbank-shopper',
      'barclays-jetblue', 'barclays-aviator', 'barclays-wyndham',
      'synchrony-paypal', 'synchrony-venmo', 'synchrony-amazon',
      'navy-flagship', 'navy-more', 'navy-cash',
      'pnc-cash', 'pnc-points', 'pnc-core',
      'td-doubleup', 'td-cash', 'td-aeroplan',
      'citizens-cashback', 'citizens-clear',
      'chase-disney-premier', 'chase-disney', 'chase-freedom-unlimited',
      'amex-bluecash-preferred', 'bofa-bankamericard', 'bofa-premium-elite',
      'citi-strata-premier', 'citi-strata-elite', 'citi-simplicity',
      'citi-diamond', 'citi-costco-business',
      'visa', 'mastercard', 'generic']) {
    assert.ok(ids.has(want), 'has ' + want);
  }
  assert.strictEqual(F.bankOf('nope').id, 'generic', 'unknown falls back to generic');
  assert.strictEqual(F.bankOf('chase-sapphire').group, 'Chase');
  assert.strictEqual(F.bankOf('barclays-jetblue').group, 'Barclays');
});

t('dueDatesInMonth: maps cards, clamps to month length', () => {
  const cards = [
    { id: 'a', dueDay: 15, bankId: 'chase' },
    { id: 'b', dueDay: 15, bankId: 'visa' },
    { id: 'c', dueDay: 5, bankId: 'amex' },
  ];
  const oct = F.dueDatesInMonth(cards, 2026, 9);
  assert.deepStrictEqual(oct[15].map((c) => c.id).sort(), ['a', 'b']);
  assert.deepStrictEqual(oct[5].map((c) => c.id), ['c']);
  assert.strictEqual(oct[16], undefined);
  const feb = F.dueDatesInMonth([{ id: 'x', dueDay: 28, bankId: 'citi' }], 2026, 1);
  assert.ok(feb[28] && feb[28][0].id === 'x');
  assert.deepStrictEqual(F.dueDatesInMonth([], 2026, 9), {});
});

t('loadState: existing cards default to generic issuer', () => {
  F.persist({ transactions: [], accounts: [], cards: [{ id: 'c1', name: 'Old card' }], goals: [], settings: {} });
  const back = F.loadState();
  assert.strictEqual(back.cards[0].bankId, 'generic');
});

// ---- encrypted cloud backup (Google Drive) ----
t('normalizeState: fills defaults, keeps valid drive settings', () => {
  const old = F.normalizeState({ transactions: [], accounts: [], cards: [], goals: [], settings: { theme: 'dark' } });
  assert.strictEqual(old.settings.theme, 'dark');
  assert.strictEqual(old.settings.driveClientId, '');
  assert.strictEqual(old.settings.driveAutoBackup, false);
  const withDrive = F.normalizeState({ transactions: [], accounts: [], cards: [], goals: [],
    settings: { driveClientId: 'abc.apps.googleusercontent.com', driveAutoBackup: true, driveFolderId: 'f1', driveFileId: 'x1', driveLastBackupAt: '2026-10-13T00:00:00.000Z', driveEmail: 'a@b.c' } });
  assert.strictEqual(withDrive.settings.driveClientId, 'abc.apps.googleusercontent.com');
  assert.strictEqual(withDrive.settings.driveAutoBackup, true);
  assert.strictEqual(withDrive.settings.driveFolderId, 'f1');
  assert.strictEqual(withDrive.settings.driveEmail, 'a@b.c');
  assert.strictEqual(F.normalizeState(null).settings.theme, 'system');
  assert.strictEqual(F.normalizeState({}).settings.leadDays, 3);
});

t('parseFragment: access token + state, error hash, empty', () => {
  const p = F.parseFragment('#access_token=ya29.abc&token_type=Bearer&expires_in=3600&state=n1');
  assert.strictEqual(p.access_token, 'ya29.abc');
  assert.strictEqual(p.expires_in, '3600');
  assert.strictEqual(p.state, 'n1');
  assert.deepStrictEqual(F.parseFragment('#error=access_denied'), { error: 'access_denied' });
  assert.deepStrictEqual(F.parseFragment(''), {});
});

// ---- async tests (crypto + Drive API) ----
const asyncTests = [];
function ta(name, fn) { asyncTests.push({ name, fn }); }

ta('encryptBackup/decryptBackup: round-trip', async () => {
  const st = blank();
  st.accounts.push({ id: 'a1', name: 'Checking', openingBalance: 100 });
  const env = await F.encryptBackup(st, 'correct horse');
  const back = await F.decryptBackup(env, 'correct horse');
  assert.deepStrictEqual(back.accounts, st.accounts);
});

ta('encryptBackup: ciphertext hides plaintext', async () => {
  const st = blank();
  st.accounts.push({ id: 'a1', name: 'SECRET-ACCOUNT-NAME', openingBalance: 1 });
  const env = await F.encryptBackup(st, 'pw');
  assert.ok(!env.includes('SECRET-ACCOUNT-NAME'), 'no plaintext in envelope');
  const parsed = JSON.parse(env);
  assert.strictEqual(parsed.v, 1);
  assert.ok(parsed.salt && parsed.iv && parsed.data);
});

ta('decryptBackup: wrong passphrase fails', async () => {
  const env = await F.encryptBackup(blank(), 'right');
  await assert.rejects(F.decryptBackup(env, 'wrong'), /Wrong passphrase/);
});

ta('decryptBackup: tampered ciphertext fails', async () => {
  const env = await F.encryptBackup(blank(), 'pw');
  const parsed = JSON.parse(env);
  parsed.data = (parsed.data[0] === 'A' ? 'B' : 'A') + parsed.data.slice(1);
  await assert.rejects(F.decryptBackup(JSON.stringify(parsed), 'pw'), /Wrong passphrase/);
});

ta('decryptBackup: rejects non-backup input', async () => {
  await assert.rejects(F.decryptBackup('not json', 'pw'), /not a Finance App cloud backup/);
  await assert.rejects(F.decryptBackup(JSON.stringify({ v: 99 }), 'pw'), /not a Finance App cloud backup/);
});

ta('encryptBackup: empty passphrase rejected', async () => {
  await assert.rejects(F.encryptBackup(blank(), ''), /passphrase/);
});

// Mock fetch for Drive API tests: routes are tried in order.
function driveMock(routes) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts: opts || {} });
    for (const r of routes) {
      if (r.match(url, opts || {})) {
        return {
          ok: r.ok !== false, status: r.status || 200,
          json: async () => (typeof r.json === 'function' ? r.json(url, opts) : r.json),
          text: async () => (typeof r.text === 'function' ? r.text(url, opts) : (r.text || '')),
        };
      }
    }
    throw new Error('unexpected Drive call: ' + url);
  };
  return { fetchImpl, calls };
}

ta('driveFindFile: returns match, null when absent, sends auth', async () => {
  const m = driveMock([{ match: (u) => u.includes('/drive/v3/files?q='), json: { files: [{ id: 'file-1', name: 'finance-backup.enc.json' }] } }]);
  const found = await F.driveFindFile('tok', 'finance-backup.enc.json', m.fetchImpl);
  assert.strictEqual(found.id, 'file-1');
  const q = decodeURIComponent(m.calls[0].url);
  assert.ok(q.includes("name = 'finance-backup.enc.json'") && q.includes('trashed = false'));
  assert.strictEqual(m.calls[0].opts.headers.Authorization, 'Bearer tok');
  const m2 = driveMock([{ match: () => true, json: { files: [] } }]);
  assert.strictEqual(await F.driveFindFile('tok', 'nope.json', m2.fetchImpl), null);
});

ta('driveFindFile: surfaces Drive errors with status', async () => {
  const m = driveMock([{ match: () => true, ok: false, status: 401, json: { error: { message: 'Invalid Credentials' } } }]);
  await assert.rejects(F.driveFindFile('bad', 'x.json', m.fetchImpl), /Google Drive error 401: Invalid Credentials/);
});

ta('driveEnsureFolder: reuses known id, finds by name, creates when missing', async () => {
  const m = driveMock([
    { match: (u) => u.includes('/files/known-id'), json: { id: 'known-id', trashed: false, mimeType: 'application/vnd.google-apps.folder' } },
  ]);
  assert.strictEqual(await F.driveEnsureFolder('tok', m.fetchImpl, 'known-id'), 'known-id');
  assert.strictEqual(m.calls.length, 1);

  const m2 = driveMock([
    { match: (u) => u.includes('/files?q='), json: { files: [{ id: 'found-folder' }] } },
  ]);
  assert.strictEqual(await F.driveEnsureFolder('tok', m2.fetchImpl, ''), 'found-folder');

  const m3 = driveMock([
    { match: (u) => u.includes('/files/stale-id'), ok: false, status: 404, json: { error: { message: 'Not Found' } } },
    { match: (u) => u.includes('/files?q='), json: { files: [] } },
    { match: (u, o) => u.includes('/drive/v3/files') && o.method === 'POST', json: { id: 'new-folder' } },
  ]);
  assert.strictEqual(await F.driveEnsureFolder('tok', m3.fetchImpl, 'stale-id'), 'new-folder');
  const createCall = m3.calls.find((c) => c.opts.method === 'POST');
  assert.strictEqual(JSON.parse(createCall.opts.body).mimeType, 'application/vnd.google-apps.folder');
});

ta('driveUploadBackup: create uses multipart, update uses PATCH media', async () => {
  const m = driveMock([
    { match: (u) => u.includes('uploadType=multipart'), json: { id: 'created-1' } },
  ]);
  const id = await F.driveUploadBackup('tok', 'folder-1', null, '{"cipher":"x"}', m.fetchImpl);
  assert.strictEqual(id, 'created-1');
  const call = m.calls[0];
  assert.ok(call.url.includes('/upload/drive/v3/files?uploadType=multipart'));
  assert.ok(call.opts.headers['Content-Type'].startsWith('multipart/related; boundary='));
  assert.ok(call.opts.body.includes('"name":"finance-backup.enc.json"'));
  assert.ok(call.opts.body.includes('"parents":["folder-1"]'));
  assert.ok(call.opts.body.includes('{"cipher":"x"}'));

  const m2 = driveMock([
    { match: (u, o) => u.includes('uploadType=media') && o.method === 'PATCH', json: { id: 'existing-1' } },
  ]);
  const id2 = await F.driveUploadBackup('tok', 'folder-1', 'existing-1', '{"cipher":"y"}', m2.fetchImpl);
  assert.strictEqual(id2, 'existing-1');
  assert.strictEqual(m2.calls[0].opts.body, '{"cipher":"y"}');
});

ta('driveDownloadBackup + driveAbout', async () => {
  const m = driveMock([
    { match: (u) => u.includes('alt=media'), text: 'ENVELOPE' },
    { match: (u) => u.includes('/about'), json: { user: { emailAddress: 'me@example.com' } } },
  ]);
  assert.strictEqual(await F.driveDownloadBackup('tok', 'file-9', m.fetchImpl), 'ENVELOPE');
  assert.strictEqual((await F.driveAbout('tok', m.fetchImpl)).emailAddress, 'me@example.com');
});

(async function () {
  for (const at of asyncTests) {
    await at.fn();
    passed++;
    console.log('ok -', at.name);
  }
  console.log('\nAll ' + passed + ' tests passed.');
})().catch((e) => { console.error(e); process.exit(1); });
