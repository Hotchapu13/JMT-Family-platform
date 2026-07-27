# Backend changes — 2026-07-25

Backend work supporting the open frontend issues. See `/home/bryant/.claude/plans/jmt-issues-velvety-newell.md` for the full plan this was executed against. Two items from the original issue list are explicitly **not** covered here per user decision: the Tribe/Region data model for "The Roots" page (deferred, design TBD), and pure frontend-only issues that need no backend change (see the "No backend change needed" section at the bottom).

## Access — no sign-out button in header

- `backend/apps/authentication/views.py` — added `ViewerLogoutView`, clears the viewer JWT cookie (`settings.AUTH_COOKIE_NAME`). Mirrors the existing `AdminLogoutView`.
- `backend/apps/authentication/urls.py` — new route `POST /api/v1/auth/logout/`.

## Admin Portal — custom sign-in code generation

- `backend/apps/authentication/models.py` — `AccessCode.generate()` now takes an optional `custom_code` param. If given, it's hashed and checked for a collision instead of generating a random `secrets.token_urlsafe(9)` code; raises `ValueError` on collision.
- `backend/apps/authentication/serializers.py` — `GenerateAccessCodeSerializer` gained an optional `custom_code` field (6–64 chars).
- `backend/apps/authentication/views.py` — `GenerateAccessCodeView.post()` passes `custom_code` through and returns `400` on collision.

## Admin Portal — generated codes not staying listed (valid + expired)

- `backend/apps/authentication/views.py` — `GenerateAccessCodeView` now also handles `GET`, returning every `AccessCode` ever issued via `AccessCodeSerializer`.
- `backend/apps/authentication/serializers.py` — `AccessCodeSerializer` gained a computed `is_valid` field (calls the model's `is_valid()`) so the admin UI can distinguish active vs. expired/deactivated at a glance.
- Route unchanged: `GET/POST /api/v1/auth/admin/access-codes/`.

## Admin Portal — CRUD interface for family members

- `backend/apps/family_tree/serializers.py` — new `FamilyMemberAdminSerializer` (full read/write, including `parent` and `profile_image`).
- `backend/apps/family_tree/views.py` — new `FamilyMemberAdminListCreateView` and `FamilyMemberAdminDetailView`. Deletion is blocked (`409 Conflict`) while the member still has children in the tree, so a branch can't be silently orphaned — reparent or delete the children first.
- `backend/apps/family_tree/urls.py` — new routes:
  - `GET/POST /api/v1/family-tree/admin/members/`
  - `GET/PATCH/DELETE /api/v1/family-tree/admin/members/{id}/`

## Admin Portal — publish button instead of a generic status change

- `backend/apps/stories_library/models.py` — added `Story.published_at` (nullable datetime).
- `backend/apps/stories_library/views.py` — new `StoryPublishView` (`POST /api/v1/stories/admin/{id}/publish/`), sets `status=published` and stamps `published_at` atomically, so the action has real semantic meaning beyond a field PATCH.
- `backend/apps/stories_library/urls.py` — new route `POST /api/v1/stories/admin/{id}/publish/`.
- Migration: `backend/apps/stories_library/migrations/0002_story_published_at_story_submitted_by_and_more.py`.

## Admin Portal — upload image alongside stories (thumbnail)

- No change needed — `Story.cover_image` already existed and was already wired into the admin create/update views via multipart upload. Reusing `cover_image` as the thumbnail; no separate field added.

## Admin Portal — drag-and-drop file upload

- No backend change — multipart `POST` (already supported by the story and gallery admin endpoints) is agnostic to whether the file came from a picker or a drop event. Frontend-only.

## Admin Portal — expandable/minimizable published-articles list

- No backend change — list is already paginated (`PageNumberPagination`, `PAGE_SIZE=24`). Frontend-only.

## Admin Portal — d3.js aesthetic customization

- Not a backend question — investigate in `frontend/src/tree/TreeCanvas.jsx`.

## General — allow users to upload their own stories/articles for admin review

- `backend/apps/stories_library/models.py` — added `Story.Status.PENDING_REVIEW` and a `submitted_by` free-text field (viewers authenticate via a shared access code, not individual accounts, so there's no user FK to attach — just a name string).
- `backend/apps/stories_library/serializers.py` — new `StorySubmissionSerializer` (viewer-facing subset: title, category, year_label, excerpt, body, cover_image, submitted_by).
- `backend/apps/stories_library/views.py` — new `StorySubmissionView` (`IsFamilyViewer`-gated), forces `status=pending_review` server-side regardless of client input.
- `backend/apps/stories_library/urls.py` — new route `POST /api/v1/stories/submit/`.
- The existing admin list/detail views already show all statuses with no filtering, so `pending_review` stories are already visible to admins without further changes; the existing publish action (above) moves them to `published`.
- Migration: same file as above (`0002_story_published_at_story_submitted_by_and_more.py`).

## Landing Page — "The 90th milestone" page

- No backend code change — `backend/apps/gallery/models.py`'s `Era` model is already a generic, admin-manageable tag (`Era` is registered in Django admin at `backend/apps/gallery/admin.py`), and `GET /api/v1/gallery/photos/?era={id}` already filters by it. The `backend/apps/anniversary/` app already exists for the page's narrative content (`GET /api/v1/anniversary/events/`).
- Content task, not a code task: create an Era row (e.g. "Maama's 90th Birthday") via Django admin, tag the relevant photos with it, and populate an `AnniversaryEvent`. The new frontend page combines both endpoints.

## Landing Page — "The Roots" pill → dedicated Tribe/Region/Family page

- **Deferred.** No Tribe/Region model exists yet; the data-modeling approach (new models vs. fields on `FamilyMember`) was explicitly left for a later decision.

## Landing Page — "Curated memories" section

- **Not scoped.** No "featured"/"curated" field exists anywhere in the backend today. Flagged in the plan as a future decision point once it's clearer what content the section should pull from — not implemented in this pass.

## No backend change needed (frontend-only)

- Show/hide password or code visibility toggle on the sign-in form.
- Link from the viewer sign-in page to the admin sign-in page.
- Dark mode.
- Landing page Hero section (the page is fully static HTML with no backend/CMS call).

## Verification performed

- `python manage.py makemigrations stories_library` generated `0002_story_published_at_story_submitted_by_and_more.py` for the new `published_at`/`submitted_by` fields and the `status` choices change.
- `python manage.py makemigrations --check --dry-run` confirms no other model changes are left unmigrated (the `family_tree` and `authentication` changes were views/serializers only, no schema change).
- No automated test suite exists yet in this repo (`python manage.py test` finds 0 tests), so these changes have not been exercised by tests — manual verification via the admin portal UI and API client is recommended before relying on them in production.
