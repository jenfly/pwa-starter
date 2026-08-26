// ---- Google Sign-In (Google Identity Services) ----
// The client ID is not a secret in this flow — there's no server to hold a
// client secret, so Google expects it embedded in front-end code. Access is
// actually restricted via the Authorized JavaScript origins configured for
// this client ID in Google Cloud Console, not by hiding the ID.
const GOOGLE_CLIENT_ID = "619264296955-86r1crbhgret4jf27bb1hjm75jo3vlka.apps.googleusercontent.com";
// Read-only metadata scope, just enough to validate the token flow with a
// files.list call. Stage 3 will likely narrow this to drive.file once the
// app is creating/managing its own journal file.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";

const TOKEN_STORAGE_KEY = "google_access_token";
const HAS_SIGNED_IN_KEY = "google_has_signed_in";

const signinBtn = document.getElementById("signin-btn");
const signoutBtn = document.getElementById("signout-btn");
const listFilesBtn = document.getElementById("list-files-btn");
const authStatus = document.getElementById("auth-status");
const driveFiles = document.getElementById("drive-files");

let tokenClient;
let accessToken = null;

function loadStoredToken() {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    const { token, expiresAt } = JSON.parse(raw);
    if (Date.now() < expiresAt) return token;
  } catch {
    // fall through to cleanup below
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  return null;
}

function storeToken(token, expiresInSeconds) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  localStorage.setItem(HAS_SIGNED_IN_KEY, "true");
}

function setSignedInUI(signedIn) {
  signinBtn.classList.toggle("hidden", signedIn);
  signoutBtn.classList.toggle("hidden", !signedIn);
  listFilesBtn.classList.toggle("hidden", !signedIn);
  authStatus.textContent = signedIn ? "Signed in to Google" : "Not signed in";
  if (!signedIn) driveFiles.innerHTML = "";
}

function handleTokenResponse(response) {
  if (response.error) {
    console.warn("Google token request did not complete:", response.error);
    setSignedInUI(false);
    return;
  }
  accessToken = response.access_token;
  storeToken(accessToken, response.expires_in);
  setSignedInUI(true);
}

window.addEventListener("load", () => {
  if (typeof google === "undefined" || !google.accounts) {
    authStatus.textContent = "Google Sign-In failed to load";
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: handleTokenResponse,
    error_callback: (err) => {
      console.warn("Google auth error:", err);
      setSignedInUI(false);
    },
  });

  const cached = loadStoredToken();
  if (cached) {
    accessToken = cached;
    setSignedInUI(true);
  } else if (localStorage.getItem(HAS_SIGNED_IN_KEY) === "true") {
    // Silent re-auth attempt — succeeds if the browser still has an active
    // Google session (auth persistence plan, option 1).
    tokenClient.requestAccessToken({ prompt: "none" });
  }
});

signinBtn.addEventListener("click", () => {
  tokenClient.requestAccessToken({ prompt: "consent" });
});

signoutBtn.addEventListener("click", () => {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(HAS_SIGNED_IN_KEY);
  setSignedInUI(false);
});

listFilesBtn.addEventListener("click", async () => {
  driveFiles.innerHTML = "";
  authStatus.textContent = "Loading Drive files…";
  try {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name)",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
    const data = await res.json();
    authStatus.textContent = `Signed in to Google — found ${data.files.length} file(s)`;
    for (const file of data.files) {
      const li = document.createElement("li");
      li.textContent = file.name;
      driveFiles.appendChild(li);
    }
  } catch (err) {
    console.error(err);
    authStatus.textContent = "Could not load Drive files — try signing in again";
  }
});

// ---- To-do list (Stage 1 shell, replaced by real journal logic in Stage 3) ----
// In-memory only — resets on reload. Persistence arrives in a later stage.
let items = [];
let nextId = 1;

const form = document.getElementById("add-form");
const input = document.getElementById("new-item");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const status = document.getElementById("status");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  items.unshift({ id: nextId++, text, done: false });
  input.value = "";
  render();
});

list.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const id = Number(li.dataset.id);

  if (e.target.matches("input[type='checkbox']")) {
    const item = items.find((i) => i.id === id);
    if (item) item.done = e.target.checked;
    render();
  }

  if (e.target.matches("button.remove")) {
    items = items.filter((i) => i.id !== id);
    render();
  }
});

function render() {
  list.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.dataset.id = item.id;
    if (item.done) li.classList.add("done");
    li.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""} aria-label="Mark done">
      <span></span>
      <button class="remove" type="button" aria-label="Remove">✕</button>
    `;
    li.querySelector("span").textContent = item.text;
    list.appendChild(li);
  }
  empty.classList.toggle("hidden", items.length > 0);
}

render();

// Service worker registration — enables installability + offline shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => {
        status.textContent = "Ready to install";
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
        status.textContent = "Offline support unavailable";
      });
  });
}
