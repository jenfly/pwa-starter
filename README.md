# pwa-starter

A minimal installable Progressive Web App, built as a staged testbed for a larger journal app project. Plain HTML/JS/CSS, no framework or build step.

**What's here:**
- An in-memory to-do list (no persistence yet) to prove out the PWA shell.
- A manifest + service worker for installability and basic offline support.
- Google Sign-In via [Google Identity Services](https://developers.google.com/identity/gsi/web), with a "List Drive files" button that validates the OAuth token against the Drive API.

Live at https://jenfly.github.io/pwa-starter/.

## Local setup

1. Serve the app over HTTP (service workers and Google Sign-In don't work from `file://`):
   ```
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000`.

## Google Sign-In setup

The app needs its own OAuth client ID to sign in:

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a project, then enable the **Google Drive API** under *APIs & Services → Library*.
2. Under *APIs & Services → OAuth consent screen*, set it to **External**, keep publish status as **Testing**, and add your Google account under **Test users**.
3. Under *APIs & Services → Credentials*, create an **OAuth client ID** of type **Web application**. Add these to **Authorized JavaScript origins**:
   - `http://localhost:8000`
   - `https://jenfly.github.io`
4. Copy the client ID into `GOOGLE_CLIENT_ID` in `app.js`. (This ID isn't secret — there's no backend to hold a client secret in this flow, so Google expects it embedded in front-end code. Access is actually restricted by the Authorized JavaScript origins above, not by hiding the ID.)

## Deployment

Deployed via GitHub Pages from the `main` branch.
