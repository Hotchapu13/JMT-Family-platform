import '../styles/main.css';
import { getStories } from './api.js';
import { mountChrome, observeReveals } from './layout.js';
import { esc, loadingState, stateMessage, errorState, uniqueBy } from './ui.js';

mountChrome('stories');

const grid = document.querySelector('[data-stories-grid]');
const filterBar = document.querySelector('[data-category-filters]');

let activeCategory = null;
let categoriesRendered = false;

/** Audio stories are a forward-compatible schema stub on the backend: the
 *  content type exists but no audio pipeline does, so a missing audio_url is
 *  expected and must render as a placeholder rather than a broken player. */
function isAudio(story) {
  return story.content_type === 'audio';
}

function coverMarkup(story) {
  if (story.cover_image) {
    return `<img src="${esc(story.cover_image)}" alt="${esc(story.title)}" loading="lazy"
              class="artifact-image h-56 w-full rounded-lg object-cover" />`;
  }

  if (isAudio(story)) {
    return `
      <div class="artifact-image flex h-56 w-full items-center justify-center rounded-lg bg-surface-high">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.3" class="text-primary/60">
          <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" stroke-linecap="round"/>
          <path d="M19 11a7 7 0 01-14 0M12 18v3" stroke-linecap="round"/>
        </svg>
      </div>`;
  }

  return `<div class="artifact-image h-56 w-full rounded-lg bg-gradient-to-br from-surface-high to-surface-highest"></div>`;
}

function metaLine(story) {
  const bits = [story.category, story.year_label].filter(Boolean).map(esc);
  return bits.join(' &nbsp;&middot;&nbsp; ');
}

function readTime(story) {
  if (!story.read_time_minutes) return '';
  const verb = isAudio(story) ? 'listen' : 'read';
  return `${story.read_time_minutes} min ${verb}`;
}

function storyCard(story) {
  return `
    <a href="/story.html?id=${encodeURIComponent(story.id)}" class="reveal group block">
      ${coverMarkup(story)}
      <p class="mt-4 font-body text-[0.68rem] uppercase tracking-label text-primary">
        ${metaLine(story)}
      </p>
      <h2 class="mt-2 font-display text-xl font-bold text-primary transition-colors group-hover:text-primary-container">
        ${esc(story.title)}
      </h2>
      ${
        story.excerpt
          ? `<p class="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">${esc(story.excerpt)}</p>`
          : ''
      }
      ${
        readTime(story)
          ? `<p class="mt-4 flex items-center gap-2 text-xs text-ink-faint">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                 <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/>
               </svg>
               ${esc(readTime(story))}
             </p>`
          : ''
      }
    </a>
  `;
}

function renderCategoryFilters(stories) {
  // No categories endpoint exists on the backend — derive them from the first
  // unfiltered load so the bar stays stable as the visitor filters.
  if (categoriesRendered) return;
  const categories = uniqueBy(stories, (story) => story.category);
  if (!categories.length) return;

  const chip = (label, value, isActive) => `
    <button type="button" data-category="${value === null ? '' : esc(value)}"
      class="${isActive ? 'chip-active' : 'chip-inactive'}">${esc(label)}</button>
  `;

  filterBar.innerHTML =
    chip('All Stories', null, activeCategory === null) +
    categories.map((c) => chip(c, c, c === activeCategory)).join('');
  categoriesRendered = true;
}

function syncChips() {
  filterBar.querySelectorAll('[data-category]').forEach((button) => {
    const value = button.dataset.category || null;
    button.className = value === activeCategory ? 'chip-active' : 'chip-inactive';
  });
}

async function loadStories() {
  grid.innerHTML = loadingState('Turning the pages…');
  try {
    const stories = await getStories({ category: activeCategory });
    renderCategoryFilters(stories);

    if (!stories.length) {
      grid.innerHTML = stateMessage(
        'No stories here yet.',
        'Nothing has been published under this chapter so far.',
      );
      return;
    }

    grid.innerHTML = stories.map(storyCard).join('');
    observeReveals(grid);
  } catch (error) {
    grid.innerHTML = errorState(error);
  }
}

filterBar.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category || null;
  syncChips();
  loadStories();
});

loadStories();
