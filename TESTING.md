# Tested vs untested

Run: `node test-pwa.js` (22 tests, Node 24).

## Tested (automated, all passing)

- Ledger math: income, expense (bank/card), card payments, savings contributions; balances recompute correctly after edits and deletes.
- Daily / Weekly (Mon–Sun) / Monthly period ranges and per-period in/out/net + spending-by-category totals.
- Card payment plan: twice-monthly schedule, final payment exactly 2–3 days before due date, "Pay now" when due within the lead window, no plan when balance is zero, due-date rollover to next month.
- Savings roadmap: per-day/week/month amounts, milestone table ending at the target, goal-reached and overdue states.
- CSV: UTF-8 BOM, CRLF endings, quoting/escaping of commas, quotes and newlines; all four exports (transactions, accounts, cards, goals).
- Backup validation (accepts good files, rejects malformed ones) and localStorage persist/load round-trip.
- Local reminder logic: urgent card items, goal-due-soon items, silence when nothing is due.
- Card designs: registry has 81 unique designs across 14 groups and every icon file exists on disk; unknown design falls back to generic; existing cards migrate to the generic issuer.
- Calendar: `dueDatesInMonth` maps cards to days, clamps to month length, handles empty lists.
- Static checks: `manifest.webmanifest` is valid JSON; all 79 element IDs used by `app.js` exist in `index.html`; all 90 service-worker cached assets exist on disk; all 20 CSS variables used are defined in both themes; `node --check` passes on all JS.
- Theme logic: `resolveTheme` (explicit light/dark, system→device, unknown→device fallback) and theme persistence/migration through `loadState`.

## Untested (needs a real device/browser)

- **Add to Home Screen install flow** on iPhone/Android — PWA meta tags, manifest and icons are in place per spec, but the actual install prompt was not exercised on a device.
- **True offline behavior** — the service worker uses a standard cache-first strategy, but offline loading was not tested in a real browser (service workers require HTTPS or localhost).
- **Notification API** — permission prompt and notification display depend on the user's browser/OS and were not tested; in-app reminder banners are the fallback and are logic-tested.
- **Visual layout** — no screenshot/render audit was run; the CSS is mobile-first and hand-checked, not device-verified.
- **File downloads/uploads** (CSV, backup, restore) — the code paths are standard Blob/FileReader flows but were not clicked through in a browser.
