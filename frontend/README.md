# JMT Legacy Archive — Frontend

The viewer-facing website for the JMT Legacy Platform: a private family heritage
archive gated behind a shared access code. It is a Vite multi-page app — every
screen is its own plain HTML entry so the markup stays close to the wireframes in
`wireframes/`. React is pulled in by exactly one page (the family tree), which
mounts a D3 island.

## Quick start

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

The dev server proxies `/api` to `http://127.0.0.1:8000`, so it needs a backend
on port 8000. You have two options.

### Option A — mock backend (no Django, no database)

```bash
node mock-server.mjs   # in a second terminal; listens on :8000
npm run dev
```

The mock mirrors the real DRF response shapes, including the pagination
envelope and the HTTP-only viewer cookie. **Access code: `family90`.**

### Option B — the real Django backend

Follow `backend/ARCHITECTURE.md` to configure Postgres and Cloudinary, then run
`python manage.py runserver` on port 8000. The access code is whatever
`AccessCode` row the Editor-in-Chief has created.

Proxying (rather than calling `localhost:8000` directly) keeps everything
same-origin, so the browser sends the HTTP-only auth cookie without any
CORS or SameSite negotiation.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with HMR on :3000, `/api` proxied to :8000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serves the built `dist/` (no API proxy — needs a real backend at the same origin) |

## Pages

| Entry | Route | What it does |
|---|---|---|
| `index.html` | `/` | **Gateway** — access-code entry, inline error on a bad code, returns you to wherever you were headed |
| `home.html` | `/home.html` | Welcome letter and the three chapter entry points |
| `family-tree.html` | `/family-tree.html` | React + D3 collapsible tree; clicking a node opens a member detail modal |
| `gallery.html` | `/gallery.html` | Masonry photo grid with era filter chips and a lightbox |
| `stories.html` | `/stories.html` | Story grid with category filters |
| `story.html` | `/story.html?id=<id>` | Full-bleed manuscript reader (no site nav, by design) |
| `anniversary.html` | `/anniversary.html` | The 90th anniversary journey, with nested reflections |

## Source layout

```
src/
├── js/
│   ├── api.js        # Fetch wrapper: API paths, 401 → gateway redirect, DRF unwrapping
│   ├── layout.js     # Shared nav/footer/grain injection, scroll-reveal observer
│   ├── ui.js         # Shared loading / empty / error state markup, HTML escaping
│   └── <page>.js     # One entry per HTML page
├── tree/             # The React + D3 family-tree island
└── styles/main.css   # Tailwind layers plus the archival component classes
```

`tailwind.config.js` holds the design tokens — the paper/ink palette, the display
and body type scales, and the manuscript measure.

## Auth model

The viewer token is an **HTTP-only cookie**, so JavaScript can never read it and
there is no reliable client-side "am I signed in?" check. Instead, every API
call that comes back `401`/`403` bounces the visitor to the gateway, stashing the
intended destination in `sessionStorage` first. Pages with no content fetch of
their own use `requireSession()` from `api.js` as their guard — the home page is
the one that needs it, since it is entirely static markup.

## Notes

- **Audio stories** are a backend stub: a story with `content_type: "audio"` and
  no `audio_url` renders an explanatory placeholder rather than a broken player.
- **Scroll-reveal** is gated on JS being active — if the bundle fails to load,
  content stays visible instead of being stuck at `opacity: 0`.
- **Images** come from Cloudinary in production and `picsum.photos` in the mock.
