import '../styles/main.css';
import { getStory } from './api.js';
import { observeReveals } from './layout.js';
import { esc, loadingState, stateMessage, errorState } from './ui.js';

const root = document.querySelector('[data-story-root]');

// Grain overlay only — this page deliberately skips the site nav/footer so the
// manuscript reads as an uninterrupted sheet.
document.body.insertAdjacentHTML('beforeend', '<div class="grain-overlay"></div>');

/** Renders the plain-text body as paragraphs, dropping a cap on the first. */
function bodyMarkup(body) {
  const paragraphs = String(body)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!paragraphs.length) return '';

  return paragraphs
    .map((text, index) => {
      const dropCap =
        index === 0
          ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-6xl first-letter:font-bold first-letter:leading-none first-letter:text-primary'
          : '';
      // Single newlines inside a block stay as line breaks.
      const html = esc(text).replace(/\n/g, '<br />');
      return `<p class="${dropCap}">${html}</p>`;
    })
    .join('');
}

function audioMarkup(story) {
  if (story.content_type !== 'audio') return '';

  if (!story.audio_url) {
    return `
      <div class="my-10 rounded-lg bg-surface-high px-6 py-8 text-center">
        <p class="font-display italic text-ink-soft">
          This is an oral history. The recording has not been added to the archive yet.
        </p>
      </div>`;
  }

  return `
    <div class="my-10 rounded-lg bg-surface-high px-6 py-6">
      <p class="label-eyebrow mb-3">Listen to the recording</p>
      <audio controls preload="none" src="${esc(story.audio_url)}" class="w-full"></audio>
    </div>`;
}

function render(story) {
  const meta = [story.category, story.year_label].filter(Boolean).map(esc).join(' &nbsp;&middot;&nbsp; ');
  const readTime = story.read_time_minutes
    ? `${story.read_time_minutes} min ${story.content_type === 'audio' ? 'listen' : 'read'}`
    : '';

  root.innerHTML = `
    <article class="mx-auto max-w-manuscript reveal">
      <header class="text-center">
        <div class="ornament mb-6"><span class="text-sm">&#10047;</span></div>
        <h1 class="font-display text-4xl font-bold leading-tight tracking-display sm:text-5xl">
          ${esc(story.title)}
        </h1>
        ${meta ? `<p class="mt-5 font-body text-[0.7rem] uppercase tracking-label text-ink-faint">${meta}</p>` : ''}
        ${readTime ? `<p class="mt-2 font-body text-xs text-primary">${esc(readTime)}</p>` : ''}
      </header>

      ${
        story.cover_image
          ? `<figure class="my-12">
               <img src="${esc(story.cover_image)}" alt="${esc(story.title)}"
                    class="artifact-image w-full rounded-lg" />
             </figure>`
          : '<div class="ornament my-12"></div>'
      }

      ${
        story.excerpt
          ? `<blockquote class="my-10 border-l-2 border-primary bg-surface-high/70 px-7 py-5">
               <p class="font-display text-lg italic leading-relaxed text-ink-soft">${esc(story.excerpt)}</p>
             </blockquote>`
          : ''
      }

      ${audioMarkup(story)}

      <div class="prose-archive space-y-6 text-[1.08rem]">
        ${bodyMarkup(story.body) || '<p class="italic text-ink-faint">The full text of this story has not been transcribed yet.</p>'}
      </div>

      <footer class="mt-20 text-center">
        <div class="ornament mb-8"><span class="text-sm">&#10047;</span></div>
        <a href="/stories.html" class="btn-ghost">Return to the Stories</a>
      </footer>
    </article>
  `;

  document.title = `${story.title} — The JMT Legacy Archive`;
  observeReveals(root);
}

async function load() {
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    root.innerHTML = stateMessage(
      'No story was specified.',
      'Please pick a story from the collection.',
    );
    return;
  }

  root.innerHTML = loadingState('Unfolding the manuscript…');

  try {
    render(await getStory(id));
  } catch (error) {
    root.innerHTML =
      error?.status === 404
        ? stateMessage(
            'This story is not in the archive.',
            'It may have been unpublished by the curator.',
          )
        : errorState(error);
  }
}

load();
