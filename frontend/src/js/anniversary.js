import '../styles/main.css';
import { getAnniversaryEvents } from './api.js';
import { mountChrome, observeReveals } from './layout.js';
import { esc, formatDate, loadingState, stateMessage, errorState } from './ui.js';

mountChrome('anniversary');

const root = document.querySelector('[data-events-root]');

function reflectionCard(reflection) {
  const initials = String(reflection.author_name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();

  const avatar = reflection.author_photo
    ? `<img src="${esc(reflection.author_photo)}" alt="${esc(reflection.author_name)}"
           class="h-12 w-12 rounded-full border border-outline-variant object-cover" />`
    : `<span class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-bold text-primary">${esc(initials)}</span>`;

  return `
    <figure class="reveal card-exhibit !p-8">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" class="text-primary/25">
        <path d="M9 7H5a2 2 0 00-2 2v3a2 2 0 002 2h2v1a2 2 0 01-2 2H4v2h1a4 4 0 004-4V7zm11 0h-4a2 2 0 00-2 2v3a2 2 0 002 2h2v1a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V7z"/>
      </svg>
      <blockquote class="mt-4 font-display text-lg italic leading-relaxed text-ink-soft">
        ${esc(reflection.quote_text)}
      </blockquote>
      <figcaption class="mt-7 flex items-center gap-4">
        ${avatar}
        <span>
          <span class="block font-display text-base font-semibold text-ink">${esc(reflection.author_name)}</span>
          ${
            reflection.author_role
              ? `<span class="mt-0.5 block font-body text-[0.68rem] uppercase tracking-label text-ink-faint">${esc(reflection.author_role)}</span>`
              : ''
          }
        </span>
      </figcaption>
    </figure>
  `;
}

function eventSection(event) {
  const date = formatDate(event.event_date, { withDay: true });
  const reflections = event.reflections || [];

  return `
    <section class="mb-24">
      <div class="reveal overflow-hidden rounded-2xl bg-heritage-deep shadow-ambient">
        ${
          event.hero_image
            ? `<img src="${esc(event.hero_image)}" alt="${esc(event.title)}"
                    class="h-72 w-full object-cover sm:h-96" />`
            : ''
        }
        <div class="px-8 py-10 sm:px-12">
          ${date ? `<p class="label-eyebrow !text-primary-container">${esc(date)}</p>` : ''}
          <h2 class="display-section mt-3 !text-surface">${esc(event.title)}</h2>
          ${
            event.description
              ? `<p class="mt-5 max-w-2xl font-display leading-relaxed text-surface/75">${esc(event.description)}</p>`
              : ''
          }
        </div>
      </div>

      ${
        reflections.length
          ? `<div class="mt-14">
               <div class="ornament mb-10">
                 <span class="label-eyebrow">Reflections</span>
               </div>
               <div class="grid gap-8 md:grid-cols-2">
                 ${reflections.map(reflectionCard).join('')}
               </div>
             </div>`
          : ''
      }
    </section>
  `;
}

async function load() {
  root.innerHTML = loadingState('Gathering the celebration…');
  try {
    const events = await getAnniversaryEvents();

    if (!events.length) {
      root.innerHTML = stateMessage(
        'The celebration has not been published yet.',
        'Please check back once the curator has added it.',
      );
      return;
    }

    root.innerHTML = events.map(eventSection).join('');
    observeReveals(root);
  } catch (error) {
    root.innerHTML = errorState(error);
  }
}

load();
