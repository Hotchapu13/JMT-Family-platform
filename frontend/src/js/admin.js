import '../styles/main.css';
import {
  requireAdminSession,
  adminLogout,
  generateAccessCode,
  deactivateAccessCode,
  listAccessCodes,
  bulkUploadPhotos,
  updatePhotoStatus,
  listAdminStories,
  createStory,
  updateStory,
  publishStory,
  listFamilyMembersAdmin,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
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
// Access codes (server-backed — persists across reloads).
// ---------------------------------------------------------------------------

const codeForm = document.querySelector('[data-code-form]');
const codeError = document.querySelector('[data-code-error]');
const codeList = document.querySelector('[data-code-list]');
let codes = [];
let justCreated = null; // { id, code } — plaintext held only in memory, only for this session
let codeVisible = false; // whether the just-created code's plaintext is currently shown

function renderCodes() {
  if (!codes.length) {
    codeList.innerHTML = stateMessage('No codes issued yet.');
    return;
  }
  codeList.innerHTML = codes
    .map((entry) => {
      const hasPlaintext = justCreated && String(justCreated.id) === String(entry.id);
      const isRevealed = hasPlaintext && codeVisible;
      const isActive = entry.is_active && entry.is_valid;
      const eyeIcon = isRevealed
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.4A10.7 10.7 0 0 1 12 5c7 0 11 7 11 7a13.6 13.6 0 0 1-3.1 3.8M6.1 6.6C3.4 8.5 1 12 1 12s4 7 11 7a10.6 10.6 0 0 0 4-.8" /></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>';
      const codeActions = hasPlaintext
        ? `
            <button type="button" data-toggle-code="${entry.id}" aria-label="${isRevealed ? 'Hide code' : 'Show code'}" class="text-ink-faint hover:text-primary">
              ${eyeIcon}
            </button>
            <button type="button" data-copy-code="${entry.id}" aria-label="Copy code" class="text-ink-faint hover:text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
            </button>
          `
        : '';
      const deactivateAction = isActive
        ? `<button type="button" data-deactivate="${entry.id}" class="btn-ghost !px-4 !py-1.5 text-xs">Deactivate</button>`
        : '<span class="text-xs uppercase tracking-label text-ink-faint">Inactive</span>';
      return `
      <div class="flex items-center justify-between rounded-lg border border-outline-variant/60 px-4 py-3 ${isActive ? '' : 'opacity-50'}">
        <div>
          <div class="flex items-center gap-2">
            <p class="font-display text-base text-ink">${isRevealed ? esc(justCreated.code) : '••••••••'}</p>
            ${codeActions}
          </div>
          <p class="text-xs text-ink-faint">${esc(entry.label || 'Untitled')} &middot; created ${esc((entry.created_at || '').slice(0, 10))} &middot; expires ${esc((entry.expires_at || '').slice(0, 10))}</p>
        </div>
        ${deactivateAction}
      </div>
    `;
    })
    .join('');
}

async function loadCodes() {
  codeList.innerHTML = loadingState('Loading codes…');
  try {
    codes = await listAccessCodes();
    renderCodes();
  } catch (error) {
    codeList.innerHTML = errorState(error);
  }
}

codeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  codeError.classList.add('hidden');
  const label = document.querySelector('#code-label').value.trim();
  const customCode = document.querySelector('#code-custom').value.trim();
  const expiresInDays = Number(document.querySelector('#code-expires').value) || 365;

  try {
    const created = await generateAccessCode({ label, expiresInDays, customCode });
    justCreated = { id: created.id, code: created.code };
    codeVisible = true;
    codeForm.reset();
    document.querySelector('#code-expires').value = '365';
    await loadCodes();
  } catch (error) {
    codeError.textContent = error instanceof ApiError ? error.message : 'Could not generate a code.';
    codeError.classList.remove('hidden');
  }
});

codeList.addEventListener('click', async (event) => {
  const toggleButton = event.target.closest('[data-toggle-code]');
  if (toggleButton) {
    codeVisible = !codeVisible;
    renderCodes();
    return;
  }

  const copyButton = event.target.closest('[data-copy-code]');
  if (copyButton && justCreated) {
    try {
      await navigator.clipboard.writeText(justCreated.code);
    } catch {
      /* Clipboard access can be denied by the browser; nothing to recover here. */
    }
    return;
  }

  const button = event.target.closest('[data-deactivate]');
  if (!button) return;
  const id = button.dataset.deactivate;
  try {
    await deactivateAccessCode(id);
    if (justCreated && String(justCreated.id) === String(id)) justCreated = null;
    await loadCodes();
  } catch (error) {
    codeError.textContent = error instanceof ApiError ? error.message : 'Could not deactivate that code.';
    codeError.classList.remove('hidden');
  }
});

loadCodes();

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
const storyCoverInput = document.querySelector('#story-cover');
const dropzoneArea = document.querySelector('[data-dropzone-area]');
const storyFields = {
  title: document.querySelector('#story-title'),
  category: document.querySelector('#story-category'),
  year_label: document.querySelector('#story-year'),
  read_time_minutes: document.querySelector('#story-read-time'),
  excerpt: document.querySelector('#story-excerpt'),
  body: document.querySelector('#story-body'),
  status: document.querySelector('#story-status'),
};

['dragover', 'dragenter'].forEach((evt) =>
  dropzoneArea.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzoneArea.classList.add('border-primary');
  }),
);
['dragleave', 'drop'].forEach((evt) =>
  dropzoneArea.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzoneArea.classList.remove('border-primary');
  }),
);
dropzoneArea.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files?.[0];
  if (file) storyCoverInput.files = e.dataTransfer.files;
});

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

function storyBadgeClass(status) {
  if (status === 'pending_review') return 'bg-primary/15 text-primary';
  if (status === 'published') return 'bg-outline-variant/40 text-ink-soft';
  return 'bg-outline-variant/20 text-ink-faint';
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
        <div class="rounded-lg border border-outline-variant/60 px-4 py-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-display text-base text-ink">${esc(story.title)}</p>
              <p class="mt-1 text-xs uppercase tracking-label text-ink-faint">
                ${esc(story.category || '—')}
                <span class="ml-2 rounded px-2 py-0.5 ${storyBadgeClass(story.status)}">${esc(story.status)}</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              ${
                story.status !== 'published'
                  ? `<button type="button" data-publish-story="${story.id}" class="btn-ghost !px-4 !py-1.5 text-xs">Publish</button>`
                  : ''
              }
              <button type="button" data-edit-story="${story.id}" class="btn-ghost !px-4 !py-1.5 text-xs">Edit</button>
              <button type="button" data-toggle-expand="${story.id}" aria-expanded="false" class="text-ink-faint hover:text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="transition-transform">
                  <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div data-story-detail="${story.id}" class="hidden mt-3 border-t border-outline-variant/40 pt-3 text-sm text-ink-soft">
            <p>${esc(story.excerpt || 'No excerpt.')}</p>
          </div>
        </div>
      `,
      )
      .join('');
    storyList.dataset.cache = JSON.stringify(stories);
  } catch (error) {
    storyList.innerHTML = errorState(error);
  }
}

storyList.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit-story]');
  if (editButton) {
    const stories = JSON.parse(storyList.dataset.cache || '[]');
    const story = stories.find((s) => String(s.id) === editButton.dataset.editStory);
    if (story) fillStoryForm(story);
    return;
  }

  const publishButton = event.target.closest('[data-publish-story]');
  if (publishButton) {
    storyError.classList.add('hidden');
    try {
      await publishStory(publishButton.dataset.publishStory);
      await loadStories();
    } catch (error) {
      storyError.textContent = error instanceof ApiError ? error.message : 'Could not publish that story.';
      storyError.classList.remove('hidden');
    }
    return;
  }

  const expandButton = event.target.closest('[data-toggle-expand]');
  if (expandButton) {
    const detail = storyList.querySelector(`[data-story-detail="${expandButton.dataset.toggleExpand}"]`);
    const expanded = !detail.classList.contains('hidden');
    detail.classList.toggle('hidden', expanded);
    expandButton.setAttribute('aria-expanded', String(!expanded));
    expandButton.querySelector('svg').classList.toggle('rotate-180', !expanded);
  }
});

document.querySelector('[data-toggle-all-stories]').addEventListener('click', (event) => {
  const allDetails = storyList.querySelectorAll('[data-story-detail]');
  const anyHidden = [...allDetails].some((d) => d.classList.contains('hidden'));
  allDetails.forEach((d) => d.classList.toggle('hidden', !anyHidden));
  storyList.querySelectorAll('[data-toggle-expand]').forEach((btn) => {
    btn.setAttribute('aria-expanded', String(anyHidden));
    btn.querySelector('svg').classList.toggle('rotate-180', anyHidden);
  });
  event.target.textContent = anyHidden ? 'Collapse all' : 'Expand all';
});

document.querySelector('[data-story-reset]').addEventListener('click', resetStoryForm);

storyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  storyError.classList.add('hidden');

  const formData = new FormData();
  formData.append('title', storyFields.title.value.trim());
  formData.append('category', storyFields.category.value.trim());
  formData.append('year_label', storyFields.year_label.value.trim());
  if (storyFields.read_time_minutes.value) formData.append('read_time_minutes', storyFields.read_time_minutes.value);
  formData.append('excerpt', storyFields.excerpt.value);
  formData.append('body', storyFields.body.value);
  formData.append('status', storyFields.status.value);
  if (storyCoverInput.files[0]) formData.append('cover_image', storyCoverInput.files[0]);

  try {
    if (storyIdField.value) {
      await updateStory(storyIdField.value, formData);
    } else {
      await createStory(formData);
    }
    resetStoryForm();
    await loadStories();
  } catch (error) {
    storyError.textContent = error instanceof ApiError ? error.message : 'Could not save that story.';
    storyError.classList.remove('hidden');
  }
});

loadStories();

// ---------------------------------------------------------------------------
// Family members
// ---------------------------------------------------------------------------

const memberForm = document.querySelector('[data-member-form]');
const memberError = document.querySelector('[data-member-error]');
const memberList = document.querySelector('[data-member-list]');
const memberIdField = document.querySelector('[data-member-id]');
const memberFatherSelect = document.querySelector('#member-father');
const memberMotherSelect = document.querySelector('#member-mother');
const memberSpouseSelect = document.querySelector('#member-spouse');
const memberRelationSelects = [memberFatherSelect, memberMotherSelect, memberSpouseSelect];
const memberJoinedByMarriage = document.querySelector('#member-joined-by-marriage');
const memberFields = {
  full_name: document.querySelector('#member-name'),
  title: document.querySelector('#member-title'),
  date_of_birth: document.querySelector('#member-dob'),
  date_of_death: document.querySelector('#member-dod'),
  biography: document.querySelector('#member-bio'),
};
const memberPhotoInput = document.querySelector('#member-photo');
let membersCache = [];

function resetMemberForm() {
  memberForm.reset();
  memberIdField.value = '';
}

function fillMemberForm(member) {
  memberIdField.value = member.id;
  memberFields.full_name.value = member.full_name || '';
  memberFields.title.value = member.title || '';
  memberFields.date_of_birth.value = member.date_of_birth || '';
  memberFields.date_of_death.value = member.date_of_death || '';
  memberFields.biography.value = member.biography || '';
  memberFatherSelect.value = member.father ?? '';
  memberMotherSelect.value = member.mother ?? '';
  memberSpouseSelect.value = member.spouse ?? '';
  memberJoinedByMarriage.checked = Boolean(member.joined_by_marriage);
  window.scrollTo({ top: memberForm.offsetTop - 100, behavior: 'smooth' });
}

function renderRelationOptions() {
  const options = membersCache.map((m) => `<option value="${m.id}">${esc(m.full_name)}</option>`).join('');
  memberRelationSelects.forEach((select) => {
    const previousValue = select.value;
    select.innerHTML = '<option value="">— None —</option>' + options;
    select.value = previousValue;
  });
}

async function loadMembers() {
  memberList.innerHTML = loadingState('Loading family members…');
  try {
    membersCache = await listFamilyMembersAdmin();
    renderRelationOptions();
    if (!membersCache.length) {
      memberList.innerHTML = stateMessage('No family members yet.');
      return;
    }
    memberList.innerHTML = membersCache
      .map(
        (member) => `
        <div class="flex items-center justify-between rounded-lg border border-outline-variant/60 px-4 py-3">
          <div>
            <p class="font-display text-base text-ink">${esc(member.full_name)}</p>
            <p class="text-xs text-ink-faint">${esc(member.title || '—')}${member.is_deceased ? ' &middot; deceased' : ''}</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-edit-member="${member.id}" class="btn-ghost !px-4 !py-1.5 text-xs">Edit</button>
            <button type="button" data-delete-member="${member.id}" class="btn-ghost !px-4 !py-1.5 text-xs">Delete</button>
          </div>
        </div>
      `,
      )
      .join('');
  } catch (error) {
    memberList.innerHTML = errorState(error);
  }
}

memberList.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit-member]');
  if (editButton) {
    const member = membersCache.find((m) => String(m.id) === editButton.dataset.editMember);
    if (member) fillMemberForm(member);
    return;
  }
  const deleteButton = event.target.closest('[data-delete-member]');
  if (deleteButton) {
    memberError.classList.add('hidden');
    try {
      await deleteFamilyMember(deleteButton.dataset.deleteMember);
      await loadMembers();
    } catch (error) {
      memberError.textContent =
        error instanceof ApiError && error.status === 409
          ? "This member is still linked as a father, mother, or spouse elsewhere in the tree — reassign or clear those links first."
          : error instanceof ApiError
            ? error.message
            : 'Could not delete that member.';
      memberError.classList.remove('hidden');
    }
  }
});

document.querySelector('[data-member-reset]').addEventListener('click', resetMemberForm);

memberForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  memberError.classList.add('hidden');

  const formData = new FormData();
  formData.append('full_name', memberFields.full_name.value.trim());
  formData.append('title', memberFields.title.value.trim());
  if (memberFields.date_of_birth.value) formData.append('date_of_birth', memberFields.date_of_birth.value);
  if (memberFields.date_of_death.value) formData.append('date_of_death', memberFields.date_of_death.value);
  formData.append('biography', memberFields.biography.value);
  formData.append('father', memberFatherSelect.value);
  formData.append('mother', memberMotherSelect.value);
  formData.append('spouse', memberSpouseSelect.value);
  formData.append('joined_by_marriage', memberJoinedByMarriage.checked ? 'true' : 'false');
  if (memberPhotoInput.files[0]) formData.append('profile_image', memberPhotoInput.files[0]);

  try {
    if (memberIdField.value) {
      await updateFamilyMember(memberIdField.value, formData);
    } else {
      await createFamilyMember(formData);
    }
    resetMemberForm();
    await loadMembers();
  } catch (error) {
    memberError.textContent = error instanceof ApiError ? error.message : 'Could not save that member.';
    memberError.classList.remove('hidden');
  }
});

loadMembers();
