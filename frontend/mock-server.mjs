/**
 * Development-only mock of the JMT Legacy API.
 *
 * The real backend needs Django + Postgres + Cloudinary credentials. This
 * stands in for it so the frontend can be developed and reviewed on its own,
 * mirroring the exact response shapes the DRF serializers produce (including
 * the PageNumberPagination envelope and the HTTP-only viewer cookie).
 *
 *   node mock-server.mjs        # listens on :8000, same port as runserver
 *
 * Never used in production — vite proxies /api to whatever is on :8000.
 */
import { createServer } from 'node:http';

const PORT = 8000;
const ACCESS_CODE = 'family90'; // the code to type at the gateway in mock mode
const COOKIE = 'jmt_viewer_token';

const img = (seed, w = 600, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const familyTree = [
  {
    id: 1,
    full_name: 'Josephine M. Tenywa',
    title: 'Matriarch',
    date_of_birth: '1934-04-12',
    date_of_death: null,
    is_deceased: false,
    profile_image: img('maama', 400, 400),
    children: [
      {
        id: 2,
        full_name: 'Daniel Tenywa',
        title: 'Eldest Son',
        date_of_birth: '1958-02-03',
        date_of_death: '2019-11-20',
        is_deceased: true,
        profile_image: img('daniel', 400, 400),
        children: [
          { id: 5, full_name: 'Grace Tenywa', title: '', date_of_birth: '1986-07-19', date_of_death: null, is_deceased: false, profile_image: img('grace', 400, 400), children: [] },
          { id: 6, full_name: 'Samuel Tenywa', title: '', date_of_birth: '1989-01-30', date_of_death: null, is_deceased: false, profile_image: null, children: [] },
        ],
      },
      {
        id: 3,
        full_name: 'Miriam Nakato',
        title: 'Daughter',
        date_of_birth: '1961-09-14',
        date_of_death: null,
        is_deceased: false,
        profile_image: img('miriam', 400, 400),
        children: [
          { id: 7, full_name: 'Esther Nakato', title: '', date_of_birth: '1992-05-05', date_of_death: null, is_deceased: false, profile_image: img('esther', 400, 400), children: [] },
        ],
      },
      {
        id: 4,
        full_name: 'Peter Tenywa',
        title: 'Youngest Son',
        date_of_birth: '1966-12-01',
        date_of_death: null,
        is_deceased: false,
        profile_image: null,
        children: [],
      },
    ],
  },
];

const members = {
  1: { parent: null, parent_name: null, biography: 'Born in the hills above Jinja in the spring of 1934, Josephine came of age in a household where hospitality was a discipline and prayer was a habit.\n\nShe married in 1956 and raised five children through years that asked a great deal of her. Those who know her speak first of her steadiness — the sense that whatever the season, she had already decided to meet it with grace.' },
  2: { parent: 1, parent_name: 'Josephine M. Tenywa', biography: 'Daniel carried his mother\'s seriousness and his father\'s humour in equal measure. A teacher for thirty-one years, he is remembered by hundreds of students who never knew he paid their school fees himself.' },
  3: { parent: 1, parent_name: 'Josephine M. Tenywa', biography: 'Miriam kept the family\'s records long before anyone called it an archive. Most of the photographs in this collection survive because she refused to let them be thrown away.' },
  4: { parent: 1, parent_name: 'Josephine M. Tenywa', biography: '' },
  5: { parent: 2, parent_name: 'Daniel Tenywa', biography: 'The family\'s first doctor.' },
  6: { parent: 2, parent_name: 'Daniel Tenywa', biography: '' },
  7: { parent: 3, parent_name: 'Miriam Nakato', biography: 'Keeper of the recipes, and the reason the Christmas gatherings still happen.' },
};

const eras = [
  { id: 1, name: 'Early Beginnings', display_order: 1 },
  { id: 2, name: 'The Migration Years', display_order: 2 },
  { id: 3, name: 'Modern Legacy', display_order: 3 },
];

const photos = [
  { id: 1, title: 'The First Homestead', era: eras[0], caption: 'The house at Green Creek, photographed the year it was finished.', seed: 'homestead', uploaded_at: '1949-06-01T00:00:00Z' },
  { id: 2, title: 'Wedding Day', era: eras[0], caption: 'Josephine and Michael, outside the old parish church.', seed: 'wedding', uploaded_at: '1956-08-14T00:00:00Z' },
  { id: 3, title: 'The Journey North', era: eras[1], caption: 'Packed and waiting at the station.', seed: 'journey', uploaded_at: '1968-03-02T00:00:00Z' },
  { id: 4, title: 'Sunday Afternoon', era: eras[1], caption: '', seed: 'sunday', uploaded_at: '1972-11-11T00:00:00Z' },
  { id: 5, title: 'The Garden', era: eras[1], caption: 'Her roses, still cultivated by the family today.', seed: 'garden', uploaded_at: '1981-04-21T00:00:00Z' },
  { id: 6, title: 'Four Generations', era: eras[2], caption: 'Taken at the 90th celebration.', seed: 'generations', uploaded_at: '2024-08-14T00:00:00Z' },
  { id: 7, title: 'The Long Table', era: eras[2], caption: 'One hundred and forty-two places set.', seed: 'table', uploaded_at: '2024-08-14T00:00:00Z' },
  { id: 8, title: 'Grandchildren', era: eras[2], caption: '', seed: 'grandchildren', uploaded_at: '2024-08-14T00:00:00Z' },
];

const stories = [
  { id: 1, title: 'The Crossing of ’42', category: 'Migration Era', year_label: '1942', excerpt: 'A harrowing journey that defined a generation’s resilience.', seed: 'crossing', content_type: 'text', read_time_minutes: 4 },
  { id: 2, title: 'Grandmother’s Garden', category: 'Early Beginnings', year_label: '1955', excerpt: 'Exploring the botanical legacy left behind in the soil of the old homestead.', seed: 'garden2', content_type: 'text', read_time_minutes: 6 },
  { id: 3, title: 'The Letters', category: 'Migration Era', year_label: '1938–1945', excerpt: 'A preserved correspondence between brothers separated by distance and war.', seed: 'letters', content_type: 'text', read_time_minutes: 12 },
  { id: 4, title: 'Building the First Home', category: 'Early Beginnings', year_label: '1949', excerpt: 'With hand tools and determination, the family built their first permanent residence.', seed: 'building', content_type: 'text', read_time_minutes: 8 },
  { id: 5, title: 'Voices of the Past', category: 'Oral Histories', year_label: '1975', excerpt: 'Restored tapes featuring interviews with the elders.', seed: null, content_type: 'audio', read_time_minutes: 15 },
  { id: 6, title: 'The Summer Reunion', category: 'Modern Legacy', year_label: '1968', excerpt: 'The legendary gathering where over two hundred family members convened.', seed: 'reunion', content_type: 'text', read_time_minutes: 5 },
];

const STORY_BODY = `In the early dawn of 1892, the family set forth on a journey that would redefine our lineage. What you see here is not merely a collection of dates and names, but a digital preservation of the original handwritten journals kept by our great-grandfather.

The ink has faded and the pages have grown brittle, but the voice remains clear. He wrote of the long winters in the valley, the scent of pine burning in the hearth, and the quiet resilience required to build a life from the soil up.

"We plant trees not for ourselves," he wrote in the entry dated October 14th, 1895, "but for the shade they will provide our children." This philosophy became the bedrock of the family legacy. It was never about the immediate harvest, but the enduring sustainability of the land and the kin who tended it.

Today, as we digitise these fragile pages, we are careful to preserve not just the words, but the artifacts themselves. The ink blots, the crossed-out lines, the marginalia — these are the fingerprints of history.`;

const anniversary = [
  {
    id: 1,
    title: 'The 90th Celebration',
    description: 'On a warm afternoon in August, four generations gathered at the old estate to honour ninety years of grace. One hundred and forty-two members came, some travelling three days to be there.',
    hero_image: img('celebration', 1400, 800),
    event_date: '2024-08-14',
    reflections: [
      { id: 1, author_name: 'Miriam Nakato', author_role: 'Daughter', author_photo: img('miriam', 200, 200), quote_text: 'She taught us that a house is only a building until someone decides to keep its door open. Ours was never closed.' },
      { id: 2, author_name: 'Grace Tenywa', author_role: 'Granddaughter', author_photo: img('grace', 200, 200), quote_text: 'I have never once heard her raise her voice, and I have never once doubted where she stood.' },
      { id: 3, author_name: 'Samuel Tenywa', author_role: 'Grandson', author_photo: null, quote_text: 'Ninety years, and she still asks about your exams before she tells you about her week.' },
      { id: 4, author_name: 'Esther Nakato', author_role: 'Great-granddaughter', author_photo: img('esther', 200, 200), quote_text: 'We build not for ourselves, but for those who will stand here when we are gone. She said that, and then she went back to the kitchen.' },
    ],
  },
];

// ---------------------------------------------------------------------------

const paginated = (results) => ({ count: results.length, next: null, previous: null, results });

const send = (res, status, payload, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(payload));
};

const isAuthed = (req) => (req.headers.cookie || '').includes(`${COOKIE}=`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/api\/v1/, '');

  // --- Auth ---
  if (path === '/auth/validate-code/' && req.method === 'POST') {
    const body = await new Promise((resolve) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => resolve(raw));
    });
    let code = '';
    try {
      code = JSON.parse(body || '{}').code;
    } catch { /* fall through to the invalid-code response */ }

    if (code !== ACCESS_CODE) {
      return send(res, 401, { detail: 'Invalid access code.' });
    }
    return send(res, 200, { detail: 'Access granted.' }, {
      'Set-Cookie': `${COOKIE}=mock-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`,
    });
  }

  // Everything below is viewer-gated, exactly like IsFamilyViewer.
  if (!isAuthed(req)) {
    return send(res, 401, { detail: 'A valid family access code is required.' });
  }

  if (path === '/family-tree/') return send(res, 200, familyTree);

  const memberMatch = path.match(/^\/family-tree\/members\/(\d+)\/$/);
  if (memberMatch) {
    const id = Number(memberMatch[1]);
    const node = findNode(familyTree, id);
    if (!node) return send(res, 404, { detail: 'Not found.' });
    const { children, ...nodeFields } = node;
    return send(res, 200, {
      ...nodeFields,
      ...members[id],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  }

  if (path === '/gallery/photos/') {
    const era = url.searchParams.get('era');
    const list = photos
      .filter((p) => !era || String(p.era.id) === String(era))
      .map(({ seed, ...p }) => ({ ...p, thumbnail: img(seed, 600, 700 + (p.id % 4) * 120) }));
    return send(res, 200, paginated(list));
  }

  const photoMatch = path.match(/^\/gallery\/photos\/(\d+)\/$/);
  if (photoMatch) {
    const photo = photos.find((p) => p.id === Number(photoMatch[1]));
    if (!photo) return send(res, 404, { detail: 'Not found.' });
    const { seed, ...rest } = photo;
    return send(res, 200, { ...rest, members: [], image_url: img(seed, 1200, 900) });
  }

  if (path === '/stories/') {
    const category = url.searchParams.get('category');
    const list = stories
      .filter((s) => !category || s.category === category)
      .map(({ seed, ...s }) => ({
        ...s,
        cover_image: seed ? img(seed, 800, 600) : null,
        created_at: '2024-01-01T00:00:00Z',
      }));
    return send(res, 200, paginated(list));
  }

  const storyMatch = path.match(/^\/stories\/(\d+)\/$/);
  if (storyMatch) {
    const story = stories.find((s) => s.id === Number(storyMatch[1]));
    if (!story) return send(res, 404, { detail: 'Not found.' });
    const { seed, ...rest } = story;
    return send(res, 200, {
      ...rest,
      cover_image: seed ? img(seed, 1200, 800) : null,
      body: story.content_type === 'audio' ? '' : STORY_BODY,
      audio_url: null,
      created_at: '2024-01-01T00:00:00Z',
    });
  }

  if (path === '/anniversary/events/') return send(res, 200, paginated(anniversary));

  return send(res, 404, { detail: 'Not found.' });
});

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = findNode(node.children || [], id);
    if (hit) return hit;
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`Mock JMT API listening on http://127.0.0.1:${PORT}`);
  console.log(`Gateway access code: ${ACCESS_CODE}`);
});
