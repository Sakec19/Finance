# Google Drive Cloud Backup — Setup Guide

The app backs up to **your own Google Drive**, inside a folder named **Finance App**, as one encrypted file: `finance-backup.enc.json`. The backup is encrypted on your phone with your passphrase (PBKDF2-SHA256 + AES-GCM-256) **before** it is uploaded, so Google only ever sees ciphertext. The passphrase is never stored anywhere — not on the phone, not in Drive. Lose it and the cloud backup cannot be read; there is nothing to reset.

The app stays local-first: your data lives on the phone, and the Drive copy is only a safety net for a lost phone or a new device.

## One-time Google Cloud setup (~10 minutes, free)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with the Google account you want the backup in. Create a project (name it `Finance App`) or reuse an existing one.
2. **Enable the Drive API:** left menu → **APIs & Services → Library** → search **Google Drive API** → **Enable**.
3. **OAuth consent screen:** left menu → **APIs & Services → OAuth consent screen**.
   - User type: **External** → Create.
   - Fill in App name (`Finance App`), User support email (your email), Developer contact email (your email) → Save and Continue through Scopes (no scopes to add here) → **Audience** → under Test users, **Add users** → add your own Google email → Save.
   - The project stays in **Testing** mode. That is fine for personal use: only test users can sign in, and tokens expire sooner. You only need Google verification if you ever share the app with other people.
4. **Create the OAuth client ID:** left menu → **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
   - Application type: **Web application**. Name: `Finance App`.
   - **Authorized JavaScript origins:** add your app's exact URL (e.g. `https://your-site.netlify.app`). No trailing slash here.
   - **Authorized redirect URIs:** add the exact URL the app loads at, **including** the trailing slash/path (e.g. `https://your-site.netlify.app/`). The redirect URI must match the app's address exactly, or Google will show a `redirect_uri_mismatch` error.
   - Create, then copy the **Client ID** (it ends in `.apps.googleusercontent.com`). The Client Secret is not needed — this app uses the token (implicit) flow and never sees the secret.
5. **In the app:** Settings → Cloud backup → paste the Client ID → enter a passphrase → **Connect Google Drive** → sign in with the Google account you added as a test user. Google sends you back to the app.
6. Enter your passphrase again and tap **Back up now**. Check Drive: you should see a `Finance App` folder containing `finance-backup.enc.json`.

## Using it

- **Back up now** — encrypts the current data and uploads it (creates the file the first time, overwrites it after that).
- **Restore from Drive** — asks for confirmation, then replaces everything on this device with the Drive backup. Enter the same passphrase the backup was made with.
- **Auto-back up** — when on, every change is backed up silently. It needs a valid Google sign-in and your passphrase in memory: after reopening the app, enter your passphrase and tap **Back up now** once to resume it. It pauses (never pops up sign-in windows) if the sign-in expires.
- **Disconnect** — clears the sign-in on this device. Your Drive backup file is left in place.

## Important notes

- **HTTPS required.** Google sign-in and the encryption API both need a secure connection. Use the Netlify install (Path B in INSTALL-IPHONE.md). The home Wi-Fi preview (plain HTTP) cannot do cloud backup — the app will tell you so.
- **Netlify Drop URLs change on every deploy.** If you re-deploy and get a new URL, add the new URL to both **Authorized JavaScript origins** and **Authorized redirect URIs** in the Google Cloud Console, or rename the site / use a custom domain so the URL stays stable.
- **Passphrase:** choose a strong one and keep it in a password manager, separate from the backup. There is no recovery.
- **Revoking access:** [myaccount.google.com/permissions](https://myaccount.google.com/permissions) → remove `Finance App`. The backup file stays in Drive until you delete it.
- **Scope:** the app asks only for `drive.file` — it can see and manage only files it created, never the rest of your Drive.

## Troubleshooting

- `redirect_uri_mismatch` — the Authorized redirect URI in Google Cloud does not exactly match the app's URL. Copy the URL from the address bar and compare character by character (trailing slash matters).
- `access_denied` / sign-in blocked — sign in with the Google account you added as a **test user** on the consent screen's Audience page.
- `Error 403: org_internal` — you picked Internal user type; switch the consent screen to External.
- "Not connected" / "Google sign-in could not load" — no network, or the `accounts.google.com` script was blocked. Reload online and try again.
- Restore says "Wrong passphrase, or the backup is damaged" — the passphrase does not match the one used for that backup. Double-check caps lock / the password-manager entry.
- Auto-backup stopped — sign-ins expire after about an hour. Tap **Connect Google Drive**, then back up once to resume.

## What is and is not verified

- Verified by automated tests (35 passing): encryption round-trip, wrong-passphrase and tampered-backup rejection, no plaintext in the encrypted file, Drive API request shapes (folder find/create, upload create/update, download, account lookup) against a mock, and the sign-in return parsing.
- **Not yet verified:** the live Google sign-in round-trip and a real upload/restore against Google's servers — that needs a registered client ID and your sign-in, which only happens in the setup above. Please do one manual **Back up now → Restore** cycle after setup to confirm it end to end.
