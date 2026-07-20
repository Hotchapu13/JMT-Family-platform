import '../styles/main.css';
import { getPhotos, getPhoto } from './api.js';
import { mountChrome, observeReveals } from './layout.js';
import { esc, formatDate, loadingState, stateMessage, errorState, uniqueBy } from './ui.js';

mountChrome('gallery');

const grid = document.querySelector('[data-gallery-grid]');
const filterBar = document.querySelector('[data-era-filters]');
const lightbox = document.querySelector('[data-lightbox]');
const lightboxBody = document.querySelector('[data-lightbox-body]');

let activeEra = null; // null = "All Eras"
let erasRendered = false;

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

function photoCard(photo) {
  const caption = photo.title || photo.caption || '';
  const era = photo.era?.name ? `${esc(photo.era.name)} &middot; ` : '';
  const taken = formatDate(photo.uploaded_at);

  return `
    <button
      type="button"
      data-photo-id="${photo.id}"
      class="reveal group mb-6 block w-full break-inside-avoid text-left"
    >
      <img
        src="${esc(photo.thumbnail)}"
        alt="${esc(caption || 'Family photograph')}"
        loading="lazy"
        class="artifact-image w-full rounded-lg bg-surface-high"
      />
      ${
        caption
          ? `<p class="mt-3 font-display text-base text-ink transition-colors group-hover:text-primary">${esc(caption)}</p>`
          : ''
      }
      <p class="mt-1 font-body text-xs uppercase tracking-label text-ink-faint">
        ${era}${esc(taken)}
      </p>
    </button>
  `;
}

function renderEraFilters(photos) {
  // The backend exposes no /eras/ endpoint, so the available eras are derived
  // from the photos themselves — and only from the unfiltered first load, so
  // that filtering down never shrinks the filter bar itself.
  if (erasRendered) return;
  const eras = uniqueBy(photos, (photo) => photo.era);
  if (!eras.length) return;

  const chip = (label, value, isActive) => `
    <button type="button" data-era="${value === null ? '' : esc(value)}"
      class="${isActive ? 'chip-active' : 'chip-inactive'}">${esc(label)}</button>
  `;

  filterBar.innerHTML =
    chip('All Eras', null, activeEra === null) +
    eras.map((era) => chip(era.name, era.id, String(activeEra) === String(era.id))).join('');
  erasRendered = true;
}

function syncFilterChips() {
  filterBar.querySelectorAll('[data-era]').forEach((button) => {
    const value = button.dataset.era || null;
    const isActive = String(value) === String(activeEra ?? '');
    button.className = isActive ? 'chip-active' : 'chip-inactive';
  });
}

async function loadPhotos() {
  grid.innerHTML = loadingState('Opening the collection…');
  try {
    const photos = await getPhotos({ era: activeEra });
    renderEraFilters(photos);

    if (!photos.length) {
      grid.innerHTML = stateMessage(
        'No photographs in this era yet.',
        'The curator has not published anything here so far.',
      );
      return;
    }

    grid.innerHTML = photos.map(photoCard).join('');
    observeReveals(grid);
  } catch (error) {
    grid.innerHTML = errorState(error);
  }
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function openLightbox() {
  lightbox.classList.remove('hidden');
  lightbox.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.add('hidden');
  lightbox.classList.remove('flex');
  lightboxBody.innerHTML = '';
  document.body.style.overflow = '';
}

async function showPhoto(id) {
  lightboxBody.innerHTML = `<p class="py-24 text-center font-display italic text-surface/70">Retrieving…</p>`;
  openLightbox();

  try {
    const photo = await getPhoto(id);
    const title = photo.title || 'Untitled photograph';
    lightboxBody.innerHTML = `
      <figure class="mx-auto w-full">
        <img
          src="${esc(photo.image_url)}"
          alt="${esc(title)}"
          class="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg border border-surface/20 shadow-ambient"
        />
        <figcaption class="mx-auto mt-6 max-w-2xl text-center">
          <h2 class="font-display text-xl text-surface">${esc(title)}</h2>
          ${
            photo.era?.name
              ? `<p class="mt-2 font-body text-xs uppercase tracking-label text-primary-container">${esc(photo.era.name)}</p>`
              : ''
          }
          ${
            photo.caption
              ? `<p class="mt-4 font-display leading-relaxed text-surface/75">${esc(photo.caption)}</p>`
              : ''
          }
        </figcaption>
      </figure>
    `;
  } catch (error) {
    lightboxBody.innerHTML = `<p class="py-24 text-center font-display italic text-surface/70">${esc(
      error.message || 'This photograph could not be opened.',
    )}</p>`;
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

filterBar.addEventListener('click', (event) => {
  const button = event.target.closest('[data-era]');
  if (!button) return;
  activeEra = button.dataset.era || null;
  syncFilterChips();
  loadPhotos();
});

grid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-photo-id]');
  if (card) showPhoto(card.dataset.photoId);
});

lightbox.addEventListener('click', (event) => {
  // Click the backdrop (or the close button) to dismiss.
  if (event.target === lightbox || event.target.closest('[data-lightbox-close]')) {
    closeLightbox();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !lightbox.classList.contains('hidden')) closeLightbox();
});

loadPhotos();
