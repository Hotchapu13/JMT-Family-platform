import '../styles/main.css';
import { requireSession, getStories } from './api.js';
import { mountChrome } from './layout.js';
import { esc } from './ui.js';

mountChrome('home');

// The page content is mostly static, so this is purely the session guard: an
// expired or missing viewer cookie redirects to the gateway from inside api.js.
requireSession().catch(() => {
  /* Network hiccups shouldn't blank a page that needs no data to render. */
});

// ---------------------------------------------------------------------------
// Section 1: Hero carousel — crossfades through every [data-hero-slide] image.
// ---------------------------------------------------------------------------

function initHeroCarousel() {
  const slides = document.querySelectorAll('[data-hero-slide]');
  if (slides.length < 2) return;

  let active = 0;
  setInterval(() => {
    const next = (active + 1) % slides.length;
    slides[active].classList.remove('opacity-100');
    slides[active].classList.add('opacity-0');
    slides[next].classList.remove('opacity-0');
    slides[next].classList.add('opacity-100');
    active = next;
  }, 5000);
}

// ---------------------------------------------------------------------------
// Section 2: Curated Memories — three random published stories, reshuffled
// on every page load (no persistence — a fresh Math.random() pick each time).
// ---------------------------------------------------------------------------

function pickRandom(items, count) {
  const pool = [...items];
  const picked = [];
  while (pool.length && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function curatedCard(story) {
  const image =
    story.cover_image || 'https://placehold.co/600x800/e8dfd0/5c554d?text=' + encodeURIComponent(story.title || 'Story');
  const subtitle = story.year_label || story.category || '';

  return `
    <a href="/story.html?id=${story.id}" class="group">
      <div class="relative mb-4 h-96 w-full overflow-hidden rounded-lg bg-surface-high">
        <div class="absolute inset-0 z-10 bg-primary/0 transition-colors duration-300 group-hover:bg-primary/20"></div>
        <img
          src="${esc(image)}"
          alt="${esc(story.title || '')}"
          class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <h4 class="font-display text-xl font-semibold text-ink transition-colors group-hover:text-primary">
        ${esc(story.title)}
      </h4>
      ${subtitle ? `<p class="mt-1 text-sm text-ink-faint">${esc(subtitle)}</p>` : ''}
    </a>
  `;
}

async function loadCuratedMemories() {
  const grid = document.querySelector('[data-curated-grid]');
  if (!grid) return;

  try {
    const stories = await getStories();
    const chosen = pickRandom(stories, 3);
    grid.innerHTML = chosen.length
      ? chosen.map(curatedCard).join('')
      : '<p class="col-span-full text-center text-sm text-ink-faint">No stories published yet.</p>';
  } catch {
    grid.innerHTML =
      '<p class="col-span-full text-center text-sm text-ink-faint">The collection could not be opened right now.</p>';
  }
}

// ---------------------------------------------------------------------------
// Section 5: Heritage Gallery — the quote card cycles every 6 seconds.
// ---------------------------------------------------------------------------

const HERITAGE_QUOTES = [
  { text: 'We build not for ourselves, but for those who will stand here when we are gone.', author: 'J.M.T. Jr, 1988' },
  { text: 'A family that remembers together carries the past into every future it builds.', author: 'The JMT Family' },
  { text: 'Every name in this archive is a doorway back to where we began.', author: 'The 90th Anniversary Collection' },
];

function initQuoteCycle() {
  const card = document.querySelector('[data-quote-card]');
  if (!card) return;

  const textEl = card.querySelector('[data-quote-text]');
  const authorEl = card.querySelector('[data-quote-author]');
  let index = 0;

  setInterval(() => {
    index = (index + 1) % HERITAGE_QUOTES.length;
    const { text, author } = HERITAGE_QUOTES[index];

    [textEl, authorEl].forEach((el) => el.classList.add('opacity-0'));
    setTimeout(() => {
      textEl.textContent = `“${text}”`;
      authorEl.textContent = author;
      [textEl, authorEl].forEach((el) => el.classList.remove('opacity-0'));
    }, 500);
  }, 6000);
}

initHeroCarousel();
loadCuratedMemories();
initQuoteCycle();
