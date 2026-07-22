/**
 * Shared chrome for every viewer page.
 *
 * There is no framework doing layout composition here, so the nav, footer and
 * grain overlay are injected by this module. Each page calls `mountChrome()`
 * with the nav key it should highlight.
 */

const NAV_LINKS = [
  { key: 'home', label: 'Home', href: '/home.html' },
  { key: 'tree', label: 'Family Tree', href: '/family-tree.html' },
  { key: 'gallery', label: 'Gallery', href: '/gallery.html' },
  { key: 'stories', label: 'Stories', href: '/stories.html' },
  { key: 'anniversary', label: 'The 90th', href: '/anniversary.html' },
];

function navMarkup(activeKey) {
  const links = NAV_LINKS.map((link) => {
    const isActive = link.key === activeKey;
    const classes = isActive
      ? 'text-primary font-medium'
      : 'text-ink-soft hover:text-primary';
    return `<a href="${link.href}" class="${classes} transition-colors duration-200 text-sm">${link.label}</a>`;
  }).join('');

  const mobileLinks = NAV_LINKS.map((link) => {
    const isActive = link.key === activeKey;
    const classes = isActive ? 'text-primary font-medium' : 'text-ink-soft';
    return `<a href="${link.href}" class="${classes} block py-3 text-base">${link.label}</a>`;
  }).join('');

  return `
    <header class="vellum-glass sticky top-0 z-40">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="/home.html" class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-surface-lowest">90</span>
          <span class="flex flex-col leading-none">
            <span class="font-display text-lg font-bold tracking-wide text-ink">JMT Legacy</span>
            <span class="mt-1 font-display text-[0.7rem] italic tracking-wider text-primary">Est. 1934</span>
          </span>
        </a>

        <nav class="hidden items-center gap-8 md:flex">${links}</nav>

        <button
          type="button"
          data-nav-toggle
          class="flex h-10 w-10 items-center justify-center text-ink md:hidden"
          aria-label="Open menu"
          aria-expanded="false"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div data-nav-panel class="hidden border-t border-outline-variant/50 bg-surface px-6 py-2 md:hidden">
        ${mobileLinks}
      </div>
    </header>
  `;
}

function footerMarkup() {
  return `
    <footer class="mt-24 bg-heritage-deep text-surface/80">
      <div class="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div class="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div class="max-w-sm">
            <p class="font-display text-xl font-bold text-surface">JMT Legacy</p>
            <p class="mt-2 text-sm leading-relaxed text-surface/60">
              Celebrating 90 years of grace. A private family archive, preserving
              the past to inspire the future.
            </p>
          </div>
          <nav class="flex gap-16">
            <div>
              <p class="label-eyebrow !text-primary-container">Explore</p>
              <div class="mt-4 flex flex-col gap-2 text-sm">
                <a href="/family-tree.html" class="text-surface/70 transition-colors hover:text-surface">Family Tree</a>
                <a href="/gallery.html" class="text-surface/70 transition-colors hover:text-surface">Photo Gallery</a>
                <a href="/stories.html" class="text-surface/70 transition-colors hover:text-surface">Stories</a>
              </div>
            </div>
          </nav>
        </div>
        <p class="mt-12 text-xs text-surface/40">
          &copy; ${new Date().getFullYear()} JMT Family Trust. A private archive — please do not share.
        </p>
      </div>
    </footer>
  `;
}

/** Fades elements in as they scroll into view. */
export function observeReveals(root = document) {
  // Opt the page into the hidden-until-revealed styling only now that the
  // script is definitely running (see `.js .reveal` in main.css).
  document.documentElement.classList.add('js');

  const targets = root.querySelectorAll('.reveal:not(.is-visible)');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );

  targets.forEach((el) => observer.observe(el));
}

/** Injects grain, nav and footer around the page's own <main>. */
export function mountChrome(activeKey) {
  const grain = document.createElement('div');
  grain.className = 'grain-overlay';
  document.body.appendChild(grain);

  document.body.insertAdjacentHTML('afterbegin', navMarkup(activeKey));
  document.body.insertAdjacentHTML('beforeend', footerMarkup());

  const toggle = document.querySelector('[data-nav-toggle]');
  const panel = document.querySelector('[data-nav-panel]');
  toggle?.addEventListener('click', () => {
    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });

  observeReveals();
}
