/* Finance App — local-first PWA. All data stays in this browser (localStorage). */
(function () {
'use strict';

/* ---------------- utils (pure, testable) ---------------- */
var DAY = 86400000;
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function parseDate(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmtDate(d) {
  var m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + dd;
}
function todayStr() { return fmtDate(new Date()); }
function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function addDaysStr(s, n) { return fmtDate(addDays(parseDate(s), n)); }
function clampDay(y, m, day) { return Math.min(day, new Date(y, m + 1, 0).getDate()); }
function money(n) {
  n = round2(+n || 0);
  var sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------------- card designs (offline icon pack) ----------------
   Original monogram artwork inspired by each product's colorway —
   not the banks' actual logos. Square icons live in icons/banks/,
   product card icons in icons/cards/. */
var BASE_BANKS = [
  { id: 'chase',              group: 'Chase',            name: 'Chase',            icon: 'icons/banks/chase.png' },
  { id: 'chase-freedom',      group: 'Chase',            name: 'Freedom',          icon: 'icons/cards/chase-freedom.png' },
  { id: 'chase-sapphire',     group: 'Chase',            name: 'Sapphire',         icon: 'icons/cards/chase-sapphire.png' },
  { id: 'chase-slate',        group: 'Chase',            name: 'Slate',            icon: 'icons/cards/chase-slate.png' },
  { id: 'chase-ink',          group: 'Chase',            name: 'Ink Business',              icon: 'icons/cards/chase-ink.png' },
  { id: 'amex',               group: 'American Express', name: 'American Express', icon: 'icons/banks/amex.png' },
  { id: 'amex-bluecash',      group: 'American Express', name: 'Blue Cash',        icon: 'icons/cards/amex-bluecash.png' },
  { id: 'amex-gold',          group: 'American Express', name: 'Gold',             icon: 'icons/cards/amex-gold.png' },
  { id: 'amex-platinum',      group: 'American Express', name: 'Platinum',         icon: 'icons/cards/amex-platinum.png' },
  { id: 'amex-green',         group: 'American Express', name: 'Green',            icon: 'icons/cards/amex-green.png' },
  { id: 'amex-hilton',        group: 'American Express', name: 'Hilton Honors',    icon: 'icons/cards/amex-hilton.png' },
  { id: 'amex-hilton-surpass',group: 'American Express', name: 'Hilton Honors Surpass',   icon: 'icons/cards/amex-hilton-surpass.png' },
  { id: 'amex-hilton-aspire', group: 'American Express', name: 'Hilton Honors Aspire',    icon: 'icons/cards/amex-hilton-aspire.png' },
  { id: 'amex-delta-blue',    group: 'American Express', name: 'Delta SkyMiles Blue',       icon: 'icons/cards/amex-delta-blue.png' },
  { id: 'amex-delta-gold',    group: 'American Express', name: 'Delta SkyMiles Gold',       icon: 'icons/cards/amex-delta-gold.png' },
  { id: 'amex-delta-platinum',group: 'American Express', name: 'Delta SkyMiles Platinum',   icon: 'icons/cards/amex-delta-platinum.png' },
  { id: 'amex-delta-reserve', group: 'American Express', name: 'Delta SkyMiles Reserve',    icon: 'icons/cards/amex-delta-reserve.png' },
  { id: 'capitalone',         group: 'Capital One',      name: 'Capital One',      icon: 'icons/banks/capitalone.png' },
  { id: 'capone-quicksilver', group: 'Capital One',      name: 'Quicksilver',      icon: 'icons/cards/capone-quicksilver.png' },
  { id: 'capone-venture',     group: 'Capital One',      name: 'Venture',          icon: 'icons/cards/capone-venture.png' },
  { id: 'capone-venturex',    group: 'Capital One',      name: 'Venture X',        icon: 'icons/cards/capone-venturex.png' },
  { id: 'capone-savor',       group: 'Capital One',      name: 'Savor',            icon: 'icons/cards/capone-savor.png' },
  { id: 'citi',               group: 'Citi',             name: 'Citi',             icon: 'icons/banks/citi.png' },
  { id: 'citi-doublecash',    group: 'Citi',             name: 'Double Cash',      icon: 'icons/cards/citi-doublecash.png' },
  { id: 'citi-customcash',    group: 'Citi',             name: 'Custom Cash',      icon: 'icons/cards/citi-customcash.png' },
  { id: 'citi-strata',        group: 'Citi',             name: 'Strata',           icon: 'icons/cards/citi-strata.png' },
  { id: 'citi-costco',        group: 'Citi',             name: 'Costco Anywhere',  icon: 'icons/cards/citi-costco.png' },
  { id: 'discover',           group: 'Discover',         name: 'Discover',         icon: 'icons/banks/discover.png' },
  { id: 'discover-it',        group: 'Discover',         name: 'Discover it',      icon: 'icons/cards/discover-it.png' },
  { id: 'discover-miles',     group: 'Discover',         name: 'Miles',            icon: 'icons/cards/discover-miles.png' },
  { id: 'discover-student',   group: 'Discover',         name: 'Student',          icon: 'icons/cards/discover-student.png' },
  { id: 'bankofamerica',      group: 'Bank of America',  name: 'Bank of America',  icon: 'icons/banks/bankofamerica.png' },
  { id: 'bofa-customized',    group: 'Bank of America',  name: 'Customized Cash Rewards',  icon: 'icons/cards/bofa-customized.png' },
  { id: 'bofa-travel',        group: 'Bank of America',  name: 'Travel Rewards',   icon: 'icons/cards/bofa-travel.png' },
  { id: 'bofa-premium',       group: 'Bank of America',  name: 'Premium Rewards',  icon: 'icons/cards/bofa-premium.png' },
  { id: 'bofa-unlimited',     group: 'Bank of America',  name: 'Unlimited Cash Rewards',   icon: 'icons/cards/bofa-unlimited.png' },
  { id: 'wellsfargo',         group: 'Wells Fargo',      name: 'Wells Fargo',      icon: 'icons/banks/wellsfargo.png' },
  { id: 'wells-activecash',   group: 'Wells Fargo',      name: 'Active Cash',      icon: 'icons/cards/wells-activecash.png' },
  { id: 'wells-autograph',    group: 'Wells Fargo',      name: 'Autograph',        icon: 'icons/cards/wells-autograph.png' },
  { id: 'wells-reflect',      group: 'Wells Fargo',      name: 'Reflect',          icon: 'icons/cards/wells-reflect.png' },
  { id: 'wells-bilt',         group: 'Wells Fargo',      name: 'Bilt Mastercard',             icon: 'icons/cards/wells-bilt.png' },
  { id: 'visa',               group: 'Networks',         name: 'Visa',             icon: 'icons/banks/visa.png' },
  { id: 'mastercard',         group: 'Networks',         name: 'Mastercard',       icon: 'icons/banks/mastercard.png' },
  { id: 'usbank',             group: 'U.S. Bank',      name: 'U.S. Bank',        icon: 'icons/banks/usbank.png' },
  { id: 'pnc',                group: 'PNC',      name: 'PNC',              icon: 'icons/banks/pnc.png' },
  { id: 'tdbank',             group: 'TD Bank',      name: 'TD Bank',          icon: 'icons/banks/tdbank.png' },
  { id: 'generic',            group: 'Other',            name: 'Generic card',     icon: 'icons/banks/generic.png' }
];
var BANKS = BASE_BANKS.concat(typeof CARD_DESIGNS !== 'undefined' ? CARD_DESIGNS : []);
function bankOf(id) {
  for (var i = 0; i < BANKS.length; i++) if (BANKS[i].id === id) return BANKS[i];
  for (var j = 0; j < BANKS.length; j++) if (BANKS[j].id === 'generic') return BANKS[j];
  return BANKS[0];
}

/* ---------------- storage ---------------- */
var KEY = 'finance-app-v1';
function blankState() {
  return { transactions: [], accounts: [], cards: [], goals: [], settings: { leadDays: 3, theme: 'system' } };
}
function loadState() {
  try {
    var raw = null;
    if (typeof localStorage !== 'undefined') raw = localStorage.getItem(KEY);
    if (raw) {
      var s = JSON.parse(raw);
      var b = blankState();
      ['transactions', 'accounts', 'cards', 'goals'].forEach(function (k) {
        if (Array.isArray(s[k])) b[k] = s[k];
      });
      if (s.settings && (s.settings.leadDays === 2 || s.settings.leadDays === 3)) b.settings.leadDays = s.settings.leadDays;
      if (s.settings && (s.settings.theme === 'light' || s.settings.theme === 'dark' || s.settings.theme === 'system')) b.settings.theme = s.settings.theme;
      b.cards.forEach(function (c) { if (!c.bankId) c.bankId = 'generic'; });
      return b;
    }
  } catch (e) { /* corrupted or unavailable: start fresh */ }
  return blankState();
}
function persist(st) {
  if (typeof localStorage === 'undefined') return false;
  try { localStorage.setItem(KEY, JSON.stringify(st)); return true; }
  catch (e) { return false; }
}

/* ---------------- domain logic (pure, testable) ---------------- */
/* Ledger: balances are always recomputed from opening balances + transactions. */
function recompute(st) {
  var acctBal = {}, cardBal = {}, goalSaved = {};
  st.accounts.forEach(function (a) { acctBal[a.id] = round2(a.openingBalance || 0); });
  st.cards.forEach(function (c) { cardBal[c.id] = round2(c.openingBalance || 0); });
  st.goals.forEach(function (g) { goalSaved[g.id] = round2(g.initialSaved || 0); });
  var txs = st.transactions.slice().sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  txs.forEach(function (t) {
    var amt = round2(+t.amount || 0);
    if (t.kind === 'income') {
      if (acctBal[t.accountId] == null) acctBal[t.accountId] = 0;
      acctBal[t.accountId] = round2(acctBal[t.accountId] + amt);
    } else if (t.kind === 'expense') {
      if (t.methodType === 'card') {
        if (cardBal[t.methodId] == null) cardBal[t.methodId] = 0;
        cardBal[t.methodId] = round2(cardBal[t.methodId] + amt);
      } else {
        if (acctBal[t.methodId] == null) acctBal[t.methodId] = 0;
        acctBal[t.methodId] = round2(acctBal[t.methodId] - amt);
      }
    } else if (t.kind === 'cardpayment') {
      if (acctBal[t.accountId] == null) acctBal[t.accountId] = 0;
      if (cardBal[t.cardId] == null) cardBal[t.cardId] = 0;
      acctBal[t.accountId] = round2(acctBal[t.accountId] - amt);
      cardBal[t.cardId] = round2(cardBal[t.cardId] - amt);
    } else if (t.kind === 'saving') {
      if (acctBal[t.accountId] == null) acctBal[t.accountId] = 0;
      if (goalSaved[t.goalId] == null) goalSaved[t.goalId] = 0;
      acctBal[t.accountId] = round2(acctBal[t.accountId] - amt);
      goalSaved[t.goalId] = round2(goalSaved[t.goalId] + amt);
    }
  });
  return { acctBal: acctBal, cardBal: cardBal, goalSaved: goalSaved };
}

function periodRange(view, refStr) {
  var ref = parseDate(refStr), s, e, label;
  if (view === 'daily') {
    s = ref; e = ref;
    label = ref.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } else if (view === 'weekly') {
    var dow = (ref.getDay() + 6) % 7; // Monday start
    s = addDays(ref, -dow); e = addDays(s, 6);
    var f = { month: 'short', day: 'numeric' };
    label = 'Week of ' + s.toLocaleDateString(undefined, f) + ' – ' + e.toLocaleDateString(undefined, f) + ', ' + e.getFullYear();
  } else {
    s = new Date(ref.getFullYear(), ref.getMonth(), 1);
    e = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    label = ref.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  return { start: fmtDate(s), end: fmtDate(e), label: label };
}

function summarize(st, view, refStr) {
  var r = periodRange(view, refStr);
  var inn = 0, out = 0, byCat = {};
  st.transactions.forEach(function (t) {
    if (t.date < r.start || t.date > r.end) return;
    var amt = round2(+t.amount || 0);
    if (t.kind === 'income') { inn = round2(inn + amt); }
    else if (t.kind === 'expense') {
      out = round2(out + amt);
      var c = t.category || 'Other';
      byCat[c] = round2((byCat[c] || 0) + amt);
    } else if (t.kind === 'cardpayment') {
      out = round2(out + amt);
      byCat['Card payment'] = round2((byCat['Card payment'] || 0) + amt);
    } else if (t.kind === 'saving') {
      out = round2(out + amt);
      byCat['Savings'] = round2((byCat['Savings'] || 0) + amt);
    }
  });
  return { inn: inn, out: out, net: round2(inn - out), byCat: byCat, label: r.label };
}

function nextDueDate(dueDay, fromStr) {
  var f = parseDate(fromStr), y = f.getFullYear(), m = f.getMonth();
  var d = new Date(y, m, clampDay(y, m, dueDay));
  if (fmtDate(d) < fromStr) {
    m++; if (m > 11) { m = 0; y++; }
    d = new Date(y, m, clampDay(y, m, dueDay));
  }
  return d;
}

/* Twice-monthly plan: first payment ~2 weeks before final; final lands leadDays before due date. */
function cardPlan(card, balance, leadDays, todayS) {
  var today = todayS || todayStr();
  balance = round2(+balance || 0);
  if (balance <= 0) return { status: 'clear' };
  var due = nextDueDate(card.dueDay, today);
  var dueS = fmtDate(due);
  var daysToDue = Math.round((due.getTime() - parseDate(today).getTime()) / DAY);
  if (daysToDue <= leadDays) {
    return { status: 'urgent', due: dueS, payments: [{ date: today, amount: balance, label: 'Pay now' }] };
  }
  var finalDate = addDaysStr(dueS, -leadDays);
  var firstDate = addDaysStr(dueS, -(leadDays + 14));
  if (firstDate < today) firstDate = today;
  if (firstDate >= finalDate) firstDate = addDaysStr(finalDate, -1);
  if (firstDate < today) firstDate = today;
  var firstAmt = round2(balance / 2);
  return {
    status: 'scheduled', due: dueS,
    payments: [
      { date: firstDate, amount: firstAmt, label: 'First payment' },
      { date: finalDate, amount: round2(balance - firstAmt), label: 'Final payment' }
    ]
  };
}

function savingsRoadmap(goal, saved, todayS) {
  var today = todayS || todayStr();
  saved = round2(+saved || 0);
  var remaining = round2(goal.target - saved);
  var daysLeft = Math.max(0, Math.round((parseDate(goal.targetDate).getTime() - parseDate(today).getTime()) / DAY));
  if (remaining <= 0) return { done: true, remaining: 0, daysLeft: daysLeft, milestones: [] };
  if (daysLeft <= 0) {
    return { done: false, overdue: true, remaining: remaining, daysLeft: 0,
      perDay: remaining, perWeek: remaining, perMonth: remaining, milestones: [] };
  }
  var perDay = remaining / daysLeft, milestones = [], w;
  for (w = 1; w * 7 < daysLeft; w++) {
    milestones.push({ date: addDaysStr(today, w * 7), target: round2(saved + perDay * w * 7) });
  }
  milestones.push({ date: goal.targetDate, target: round2(goal.target) });
  return { done: false, remaining: remaining, daysLeft: daysLeft,
    perDay: round2(perDay), perWeek: round2(perDay * 7), perMonth: round2(perDay * 30.44),
    milestones: milestones };
}

/* ---------------- CSV (UTF-8 BOM + CRLF: Excel/Numbers/Sheets/LibreOffice safe) ---------------- */
function csvCell(v) {
  if (v == null) v = '';
  v = String(v);
  return (/[",\n\r]/.test(v)) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function toCSV(rows) {
  return '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
}
function txCSV(st) {
  var rows = [['id', 'date', 'kind', 'amount', 'category', 'account', 'method', 'card', 'goal', 'note']];
  var an = {}, cn = {}, gn = {};
  st.accounts.forEach(function (a) { an[a.id] = a.name; });
  st.cards.forEach(function (c) { cn[c.id] = c.name; });
  st.goals.forEach(function (g) { gn[g.id] = g.name; });
  st.transactions.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (t) {
    rows.push([t.id, t.date, t.kind, (+t.amount).toFixed(2), t.category || '',
      an[t.accountId] || '', t.methodType === 'card' ? 'card' : (t.methodType || ''),
      cn[t.cardId || t.methodId] || '', gn[t.goalId] || '', t.note || '']);
  });
  return toCSV(rows);
}
function accountsCSV(st) {
  var bal = recompute(st).acctBal;
  var rows = [['id', 'name', 'current_balance']];
  st.accounts.forEach(function (a) { rows.push([a.id, a.name, (bal[a.id] || 0).toFixed(2)]); });
  return toCSV(rows);
}
function cardsCSV(st) {
  var bal = recompute(st).cardBal;
  var rows = [['id', 'name', 'apr', 'due_day', 'limit', 'min_payment', 'current_balance']];
  st.cards.forEach(function (c) {
    rows.push([c.id, c.name, c.apr, c.dueDay, c.limit || '', c.minPayment || '', (bal[c.id] || 0).toFixed(2)]);
  });
  return toCSV(rows);
}
function goalsCSV(st) {
  var sv = recompute(st).goalSaved;
  var rows = [['id', 'name', 'target', 'saved', 'target_date']];
  st.goals.forEach(function (g) {
    rows.push([g.id, g.name, (+g.target).toFixed(2), (sv[g.id] || 0).toFixed(2), g.targetDate]);
  });
  return toCSV(rows);
}

/* ---------------- backup / restore ---------------- */
function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') return 'Not a valid backup file.';
  var need = ['transactions', 'accounts', 'cards', 'goals'];
  for (var i = 0; i < need.length; i++) if (!Array.isArray(obj[need[i]])) return 'Backup is missing "' + need[i] + '".';
  return null;
}

/* Due dates repeat monthly. Returns { dayNumber: [card, ...] } for the given month (0-11). */
function dueDatesInMonth(cards, year, month) {
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var map = {};
  cards.forEach(function (c) {
    var day = Math.min(c.dueDay, daysInMonth);
    if (!map[day]) map[day] = [];
    map[day].push(c);
  });
  return map;
}

/* ---------------- reminders (local) ---------------- */
function dueReminders(st, todayS) {
  var today = todayS || todayStr();
  var items = [];
  var bal = recompute(st);
  var soon = addDaysStr(today, 3);
  st.cards.forEach(function (c) {
    var b = bal.cardBal[c.id] || 0;
    if (b <= 0) return;
    var plan = cardPlan(c, b, st.settings.leadDays, today);
    if (plan.status === 'urgent') {
      items.push({ kind: 'card', urgent: true, text: c.name + ': pay ' + money(b) + ' now — due ' + plan.due + '.' });
    } else if (plan.status === 'scheduled') {
      plan.payments.forEach(function (p) {
        if (p.date <= soon) items.push({ kind: 'card', urgent: p.date <= today, text: c.name + ': ' + p.label.toLowerCase() + ' of ' + money(p.amount) + ' on ' + p.date + ' (due ' + plan.due + ').' });
      });
    }
  });
  st.goals.forEach(function (g) {
    var saved = bal.goalSaved[g.id] || 0;
    var rm = savingsRoadmap(g, saved, today);
    if (!rm.done && !rm.overdue && rm.remaining > 0 && rm.daysLeft <= 14) {
      items.push({ kind: 'goal', urgent: false, text: g.name + ': ' + money(rm.remaining) + ' to go in ' + rm.daysLeft + ' days (' + money(rm.perDay) + '/day).' });
    }
  });
  return items;
}
function notifyUser(title, body) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body: body });
      return true;
    }
  } catch (e) {}
  return false;
}

/* ---------------- theme ---------------- */
function resolveTheme(setting, prefersDark) {
  if (setting === 'dark') return 'dark';
  if (setting === 'light') return 'light';
  return prefersDark ? 'dark' : 'light'; // 'system' or unknown falls back to device
}
function devicePrefersDark() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
  catch (e) { return false; }
}
function applyTheme() {
  var t = resolveTheme(state.settings.theme, devicePrefersDark());
  try {
    document.documentElement.dataset.theme = t;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1D1B17' : '#5F7A61');
  } catch (e) {}
}

/* ---------------- download helper ---------------- */
function download(name, content, mime) {
  var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------------- app state + rendering ---------------- */
var state = null;
var ui = { tab: 'overview', periodView: 'monthly', periodRef: todayStr(), activityFilter: 'all', openGoal: null, calRef: todayStr(), calDay: null };
var INCOME_CATS = ['Paycheck', 'Freelance', 'Interest', 'Gift', 'Other'];
var EXPENSE_CATS = ['Groceries', 'Dining', 'Transport', 'Housing', 'Utilities', 'Health', 'Shopping', 'Entertainment', 'Travel', 'Fees', 'Other'];
var CHART_COLORS = ['#5F7A61', '#7FA88F', '#A8BFA0', '#D9C27E', '#C98F5F', '#B3541E', '#8A8375', '#4E6E8E'];

function $(id) { return document.getElementById(id); }
function toast(msg) {
  var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(t._h); t._h = setTimeout(function () { t.classList.add('hidden'); }, 2600);
}
function nameOf(list, id) {
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
  return '—';
}
function shiftPeriod(dir) {
  var d = parseDate(ui.periodRef);
  if (ui.periodView === 'daily') d = addDays(d, dir);
  else if (ui.periodView === 'weekly') d = addDays(d, dir * 7);
  else d = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  ui.periodRef = fmtDate(d);
  render();
}
function showTab(name) {
  ui.tab = name;
  document.querySelectorAll('.tabbar button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
  document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
  render();
}

function drawChart(canvas, byCat) {
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.clientWidth || canvas.parentElement.clientWidth || 300, h = 180;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  var darkMode = false;
  try { darkMode = document.documentElement.getAttribute('data-theme') === 'dark'; } catch (e) {}
  var inkCol = darkMode ? '#EDE8DC' : '#2C2A25';
  var mutCol = darkMode ? '#A79E8B' : '#8A8375';
  var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  var entries = Object.keys(byCat).map(function (k) { return [k, byCat[k]]; })
    .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
  if (!entries.length) {
    ctx.fillStyle = mutCol; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('No spending in this period', w / 2, h / 2);
    return;
  }
  var max = entries[0][1], padL = 8, padB = 34, padT = 12;
  var bw = (w - padL * 2) / entries.length, bh = h - padB - padT;
  ctx.textAlign = 'center';
  entries.forEach(function (e, i) {
    var x = padL + i * bw + 4, bwid = bw - 8, bhgt = Math.max(3, (e[1] / max) * bh);
    var y = padT + (bh - bhgt);
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bwid, bhgt, 4); else ctx.rect(x, y, bwid, bhgt);
    ctx.fill();
    ctx.fillStyle = inkCol; ctx.font = '600 11px sans-serif';
    ctx.fillText('$' + Math.round(e[1]), x + bwid / 2, y - 4);
    ctx.fillStyle = mutCol; ctx.font = '10px sans-serif';
    var label = e[0].length > 10 ? e[0].slice(0, 9) + '…' : e[0];
    ctx.fillText(label, x + bwid / 2, h - 18);
  });
}

function render() {
  var bal = recompute(state);
  var totalBal = state.accounts.reduce(function (s, a) { return s + (bal.acctBal[a.id] || 0); }, 0);
  $('headerBalance').textContent = money(totalBal);

  // reminders banner
  var rems = dueReminders(state, todayStr());
  var banner = $('reminderBanner');
  if (rems.length) {
    banner.innerHTML = '⏰ ' + esc(rems[0].text) + (rems.length > 1 ? ' (+' + (rems.length - 1) + ' more — see Home)' : '');
    banner.classList.remove('hidden');
  } else banner.classList.add('hidden');

  renderOverview(bal); renderActivity(bal); renderCards(bal); renderAccounts(bal); renderGoals(bal); renderCalendar(bal); renderSettings();
}

function renderOverview(bal) {
  var s = summarize(state, ui.periodView, ui.periodRef);
  $('periodLabel').textContent = s.label;
  $('totalIn').textContent = money(s.inn);
  $('totalOut').textContent = money(s.out);
  var net = $('totalNet'); net.textContent = money(s.net);
  net.style.color = s.net < 0 ? '#A63A3A' : '#3E5540';
  document.querySelectorAll('.seg button').forEach(function (b) {
    var on = b.dataset.view === ui.periodView;
    b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
  });
  drawChart($('catChart'), s.byCat);
  var keys = Object.keys(s.byCat).sort(function (a, b) { return s.byCat[b] - s.byCat[a]; }).slice(0, 8);
  $('catLegend').innerHTML = keys.map(function (k, i) {
    return '<span><span class="sw" style="background:' + CHART_COLORS[i % CHART_COLORS.length] + '"></span>' + esc(k) + ' ' + money(s.byCat[k]) + '</span>';
  }).join('');

  var up = [];
  state.cards.forEach(function (c) {
    var b = bal.cardBal[c.id] || 0; if (b <= 0) return;
    var plan = cardPlan(c, b, state.settings.leadDays, todayStr());
    if (plan.status === 'clear') return;
    plan.payments.forEach(function (p) {
      if (p.date <= addDaysStr(todayStr(), 14)) {
        up.push('<div class="item"><div class="main"><div class="title">' + esc(c.name) + '</div><div class="sub">' +
          esc(p.label) + ' · due ' + esc(plan.due) + (plan.status === 'urgent' ? ' <span class="pill urgent">PAY NOW</span>' : '') +
          '</div></div><div class="amt">' + money(p.amount) + '</div></div>');
      }
    });
  });
  $('upcomingList').innerHTML = up.length ? up.join('') : '<div class="empty">No card payments due in the next 14 days.</div>';

  var pace = [];
  state.goals.forEach(function (g) {
    var saved = bal.goalSaved[g.id] || 0;
    var rm = savingsRoadmap(g, saved, todayStr());
    if (rm.done) pace.push('<div class="item"><div class="main"><div class="title">' + esc(g.name) + '</div><div class="sub">Goal reached 🎉</div></div><div class="amt pos">' + money(saved) + '</div></div>');
    else if (!rm.overdue) pace.push('<div class="item"><div class="main"><div class="title">' + esc(g.name) + '</div><div class="sub">' + money(rm.perDay) + '/day · ' + rm.daysLeft + ' days left</div></div><div class="amt">' + money(rm.remaining) + ' to go</div></div>');
  });
  $('savingsPace').innerHTML = pace.length ? pace.join('') : '<div class="empty">No savings goals yet.</div>';
}

function txLine(t) {
  var amtCls = t.kind === 'income' ? 'pos' : 'neg';
  var sign = t.kind === 'income' ? '+' : '−';
  var desc = t.kind === 'income' ? 'Income · ' + (t.category || '') :
    t.kind === 'expense' ? (t.category || 'Expense') + ' · ' + (t.methodType === 'card' ? nameOf(state.cards, t.methodId) : nameOf(state.accounts, t.methodId)) :
    t.kind === 'cardpayment' ? 'Card payment · ' + nameOf(state.cards, t.cardId) :
    'Savings · ' + nameOf(state.goals, t.goalId);
  return '<div class="item" data-tx="' + t.id + '"><div class="main"><div class="title">' + sign + money(t.amount) + '</div>' +
    '<div class="sub">' + t.date + ' · ' + esc(desc) + (t.note ? ' · ' + esc(t.note) : '') + '</div></div>' +
    '<div class="amt ' + amtCls + '">' + sign + money(t.amount).slice(0) + '</div></div>';
}

function renderActivity() {
  var list = state.transactions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  if (ui.activityFilter !== 'all') list = list.filter(function (t) { return t.kind === ui.activityFilter; });
  $('txList').innerHTML = list.length ? list.slice(0, 200).map(txLine).join('') : '<div class="empty">No entries yet. Tap ＋ to add one.</div>';
  $('txList').querySelectorAll('.item').forEach(function (el) {
    el.addEventListener('click', function () { openTxModal(el.dataset.tx); });
  });
}

function renderCards(bal) {
  var html = state.cards.map(function (c) {
    var b = bal.cardBal[c.id] || 0;
    var util = c.limit ? Math.round(b / c.limit * 100) : null;
    var bk = bankOf(c.bankId);
    return '<div class="item"><img class="card-ico" src="' + bk.icon + '" alt="' + esc(bk.name) + '">' +
      '<div class="main"><div class="title">' + esc(c.name) + '</div>' +
      '<div class="sub">APR ' + esc(String(c.apr)) + '% · due day ' + c.dueDay +
      (c.minPayment ? ' · min ' + money(c.minPayment) : '') + (util != null ? ' · ' + util + '% of limit' : '') + '</div>' +
      '<div class="progress"><div style="width:' + Math.min(100, util || 0) + '%"></div></div></div>' +
      '<div style="text-align:right"><div class="amt">' + money(b) + '</div>' +
      '<div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">' +
      '<button class="btn small" data-paycard="' + c.id + '">Pay</button>' +
      '<button class="btn small ghost" data-editcard="' + c.id + '">Edit</button></div></div></div>';
  }).join('');
  $('cardList').innerHTML = html || '<div class="empty">No cards yet.</div>';
  $('cardList').querySelectorAll('[data-paycard]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); openTxModal(null, 'cardpayment', { cardId: btn.dataset.paycard }); });
  });
  $('cardList').querySelectorAll('[data-editcard]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); openCardModal(btn.dataset.editcard); });
  });

  var plans = state.cards.map(function (c) {
    var b = bal.cardBal[c.id] || 0;
    var plan = cardPlan(c, b, state.settings.leadDays, todayStr());
    if (plan.status === 'clear') return '';
    var rows = plan.payments.map(function (p) {
      return '<div class="kv"><span class="k">' + esc(p.label) + ' · ' + esc(p.date) + '</span><span>' + money(p.amount) + '</span></div>';
    }).join('');
    return '<div class="item" style="display:block"><div class="row-between"><div class="title">' + esc(c.name) + '</div>' +
      (plan.status === 'urgent' ? '<span class="pill urgent">PAY NOW · due ' + esc(plan.due) + '</span>' : '<span class="pill">due ' + esc(plan.due) + '</span>') +
      '</div>' + rows + '</div>';
  }).join('');
  $('planList').innerHTML = plans || '<div class="empty">Add a card with a balance to see its payment plan.</div>';
}

function renderCalendar(bal) {
  var ref = parseDate(ui.calRef), y = ref.getFullYear(), m = ref.getMonth();
  $('calLabel').textContent = ref.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  var map = dueDatesInMonth(state.cards, y, m);
  var startDow = (new Date(y, m, 1).getDay() + 6) % 7; // Monday start
  var days = new Date(y, m + 1, 0).getDate();
  var todayS = todayStr();
  var html = ['<div class="cal-dow"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div><div class="cal-grid">'];
  var i, d;
  for (i = 0; i < startDow; i++) html.push('<div class="cal-day empty"></div>');
  for (d = 1; d <= days; d++) {
    var ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var dues = map[d] || [];
    var cls = 'cal-day' + (ds === todayS ? ' today' : '') + (dues.length ? ' has-due' : '') + (ui.calDay === d ? ' selected' : '');
    var icons = dues.slice(0, 3).map(function (c) {
      var bk = bankOf(c.bankId);
      return '<img src="' + bk.icon + '" alt="' + esc(c.name) + '" title="' + esc(c.name) + '">';
    }).join('');
    if (dues.length > 3) icons += '<span class="cal-more">+' + (dues.length - 3) + '</span>';
    html.push('<div class="' + cls + '" data-calday="' + d + '"><span class="cal-num">' + d + '</span><span class="cal-icons">' + icons + '</span></div>');
  }
  html.push('</div>');
  $('calGrid').innerHTML = html.join('');

  var detail = '';
  if (ui.calDay && map[ui.calDay]) {
    var monthName = ref.toLocaleDateString(undefined, { month: 'long' });
    detail = '<h3 style="margin:0 0 8px;font-size:14px">Due ' + monthName + ' ' + ui.calDay + '</h3>' +
      map[ui.calDay].map(function (c) {
        var b = bal.cardBal[c.id] || 0;
        var bk = bankOf(c.bankId);
        return '<div class="item"><img class="card-ico" src="' + bk.icon + '" alt="' + esc(bk.name) + '">' +
          '<div class="main"><div class="title">' + esc(c.name) + '</div>' +
          '<div class="sub">Balance ' + money(b) + ' · APR ' + esc(String(c.apr)) + '%</div></div>' +
          '<button class="btn small" data-calpay="' + c.id + '">Pay</button></div>';
      }).join('');
  }
  $('calDetail').innerHTML = detail;

  $('calGrid').querySelectorAll('[data-calday]').forEach(function (el) {
    el.addEventListener('click', function () {
      var day = parseInt(el.dataset.calday, 10);
      ui.calDay = (ui.calDay === day) ? null : day;
      renderCalendar(bal);
    });
  });
  $('calDetail').querySelectorAll('[data-calpay]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); openTxModal(null, 'cardpayment', { cardId: btn.dataset.calpay }); });
  });
}

function shiftCalMonth(dir) {
  var d = parseDate(ui.calRef);
  ui.calRef = fmtDate(new Date(d.getFullYear(), d.getMonth() + dir, 1));
  ui.calDay = null;
  render();
}

function renderAccounts(bal) {
  $('accountList').innerHTML = state.accounts.map(function (a) {
    return '<div class="item"><div class="main"><div class="title">' + esc(a.name) + '</div>' +
      '<div class="sub">Balance updates automatically from your entries</div></div>' +
      '<div style="text-align:right"><div class="amt">' + money(bal.acctBal[a.id] || 0) + '</div>' +
      '<div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">' +
      '<button class="btn small" data-deposit="' + a.id + '">Deposit</button>' +
      '<button class="btn small ghost" data-editacct="' + a.id + '">Edit</button></div></div></div>';
  }).join('') || '<div class="empty">No accounts yet.</div>';
  $('accountList').querySelectorAll('[data-deposit]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); openTxModal(null, 'income', { accountId: btn.dataset.deposit }); });
  });
  $('accountList').querySelectorAll('[data-editacct]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); openAccountModal(btn.dataset.editacct); });
  });
}

function renderGoals(bal) {
  $('goalList').innerHTML = state.goals.map(function (g) {
    var saved = bal.goalSaved[g.id] || 0;
    var pct = g.target > 0 ? Math.min(100, Math.round(saved / g.target * 100)) : 0;
    return '<div class="item" style="display:block" data-goal="' + g.id + '"><div class="row-between"><div class="title">' + esc(g.name) + '</div>' +
      '<div class="amt">' + money(saved) + ' <span class="muted-note">/ ' + money(g.target) + '</span></div></div>' +
      '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
      '<div class="sub" style="margin-top:6px">Target ' + esc(g.targetDate) + ' · ' + pct + '%</div>' +
      '<div style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end">' +
      '<button class="btn small" data-roadmap="' + g.id + '">Roadmap</button>' +
      '<button class="btn small" data-contrib="' + g.id + '">Contribute</button>' +
      '<button class="btn small ghost" data-editgoal="' + g.id + '">Edit</button></div></div>';
  }).join('') || '<div class="empty">No goals yet.</div>';
  var q = function (sel, fn) { $( 'goalList').querySelectorAll(sel).forEach(fn); };
  q('[data-roadmap]', function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); showRoadmap(b.dataset.roadmap, bal); }); });
  q('[data-contrib]', function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); openTxModal(null, 'saving', { goalId: b.dataset.contrib }); }); });
  q('[data-editgoal]', function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); openGoalModal(b.dataset.editgoal); }); });
  if (ui.openGoal) showRoadmap(ui.openGoal, bal, true);
}

function showRoadmap(goalId, bal, keep) {
  var g = state.goals.find(function (x) { return x.id === goalId; });
  if (!g) return;
  ui.openGoal = goalId;
  var saved = (bal || recompute(state)).goalSaved[goalId] || 0;
  var rm = savingsRoadmap(g, saved, todayStr());
  $('roadmapTitle').textContent = 'Roadmap — ' + g.name;
  var html = '';
  if (rm.done) {
    html = '<p>🎉 Goal reached! Saved ' + money(saved) + ' of ' + money(g.target) + '.</p>';
  } else if (rm.overdue) {
    html = '<p><strong>' + money(rm.remaining) + '</strong> still needed — the target date has passed. Pick a new date or adjust the target.</p>';
  } else {
    html = '<div class="kv"><span class="k">Remaining</span><span><strong>' + money(rm.remaining) + '</strong></span></div>' +
      '<div class="kv"><span class="k">Days left</span><span>' + rm.daysLeft + '</span></div>' +
      '<div class="kv"><span class="k">Per day</span><span>' + money(rm.perDay) + '</span></div>' +
      '<div class="kv"><span class="k">Per week</span><span>' + money(rm.perWeek) + '</span></div>' +
      '<div class="kv"><span class="k">Per month</span><span>' + money(rm.perMonth) + '</span></div>' +
      '<h3 style="margin:14px 0 4px;font-size:14px">Milestones</h3>' +
      '<table class="roadmap-table"><tr><th>By</th><th>Saved target</th></tr>' +
      rm.milestones.map(function (m) { return '<tr><td>' + esc(m.date) + '</td><td>' + money(m.target) + '</td></tr>'; }).join('') + '</table>';
  }
  $('roadmapBody').innerHTML = html;
  $('roadmapCard').classList.remove('hidden');
  if (!keep) $('roadmapCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderSettings() {
  $('setLeadDays').value = String(state.settings.leadDays);
  document.querySelectorAll('#themeSeg button').forEach(function (b) {
    var on = b.dataset.themeOpt === state.settings.theme;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  var n = $('notifyState');
  try {
    n.textContent = (typeof Notification !== 'undefined' && Notification.permission === 'granted') ? 'Notifications on.' : '';
  } catch (e) {}
}

/* ---------------- modals & forms ---------------- */
function openModal(id) { $(id).classList.remove('hidden'); }
function closeModals() { document.querySelectorAll('.modal').forEach(function (m) { m.classList.add('hidden'); }); }

function fillSelect(sel, items, placeholder) {
  sel.innerHTML = (placeholder ? '<option value="" disabled selected>' + esc(placeholder) + '</option>' : '') +
    items.map(function (it) { return '<option value="' + esc(it.id) + '">' + esc(it.name) + '</option>'; }).join('');
}

function syncTxForm() {
  var kind = $('txKind').value;
  var show = function (id, on) { $(id).classList.toggle('hidden', !on); };
  show('txCategoryWrap', kind === 'income' || kind === 'expense');
  show('txAccountWrap', kind !== 'expense');
  show('txMethodWrap', kind === 'expense');
  show('txCardWrap', kind === 'cardpayment');
  show('txGoalWrap', kind === 'saving');
  $('txAccountWrap').querySelector('span').textContent = kind === 'income' ? 'To account' : 'From account';
  var cat = $('txCategory');
  var cats = kind === 'income' ? INCOME_CATS : EXPENSE_CATS;
  cat.innerHTML = cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  if (kind === 'expense') {
    var opts = state.accounts.map(function (a) { return { id: 'a:' + a.id, name: a.name + ' (bank)' }; })
      .concat(state.cards.map(function (c) { return { id: 'c:' + c.id, name: c.name + ' (card)' }; }));
    $('txMethod').innerHTML = opts.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join('') || '<option value="" disabled>Add an account or card first</option>';
  }
}

function openTxModal(id, presetKind, preset) {
  preset = preset || {};
  fillSelect($('txAccount'), state.accounts, state.accounts.length ? null : 'Add an account first');
  fillSelect($('txCard'), state.cards, state.cards.length ? null : 'Add a card first');
  fillSelect($('txGoal'), state.goals, state.goals.length ? null : 'Add a goal first');
  var t = id ? state.transactions.find(function (x) { return x.id === id; }) : null;
  $('txModalTitle').textContent = t ? 'Edit entry' : 'Add entry';
  $('txId').value = t ? t.id : '';
  $('txKind').value = t ? t.kind : (presetKind || 'expense');
  $('txDate').value = t ? t.date : todayStr();
  $('txAmount').value = t ? t.amount : '';
  $('txNote').value = t ? (t.note || '') : '';
  syncTxForm();
  if (t) {
    $('txCategory').value = t.category || '';
    if (t.kind === 'income' || t.kind === 'cardpayment' || t.kind === 'saving') $('txAccount').value = t.accountId || '';
    if (t.kind === 'expense') $('txMethod').value = (t.methodType === 'card' ? 'c:' : 'a:') + t.methodId;
    if (t.kind === 'cardpayment') $('txCard').value = t.cardId || '';
    if (t.kind === 'saving') $('txGoal').value = t.goalId || '';
  } else {
    if (preset.accountId) $('txAccount').value = preset.accountId;
    if (preset.cardId) $('txCard').value = preset.cardId;
    if (preset.goalId) $('txGoal').value = preset.goalId;
  }
  $('txDelete').classList.toggle('hidden', !t);
  openModal('modalTx');
}

function readTxForm() {
  var kind = $('txKind').value;
  var amount = round2(parseFloat($('txAmount').value));
  if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');
  var date = $('txDate').value || todayStr();
  var base = { id: $('txId').value || uid(), kind: kind, date: date, amount: amount, note: $('txNote').value.trim() };
  if (kind === 'income') {
    if (!$('txAccount').value) throw new Error('Choose an account.');
    base.accountId = $('txAccount').value; base.category = $('txCategory').value;
  } else if (kind === 'expense') {
    var m = $('txMethod').value || '';
    if (!m) throw new Error('Choose what you paid with.');
    base.methodType = m.slice(0, 2) === 'c:' ? 'card' : 'account';
    base.methodId = m.slice(2);
    base.category = $('txCategory').value;
  } else if (kind === 'cardpayment') {
    if (!$('txAccount').value || !$('txCard').value) throw new Error('Choose an account and a card.');
    base.accountId = $('txAccount').value; base.cardId = $('txCard').value;
  } else if (kind === 'saving') {
    if (!$('txAccount').value || !$('txGoal').value) throw new Error('Choose an account and a goal.');
    base.accountId = $('txAccount').value; base.goalId = $('txGoal').value;
  }
  return base;
}

function openCardModal(id) {
  var c = id ? state.cards.find(function (x) { return x.id === id; }) : null;
  $('cardModalTitle').textContent = c ? 'Edit card' : 'Add card';
  $('cardId').value = c ? c.id : '';
  $('cardName').value = c ? c.name : '';
  $('cardApr').value = c ? c.apr : '';
  $('cardDueDay').value = c ? c.dueDay : '';
  $('cardLimit').value = c && c.limit ? c.limit : '';
  $('cardMinPay').value = c && c.minPayment ? c.minPayment : '';
  $('cardBalance').value = c ? (c.openingBalance || 0) : 0;
  var sel = $('cardIssuer');
  var seen = {}, order = [];
  BANKS.forEach(function (b) { if (!seen[b.group]) { seen[b.group] = []; order.push(b.group); } seen[b.group].push(b); });
  sel.innerHTML = order.map(function (g) {
    return '<optgroup label="' + esc(g) + '">' + seen[g].map(function (b) {
      return '<option value="' + b.id + '">' + esc(b.name) + '</option>';
    }).join('') + '</optgroup>';
  }).join('');
  sel.value = (c && c.bankId) ? c.bankId : 'generic';
  $('cardIssuerPreview').src = bankOf(sel.value).icon;
  $('cardIssuerPreview').alt = bankOf(sel.value).name;
  $('cardDelete').classList.toggle('hidden', !c);
  openModal('modalCard');
}

function openAccountModal(id) {
  var a = id ? state.accounts.find(function (x) { return x.id === id; }) : null;
  $('acctModalTitle').textContent = a ? 'Edit account' : 'Add account';
  $('acctId').value = a ? a.id : '';
  $('acctName').value = a ? a.name : '';
  $('acctBalance').value = a ? (a.openingBalance || 0) : 0;
  $('acctDelete').classList.toggle('hidden', !a);
  openModal('modalAccount');
}

function openGoalModal(id) {
  var g = id ? state.goals.find(function (x) { return x.id === id; }) : null;
  $('goalModalTitle').textContent = g ? 'Edit goal' : 'Add goal';
  $('goalId').value = g ? g.id : '';
  $('goalName').value = g ? g.name : '';
  $('goalTarget').value = g ? g.target : '';
  $('goalDate').value = g ? g.targetDate : '';
  $('goalSaved').value = g ? (g.initialSaved || 0) : 0;
  $('goalDelete').classList.toggle('hidden', !g);
  openModal('modalGoal');
}

function saveAndRender(msg) {
  if (!persist(state)) toast('Warning: browser storage unavailable — export a backup!');
  render();
  if (msg) toast(msg);
}

/* ---------------- init (DOM only) ---------------- */
function init() {
  state = loadState();
  applyTheme();
  try {
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) mq.addEventListener('change', function () {
      if (state.settings.theme === 'system') applyTheme();
    });
  } catch (e) {}

  document.querySelectorAll('#themeSeg button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.settings.theme = b.dataset.themeOpt;
      applyTheme(); saveAndRender('Appearance updated.');
    });
  });
  $('cardIssuer').addEventListener('change', function () {
    var bk = bankOf($('cardIssuer').value);
    $('cardIssuerPreview').src = bk.icon;
    $('cardIssuerPreview').alt = bk.name;
  });
  $('calPrev').addEventListener('click', function () { shiftCalMonth(-1); });
  $('calNext').addEventListener('click', function () { shiftCalMonth(1); });
  $('calToday').addEventListener('click', function () { ui.calRef = todayStr(); ui.calDay = null; render(); });

  document.querySelectorAll('.tabbar button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.addEventListener('click', function () { ui.periodView = b.dataset.view; ui.periodRef = todayStr(); render(); });
  });
  $('periodPrev').addEventListener('click', function () { shiftPeriod(-1); });
  $('periodNext').addEventListener('click', function () { shiftPeriod(1); });
  $('btnAdd').addEventListener('click', function () { openTxModal(null); });
  $('btnSettings').addEventListener('click', function () { showTab('settings'); });
  $('activityFilter').addEventListener('change', function () { ui.activityFilter = $('activityFilter').value; renderActivity(); });
  $('btnAddCard').addEventListener('click', function () { openCardModal(null); });
  $('btnAddAccount').addEventListener('click', function () { openAccountModal(null); });
  $('btnAddGoal').addEventListener('click', function () { openGoalModal(null); });
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeModals); });
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m) closeModals(); });
  });
  $('txKind').addEventListener('change', syncTxForm);

  $('txForm').addEventListener('submit', function (e) {
    e.preventDefault();
    try {
      var t = readTxForm();
      var i = state.transactions.findIndex(function (x) { return x.id === t.id; });
      if (i >= 0) state.transactions[i] = t; else state.transactions.push(t);
      closeModals(); saveAndRender('Saved.');
    } catch (err) { toast(err.message); }
  });
  $('txDelete').addEventListener('click', function () {
    state.transactions = state.transactions.filter(function (x) { return x.id !== $('txId').value; });
    closeModals(); saveAndRender('Deleted.');
  });

  $('cardForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var dueDay = parseInt($('cardDueDay').value, 10);
    var apr = parseFloat($('cardApr').value);
    if (!(dueDay >= 1 && dueDay <= 28)) { toast('Due day must be 1–28.'); return; }
    if (!(apr >= 0 && apr <= 60)) { toast('Enter a valid APR.'); return; }
    var c = {
      id: $('cardId').value || uid(), name: $('cardName').value.trim(), apr: round2(apr), dueDay: dueDay,
      bankId: $('cardIssuer').value || 'generic',
      limit: round2(parseFloat($('cardLimit').value) || 0) || null,
      minPayment: round2(parseFloat($('cardMinPay').value) || 0) || null,
      openingBalance: round2(parseFloat($('cardBalance').value) || 0)
    };
    if (!c.name) { toast('Name the card.'); return; }
    var i = state.cards.findIndex(function (x) { return x.id === c.id; });
    if (i >= 0) state.cards[i] = Object.assign(state.cards[i], c); else state.cards.push(c);
    closeModals(); saveAndRender('Card saved.');
  });
  $('cardDelete').addEventListener('click', function () {
    var id = $('cardId').value;
    state.cards = state.cards.filter(function (x) { return x.id !== id; });
    closeModals(); saveAndRender('Card deleted.');
  });

  $('acctForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var a = { id: $('acctId').value || uid(), name: $('acctName').value.trim(),
      openingBalance: round2(parseFloat($('acctBalance').value) || 0) };
    if (!a.name) { toast('Name the account.'); return; }
    var i = state.accounts.findIndex(function (x) { return x.id === a.id; });
    if (i >= 0) state.accounts[i] = Object.assign(state.accounts[i], a); else state.accounts.push(a);
    closeModals(); saveAndRender('Account saved.');
  });
  $('acctDelete').addEventListener('click', function () {
    var id = $('acctId').value;
    state.accounts = state.accounts.filter(function (x) { return x.id !== id; });
    closeModals(); saveAndRender('Account deleted.');
  });

  $('goalForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var g = { id: $('goalId').value || uid(), name: $('goalName').value.trim(),
      target: round2(parseFloat($('goalTarget').value) || 0), targetDate: $('goalDate').value,
      initialSaved: round2(parseFloat($('goalSaved').value) || 0) };
    if (!g.name || !(g.target > 0) || !g.targetDate) { toast('Fill in name, target and date.'); return; }
    var i = state.goals.findIndex(function (x) { return x.id === g.id; });
    if (i >= 0) { state.goals[i] = Object.assign(state.goals[i], g); } else state.goals.push(g);
    ui.openGoal = g.id;
    closeModals(); saveAndRender('Goal saved.'); showTab('goals');
  });
  $('goalDelete').addEventListener('click', function () {
    var id = $('goalId').value;
    state.goals = state.goals.filter(function (x) { return x.id !== id; });
    if (ui.openGoal === id) ui.openGoal = null;
    closeModals(); saveAndRender('Goal deleted.');
  });

  $('setLeadDays').addEventListener('change', function () {
    state.settings.leadDays = parseInt($('setLeadDays').value, 10) === 2 ? 2 : 3;
    saveAndRender('Payment plan updated.');
  });

  document.querySelectorAll('[data-csv]').forEach(function (b) {
    b.addEventListener('click', function () {
      var kind = b.dataset.csv, csv, name;
      if (kind === 'transactions') { csv = txCSV(state); name = 'transactions.csv'; }
      else if (kind === 'accounts') { csv = accountsCSV(state); name = 'accounts.csv'; }
      else if (kind === 'cards') { csv = cardsCSV(state); name = 'cards.csv'; }
      else { csv = goalsCSV(state); name = 'goals.csv'; }
      download(name, csv, 'text/csv;charset=utf-8');
      toast('Exported ' + name);
    });
  });

  $('btnBackup').addEventListener('click', function () {
    download('finance-backup-' + todayStr() + '.json', JSON.stringify(state, null, 2), 'application/json');
    toast('Backup downloaded.');
  });
  $('restoreFile').addEventListener('change', function () {
    var f = $('restoreFile').files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var obj = JSON.parse(r.result);
        var err = validateBackup(obj);
        if (err) { toast(err); return; }
        state = obj; ui.openGoal = null;
        saveAndRender('Backup restored.');
      } catch (e) { toast('Could not read that file.'); }
    };
    r.readAsText(f);
    $('restoreFile').value = '';
  });
  $('btnWipe').addEventListener('click', function () {
    if (confirm('Erase ALL local data? This cannot be undone. Export a backup first.')) {
      state = blankState(); ui.openGoal = null;
      saveAndRender('All data erased.');
    }
  });

  $('btnNotify').addEventListener('click', function () {
    if (typeof Notification === 'undefined') { toast('Notifications not supported here.'); return; }
    Notification.requestPermission().then(function (p) {
      renderSettings();
      toast(p === 'granted' ? 'Notifications on.' : 'Notifications not granted.');
    });
  });

  // local reminders on every open
  var rems = dueReminders(state, todayStr());
  var urgent = rems.filter(function (r) { return r.urgent; });
  if (urgent.length) notifyUser('Finance App', urgent[0].text);

  render();
}

/* expose pure logic for tests */
if (typeof window !== 'undefined') {
  window.FinanceApp = {
    blankState: blankState, loadState: loadState, persist: persist,
    recompute: recompute, periodRange: periodRange, summarize: summarize,
    nextDueDate: nextDueDate, cardPlan: cardPlan, savingsRoadmap: savingsRoadmap,
    dueReminders: dueReminders, validateBackup: validateBackup,
    csvCell: csvCell, toCSV: toCSV, txCSV: txCSV, accountsCSV: accountsCSV,
    cardsCSV: cardsCSV, goalsCSV: goalsCSV,
    money: money, parseDate: parseDate, fmtDate: fmtDate, addDays: addDays,
    addDaysStr: addDaysStr, round2: round2, uid: uid, resolveTheme: resolveTheme,
    BANKS: BANKS, bankOf: bankOf, dueDatesInMonth: dueDatesInMonth
  };
  if (document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
}
})();
