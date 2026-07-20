/** Small rendering helpers shared by the data-driven pages. */

/** Escapes user/admin-authored text before it goes into innerHTML. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stateMessage(title, detail = '') {
  return `
    <div class="col-span-full py-24 text-center">
      <p class="font-display text-lg text-ink-soft">${esc(title)}</p>
      ${detail ? `<p class="mx-auto mt-2 max-w-md text-sm text-ink-faint">${esc(detail)}</p>` : ''}
    </div>
  `;
}

export function loadingState(label = 'Retrieving from the archive…') {
  return `
    <div class="col-span-full flex flex-col items-center py-24 text-center">
      <span class="block h-8 w-8 animate-spin rounded-full border-2 border-outline border-t-primary"></span>
      <p class="mt-5 font-display text-sm italic text-ink-faint">${esc(label)}</p>
    </div>
  `;
}

/** Renders a caught ApiError into the container, without leaking stack detail. */
export function errorState(error) {
  return stateMessage(
    'This part of the archive could not be opened.',
    error?.message || 'Please try again in a moment.',
  );
}

/** "1942" / "12 March 1942" — tolerant of null dates. */
export function formatDate(value, { withDay = false } = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    ...(withDay ? { day: 'numeric', month: 'long' } : { month: 'short' }),
  });
}

/** "1934 — 2011" lifespan line for a family member. */
export function formatLifespan({ date_of_birth: birth, date_of_death: death }) {
  const born = birth ? new Date(birth).getFullYear() : null;
  const died = death ? new Date(death).getFullYear() : null;
  if (born && died) return `${born} — ${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return '';
}

/** Derives unique filter values from a list, preserving first-seen order. */
export function uniqueBy(items, pick) {
  const seen = new Map();
  items.forEach((item) => {
    const value = pick(item);
    if (value === null || value === undefined || value === '') return;
    const key = typeof value === 'object' ? value.id : value;
    if (!seen.has(key)) seen.set(key, value);
  });
  return [...seen.values()];
}
