import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const appEl = document.getElementById('app');
const signedOutMsg = document.getElementById('signed-out-msg');
const signInBtn = document.getElementById('sign-in-btn');
const userEmailEl = document.getElementById('user-email');
const draftsListEl = document.getElementById('drafts-list');
const filterBtns = document.querySelectorAll('.filter-btn');

let idToken = null;
let currentStatus = 'draft';

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${idToken}`
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

function platformBadge(name, info) {
  const status = info ? info.status : 'n/a';
  return `<span class="badge status-${status}">${name}: ${status}</span>`;
}

function draftCard(draft) {
  const isVideo = draft.mediaType === 'video';
  const media = isVideo
    ? `<video class="media" src="${draft.sourceUrl}" muted></video>`
    : `<img class="media" src="${draft.sourceUrl}" alt="" />`;

  const caption = draft.content && draft.content.instagram ? draft.content.instagram.caption : '';
  const badges = Object.entries(draft.platforms || {})
    .map(([name, info]) => platformBadge(name, info))
    .join('');

  const canAct = ['draft', 'scheduled', 'failed'].includes(draft.status);
  const errorLine = draft.lastError ? `<div class="error-text">${draft.lastError}</div>` : '';

  return `
    <div class="card" data-id="${draft.id}">
      ${media}
      <div class="body">
        <div class="badges">${badges || '<span class="badge">' + draft.status + '</span>'}</div>
        <div class="caption">${caption}</div>
        ${errorLine}
        ${canAct ? `
          <div class="actions">
            <button class="approve" data-action="approve">Approve & Publish</button>
            ${draft.status === 'scheduled'
              ? '<button data-action="unschedule">Unschedule</button>'
              : `<input type="datetime-local" data-action="schedule-input" />
                 <button data-action="schedule">Schedule</button>`}
            <button class="cancel" data-action="cancel">Cancel</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

async function loadDrafts() {
  draftsListEl.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const { drafts } = await apiFetch(`/api/drafts?status=${encodeURIComponent(currentStatus)}`);
    if (!drafts.length) {
      draftsListEl.innerHTML = '<div class="empty-state">Nothing here.</div>';
      return;
    }
    draftsListEl.innerHTML = drafts.map(draftCard).join('');
  } catch (err) {
    draftsListEl.innerHTML = `<div class="empty-state">Failed to load: ${err.message}</div>`;
  }
}

draftsListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = e.target.closest('.card');
  const id = card.dataset.id;
  const action = btn.dataset.action;

  try {
    if (action === 'approve') {
      btn.disabled = true;
      btn.textContent = 'Publishing…';
      await apiFetch(`/api/drafts/${id}/approve`, { method: 'POST' });
    } else if (action === 'cancel') {
      await apiFetch(`/api/drafts/${id}/cancel`, { method: 'POST' });
    } else if (action === 'unschedule') {
      await apiFetch(`/api/drafts/${id}/unschedule`, { method: 'POST' });
    } else if (action === 'schedule') {
      const input = card.querySelector('[data-action="schedule-input"]');
      if (!input.value) return alert('Pick a date/time first.');
      await apiFetch(`/api/drafts/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: new Date(input.value).toISOString() })
      });
    }
    loadDrafts();
  } catch (err) {
    alert(`Failed: ${err.message}`);
    loadDrafts();
  }
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatus = btn.dataset.status;
    loadDrafts();
  });
});

async function init() {
  const config = await fetch('/api/firebase-config').then((r) => r.json());
  if (!config.apiKey) {
    signedOutMsg.textContent = 'Server is missing FIREBASE_WEB_API_KEY — sign-in unavailable.';
    return;
  }

  const firebaseApp = initializeApp(config);
  const auth = getAuth(firebaseApp);

  signInBtn.addEventListener('click', () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch((err) => alert(err.message));
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      idToken = await user.getIdToken();
      userEmailEl.textContent = user.email;
      userEmailEl.hidden = false;
      signInBtn.hidden = true;
      appEl.hidden = false;
      signedOutMsg.hidden = true;
      loadDrafts();
    } else {
      idToken = null;
      appEl.hidden = true;
      signedOutMsg.hidden = false;
      signInBtn.hidden = false;
      userEmailEl.hidden = true;
    }
  });
}

init();
