# Frontend changes — 2026-07-25

Frontend work wiring up the backend changes from [CHANGE.md](CHANGE.md), plus a few frontend-only issues. See `/home/bryant/.claude/plans/jmt-issues-velvety-newell.md` for the full plan. No new libraries or build tooling beyond one new Vite page entry — everything follows the existing plain-JS, no-framework patterns (`[data-*]`-attribute wiring, flex-row card lists, inline SVG icons).

## Access — no sign-out button in header

- `frontend/src/js/api.js` — new `viewerLogout()`, hits `POST /auth/logout/`.
- `frontend/src/js/layout.js` — `navMarkup()` gained a "Sign Out" button in both the desktop nav and the mobile panel (`[data-viewer-logout]`); `mountChrome()` wires a single delegated click handler that calls `viewerLogout()` then redirects to `/index.html`.

## Access — show/hide toggle on the sign-in code

- `frontend/index.html` — `#access-code` is now `type="password"` by default, wrapped with an inline-SVG eye/eye-off toggle button (`[data-toggle-code-visibility]`).
- `frontend/src/js/gateway.js` — toggle handler flips `input.type` between `password`/`text` and swaps the two SVG icons.

## Access — admin sign-in link from the viewer gateway

- `frontend/index.html` — added a small link to `/admin-login.html` below the existing help text. Markup-only.

## Admin Portal — custom access code

- `frontend/src/js/api.js` — `generateAccessCode()` now accepts `customCode` and includes it in the POST body when non-empty.
- `frontend/admin.html` — new optional "Custom code" input (6–64 chars) in the access-code form.
- `frontend/src/js/admin.js` — submit handler reads and passes through the new field.

## Admin Portal — generated codes not staying listed

- `frontend/src/js/api.js` — new `listAccessCodes()` (`GET /auth/admin/access-codes/`).
- `frontend/src/js/admin.js` — the access-codes section was reworked from a session-local `issuedCodes` array to a server-backed `codes` list refetched via `loadCodes()` on load and after every create/deactivate. A freshly generated code's plaintext is shown once inline (`justCreated`); every other row shows a masked placeholder plus label/dates, with an active/inactive indicator driven by the server's `is_active`/`is_valid` fields — so the list now survives a page reload.

## Admin Portal — upload image alongside stories + drag-and-drop

- `frontend/src/js/api.js` — new shared `adminMultipartRequest()` helper (mirrors the existing `bulkUploadPhotos` raw-fetch pattern); `createStory`/`updateStory` now send `FormData` through it instead of JSON, so `cover_image` is actually transmitted (previously the story form had no file input at all despite backend support).
- `frontend/admin.html` — new `#story-cover` file input inside a `[data-dropzone-area]` wrapper in the story form.
- `frontend/src/js/admin.js` — `dragover`/`dragenter`/`dragleave`/`drop` handlers on the dropzone assign dropped files to the input; the submit handler now builds `FormData` (title, category, year_label, read_time_minutes, excerpt, body, status, cover_image).

## Admin Portal — publish button instead of a generic status change

- `frontend/src/js/api.js` — new `publishStory(id)` (`POST /stories/admin/{id}/publish/`).
- `frontend/src/js/admin.js` — each story row now shows a status badge and, for non-published stories, a "Publish" button wired to a new delegated click handler that calls `publishStory` then reloads the list.
- `frontend/admin.html` — added a `pending_review` option to the status `<select>` so admins can still set it manually via the existing PATCH flow if needed.

## Admin Portal — expandable/minimizable story list

- `frontend/src/js/admin.js` — each story row now has a collapsible detail section (excerpt) toggled by a per-row chevron button, plus a page-level "Expand all / Collapse all" control.
- `frontend/admin.html` — added the expand-all control above the story list.
- Known limitation (by design, not a bug): expanded/collapsed state resets on every list reload (e.g. after a save or publish), since the list is fully re-rendered each time.

## Admin Portal — CRUD interface for family members

- `frontend/src/js/api.js` — new `listFamilyMembersAdmin()`, `createFamilyMember(formData)`, `updateFamilyMember(id, formData)` (both multipart via `adminMultipartRequest`), `deleteFamilyMember(id)`.
- `frontend/admin.html` — new "Family Members" section: a create/edit form (full name, title, parent dropdown, date of birth/death, biography, profile image) and a list, following the same layout as the Stories section.
- `frontend/src/js/admin.js` — new block (`resetMemberForm`, `fillMemberForm`, `renderParentOptions`, `loadMembers`) mirroring the Stories section's patterns. The parent `<select>` is rebuilt from the loaded member list on every fetch. Delete surfaces the backend's `409` "has children" conflict as a specific inline message rather than a generic failure.

## General — allow users to upload their own stories for admin review

- New files: `frontend/story-submit.html` + `frontend/src/js/story-submit.js` — a viewer-facing form (title, category, year_label, excerpt, body, submitted_by, optional cover_image) posting to the new `submitStory(formData)` in `api.js` (`POST /stories/submit/`, viewer-gated multipart, redirects to `/index.html` on 401 rather than the admin gateway).
- `frontend/src/js/layout.js` — added a "Share a Story" nav entry (`NAV_LINKS`) pointing to the new page.
- `frontend/vite.config.js` — added a `storySubmit` build entry.
- Submitted stories land as `pending_review` server-side and are already visible (with a badge) and publishable in the admin Stories section above — no separate review UI was needed.

## Not changed this pass (frontend-only, no backend implications)

- Dark mode — explicitly deferred ("after all other work is done") per the original issue list.
- Bulk photo-upload drag-and-drop — the existing `[data-photo-form]` file input still works via click-to-choose; only stories and family-member uploads were asked to gain drag-and-drop. Easy follow-up using the same dropzone pattern if wanted.
- d3.js aesthetic customization — an investigation question, not a build task; answer by reading `frontend/src/tree/TreeCanvas.jsx` when asked.

## Deferred (landing page — per user decision during planning)

- Hero section — already existed (`home.html` lines 12-27); confirmed no change needed.
- "Curated memories" section — skipped, no backend "curated" field exists yet.
- "The Roots" pill → Tribe/Region page — deferred, backend data model not designed yet.
- "The moments" pill / 90th-milestone photo strip on `anniversary.html` — deferred.

## Verification performed

- `npm run build` (Vite) completes cleanly with no errors, producing all existing pages plus the new `story-submit.html`/`storySubmit` bundle. Build output was removed afterward (`dist/`) since it's not meant to be committed.
- No frontend automated test suite exists in this repo, so these changes have not been exercised by tests — manual verification via the browser against the running Django dev server is recommended:
  - Sign in as a viewer, use the new sign-out button, confirm redirect to `/index.html` and that protected pages bounce back to the gateway afterward.
  - Toggle the code-visibility eye icon on the sign-in form; follow the new admin sign-in link.
  - Generate an access code with a custom value, reload the admin page, confirm the code list persists and shows correct valid/expired status; deactivate a code and confirm it updates.
  - Create/edit a story with a cover image via both the file picker and drag-and-drop; confirm it renders on the public story page.
  - Submit a story via `/story-submit.html` as a signed-in viewer; confirm it appears as `pending_review` with a badge in the admin Stories list, then click Publish and confirm the status/badge updates.
  - Create a family member with a parent selected, confirm it appears correctly in `/family-tree.html`; attempt to delete a member with children and confirm the 409 message shows; delete a leaf member successfully.
