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

console.log('\nAll ' + passed + ' tests passed.');
