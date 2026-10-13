# Finance App — local-first installable web app (PWA)

A calm personal finance tracker. All data stays in the browser (localStorage). No account, no server.

## Implementation steps

1. **App shell** (`index.html`) — five views (Home, Activity, Cards, Banks, Goals) + Settings, bottom tab bar, modal forms, PWA meta tags (manifest link, `apple-touch-icon`, `mobile-web-app-capable`, `theme-color`).
2. **Ledger engine** (`app.js`) — every money movement is a typed transaction (`income`, `expense`, `cardpayment`, `saving`); balances are *recomputed* from opening balances + transactions, so edits/deletes can never corrupt balances.
3. **Views & charts** — Daily/Weekly/Monthly summaries (in / out / net) plus a hand-drawn canvas bar chart of spending by category. No chart library.
4. **Cards** — name, APR, due day (1–28), limit, minimum payment, starting balance. Twice-monthly payment plan: first payment ~2 weeks before the final; final lands 2 or 3 days before the due date (your choice in Settings). Due within the lead window → "Pay now" warning; zero balance → plan hidden.
5. **Savings goals** — target, target date, roadmap with per-day / per-week / per-month amounts and weekly milestone checkpoints.
6. **CSV export** — UTF-8 with BOM, CRLF line endings, RFC-4180 quoting. Opens correctly in Excel, Numbers, Google Sheets, LibreOffice on any OS.
7. **Backup & restore** — one JSON file download / upload with schema validation.
8. **Local reminders** — on every app open: cards due within 3 days and goals due within 14 days appear in a banner; optional Notification API prompt in Settings.
9. **Offline** — `sw.js` (cache-first app shell, versioned cache) + `manifest.webmanifest` + PNG/SVG icons generated with PIL.
10. **Appearance** — System / Light / Dark setting (Settings → Appearance). The whole UI runs on CSS variables; the saved theme is applied before first paint to avoid a flash, and System follows the device via `prefers-color-scheme` (live-updates if you change it).
11. **Card design icon pack** (92 designs, all cached offline): the icons now use the user's "previews" set — clean card photos for 41 existing designs plus 8 newly added designs (Blue Cash Preferred, BankAmeriCard, Premium Rewards Elite, Strata Premier, Strata Elite, Simplicity, Diamond Preferred, Costco Anywhere Business). The calendar, card list, and picker all show the same card-design icon, so due days on the calendar display the actual card. A few previews were mislabeled/blank in the source zip (Alaska file held the BofA logo, Unlimited file held a limited-offer card, Aviator file held a skyline photo, Synchrony files were blank, Bilt file held a Key card) — those slots kept their previous correct icons. The 13 issuer icons in `icons/banks/` remain (the Bank of America tile uses the real BofA logo).
12. **Due-date calendar** (Calendar tab) — month grid with each card's due date marked by its issuer icon; tap a day for details and quick Pay. Due days repeat monthly.

## Install

- **iPhone:** host the folder over HTTPS (or open `index.html`), then Share → Add to Home Screen. Open it once online so the service worker caches the shell; it then works offline.
- **Android/Desktop:** open the page → browser menu → Install.

## Data & privacy

Local-first: everything lives in this browser's localStorage under key `finance-app-v1`. Optional "cloud backup" = keep the downloaded JSON backup in your own cloud drive. Nothing is ever uploaded anywhere by the app.
