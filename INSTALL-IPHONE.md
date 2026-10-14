# Get the Finance App on your iPhone

Everything below is free. Pick one path.

## Path A — Try it tonight on your home Wi-Fi (~2 minutes)

1. On your computer, in the `finance-app-pwa` folder, run:
   `python3 -m http.server 8080`
2. On your iPhone (same Wi-Fi), open Safari and go to:
   `http://<your-computer's-IP>:8080` (e.g. `http://192.168.1.20:8080`)
3. Safari → Share → **Add to Home Screen**.

Works right away. One honest limitation: plain home-network HTTP is not
"secure", so the offline service worker can't register — the app runs fine,
but it needs the network to load. Your data is still stored privately in
that browser on your phone.

## Path B — The real install, with offline support (~3 minutes)

1. Unzip `finance-app-pwa.zip` on your computer.
2. Go to **https://app.netlify.com/drop** (free, no account needed to start).
3. Drag the unzipped `finance-app-pwa` folder onto the page.
4. In ~30 seconds you get a permanent-ish HTTPS link like
   `https://random-name-123.netlify.app`. Optional: make a free account to
   keep it and rename it.
5. On your iPhone, open that link in Safari → Share → **Add to Home Screen**.
6. Open it once, then try airplane mode: the app still loads, and your data
   stays in the phone's local storage.

## First-run checklist (10 minutes, before your Oct 15 payment review)

1. **Settings** → set your final-payment preference (2 or 3 days before due date).
2. **Banks** → add each account with its current balance.
3. **Cards** → add each card: name, APR, due day, limit, minimum, balance.
4. **Goals** → add your savings goal with target + target date.
5. **Activity** → log today's income/expenses.
6. **Cloud backup (optional)** → follow `GOOGLE-DRIVE-SETUP.md` to connect your Google Drive, then do one manual Back up now → Restore cycle to confirm it end to end. Note: cloud backup needs the HTTPS install (Path B), not the HTTP Wi-Fi preview.

Once cards are in, the twice-monthly payment plan and the daily "due within
3 days" banner run on real data — and Muse's scheduled reminders (1st and
15th, plus the daily due-date check) will nudge you from there.
