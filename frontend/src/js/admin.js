import '../styles/main.css';
import {
  requireAdminSession,
  adminLogout,
  generateAccessCode,
  deactivateAccessCode,
  bulkUploadPhotos,
  updatePhotoStatus,
  listAdminStories,
  createStory,
  updateStory,
  ApiError,
} from './api.js';
import { esc, loadingState, errorState, stateMessage } from './ui.js';

// The rest of the page still renders regardless; an expired or missing admin
// cookie redirects to the admin login from inside api.js.
requireAdminSession().catch(() => {
  /* Network hiccups shouldn't blank a page that needs no data to render. */
});

document.querySelector('[data-logout]').addEventListener('click', async () => {
  await adminLogout();
  window.location.assign('/admin-login.html');
});

// ---------------------------------------------------------------------------
// Access codes (session-local only — the backend exposes no listing endpoint,
// so only codes generated in this browser session are shown here).
// ---------------------------------------------------------------------------

const codeForm = document.querySelector('[data-code-form]');
const codeError = document.querySelector('[data-code-error]');
const codeList = document.querySelector('[data-code-list]');
const issuedCodes = [];

function renderCodes() {
  if (!issuedCodes.length) {
    codeList.innerHTML = '';
    return;
  }
  codeList.innerHTML = issuedCodes
    .map(
      (entry) => `
      <div class="flex items-center justify-between rounded-lg border border-outline-variant/60 px-4 py-3 ${entry.deactivated ? 'opacity-50' : ''}">
        <div>
          <p class="font-display text-base text-ink">${esc(entry.code)}</p>
          <p class="text-xs text-ink-faint">${esc(entry.label || 'Untitled')} &middot; expires ${esc(entry.expires_at?.slice(0, 10) || '')}</p>
        </div>
        ${
          entry.deactivated
            ? '<span class="text-xs uppercase tracking-label text-ink-faint">Deactivated</span>'
            : `<button type="button" data-deactivate="${entry.id}" class="btn-ghost !px-4 !py-1.5 text-xs">Deactivate</button>`
        }
      </div>
    `,
    )
    .join('');
}

codeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  codeError.classList.add('hidden');
  const label = document.querySelector('#code-label').value.trim();
  const expiresInDays = Number(document.querySelector('#code-expires').value) || 365;

  try {
    const created = await generateAccessCode({ label, expiresInDays });
    issuedCodes.unshift({ ...created, deactivated: false });
    renderCodes();
    codeForm.reset();
    document.querySelector('#code-expires').value = '365';
  } catch (error) {
    codeError.textContent = error instanceof ApiError ? error.message : 'Could not generate a code.';
    codeError.classList.remove('hidden');
  }
});

codeList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-deactivate]');
  if (!button) return;
  const id = button.dataset.deactivate;
  try {
    await deactivateAccessCode(id);
    const entry = issuedCodes.find((c) => String(c.id) === String(id));
    if (entry) entry.deactivated = true;
    renderCodes();
  } catch (error) {
    codeError.textContent = error instanceof ApiError ? error.message : 'Could not deactivate that code.';
    codeError.classList.remove('hidden');
  }
});

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

const photoForm = document.querySelector('[data-photo-form]');
const photoError = document.querySelector('[data-photo-error]');
const photoList = document.querySelector('[data-photo-list]');
const uploadedPhotos = [];

function renderPhotos() {
  if (!uploadedPhotos.length) {
    photoList.innerHTML = '';
    return;
  }
  photoList.innerHTML = uploadedPhotos
    .map(
      (photo) => `
      <div class="flex items-center justify-between rounded-lg border border-outline-variant/60 px-4 py-3">
        <div>
          <p class="font-display text-base text-ink">${esc(photo.title || `Photo #${photo.id}`)}</p>
          <p class="text-xs uppercase tracking-label text-ink-faint">${esc(photo.status)}</p>
        </div>
        <button type="button" data-toggle-photo="${photo.id}" data-current-status="${photo.status}" class="btn-ghost !px-4 !py-1.5 text-xs">
          ${photo.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
      </div>
    `,
    )
    .join('');
}

photoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  photoError.classList.add('hidden');
  const files = document.querySelector('#photo-files').files;
  const era = document.querySelector('#photo-era').value || null;

  if (!files.length) {
    photoError.textContent = 'Choose at least one image.';
    photoError.classList.remove('hidden');
    return;
  }

  try {
    const created = await bulkUploadPhotos(files, era);
    uploadedPhotos.unshift(...created);
    renderPhotos();
    photoForm.reset();
  } catch (error) {
    photoError.textContent = error instanceof ApiError ? error.message : 'Upload failed.';
    photoError.classList.remove('hidden');
  }
});

photoList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-toggle-photo]');
  if (!button) return;
  const id = button.dataset.togglePhoto;
  const next = button.dataset.currentStatus === 'published' ? 'draft' : 'published';
  try {
    const updated = await updatePhotoStatus(id, next);
    const photo = uploadedPhotos.find((p) => String(p.id) === String(id));
    if (photo) photo.status = updated.status;
    renderPhotos();
  } catch (error) {
    photoError.textContent = error instanceof ApiError ? error.message : 'Could not update that photo.';
    photoError.classList.remove('hidden');
  }
});

document.querySelector('[data-photo-status-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  photoError.classList.add('hidden');
  const id = document.querySelector('#photo-status-id').value;
  const status = document.querySelector('#photo-status-value').value;
  try {
    const updated = await updatePhotoStatus(id, status);
    const photo = uploadedPhotos.find((p) => String(p.id) === String(id));
    if (photo) photo.status = updated.status;
    renderPhotos();
  } catch (error) {
    photoError.textContent = error instanceof ApiError ? error.message : 'Could not update that photo.';
    photoError.classList.remove('hidden');
  }
});

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const storyForm = document.querySelector('[data-story-form]');
const storyError = document.querySelector('[data-story-error]');
const storyList = document.querySelector('[data-story-list]');
const storyIdField = document.querySelector('[data-story-id]');
const storyFields = {
  title: document.querySelector('#story-title'),
  category: document.querySelector('#story-category'),
  year_label: document.querySelector('#story-year'),
  read_time_minutes: document.querySelector('#story-read-time'),
  excerpt: document.querySelector('#story-excerpt'),
  body: document.querySelector('#story-body'),
  status: document.querySelector('#story-status'),
};

function resetStoryForm() {
  storyForm.reset();
  storyIdField.value = '';
}

function fillStoryForm(story) {
  storyIdField.value = story.id;
  storyFields.title.value = story.title || '';
  storyFields.category.value = story.category || '';
  storyFields.year_label.value = story.year_label || '';
  storyFields.read_time_minutes.value = story.read_time_minutes ?? '';
  storyFields.excerpt.value = story.excerpt || '';
  storyFields.body.value = story.body || '';
  storyFields.status.value = story.status || 'draft';
  window.scrollTo({ top: storyForm.offsetTop - 100, behavior: 'smooth' });
}

async function loadStories() {
  storyList.innerHTML = loadingState('Loading stories…');
  try {
    const stories = await listAdminStories();
    if (!stories.length) {
      storyList.innerHTML = stateMessage('No stories yet.');
      return;
    }
    storyList.innerHTML = stories
      .map(
        (story) => `
        <div class="flex items-center justify-between rounded-lg border border-outline-variant/60 px-4 py-3">
          <div>
            <p class="font-display text-base text-ink">${esc(story.title)}</p>
            <p class="text-xs uppercase tracking-label text-ink-faint">${esc(story.category || '—')} &middot; ${esc(story.status)}</p>
          </div>
          <button type="button" data-edit-story="${story.id}" class="btn-ghost !px-4 !py-1.5 text-xs">Edit</button>
        </div>
      `,
      )
      .join('');
    storyList.dataset.cache = JSON.stringify(stories);
  } catch (error) {
    storyList.innerHTML = errorState(error);
  }
}

storyList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit-story]');
  if (!button) return;
  const stories = JSON.parse(storyList.dataset.cache || '[]');
  const story = stories.find((s) => String(s.id) === button.dataset.editStory);
  if (story) fillStoryForm(story);
});

document.querySelector('[data-story-reset]').addEventListener('click', resetStoryForm);

storyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  storyError.classList.add('hidden');

  const payload = {
    title: storyFields.title.value.trim(),
    category: storyFields.category.value.trim(),
    year_label: storyFields.year_label.value.trim(),
    read_time_minutes: storyFields.read_time_minutes.value || null,
    excerpt: storyFields.excerpt.value,
    body: storyFields.body.value,
    status: storyFields.status.value,
  };

  try {
    if (storyIdField.value) {
      await updateStory(storyIdField.value, payload);
    } else {
      await createStory(payload);
    }
    resetStoryForm();
    await loadStories();
  } catch (error) {
    storyError.textContent = error instanceof ApiError ? error.message : 'Could not save that story.';
    storyError.classList.remove('hidden');
  }
});

loadStories();
