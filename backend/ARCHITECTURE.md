# JMT Legacy Platform — Backend Architecture

## 1. Overview

The JMT Legacy Platform backend is a Django + Django REST Framework API powering a private, password-protected family heritage archive. It has exactly two user types, authenticated through two completely separate gateways:

- **Family Viewers** — family members who enter a shared access code to browse the archive (family tree, photo gallery, stories, anniversary content) in a read-only capacity. They never have individual accounts.
- **The Editor-in-Chief** (initially Dr. Muhumuza Ibra) — the sole content administrator, who logs in with a username and password through Django's admin (skinned with django-unfold) and/or the API's admin endpoints to create, edit, publish, and unpublish content.

The backend exposes a versioned JSON API under `/api/v1/`, persists data in PostgreSQL, stores and serves all media through Cloudinary, and uses Celery + Redis for any asynchronous work. It is deliberately scoped to backend-only concerns — there is no bundled frontend, no test suite (deferred to a later pass), and no production deployment configuration.

## 2. Tech stack

| Dependency | Used for |
|---|---|
| Django | Core web framework |
| Django REST Framework | API views, serializers, permissions |
| djangorestframework-simplejwt | JWT issuance/validation primitives (`AccessToken`), wrapped in custom cookie-based auth |
| PostgreSQL (`psycopg2-binary`) | Primary relational database |
| Celery | Asynchronous task queue (scaffolded; no tasks required by this pass) |
| Redis | Celery broker and result backend |
| django-cloudinary-storage + cloudinary | Default file storage backend for every `ImageField`; image transformations (resize, watermark) at serve-time |
| django-unfold | Skins the Django admin for the Editor-in-Chief's content management UI |
| django-environ | Reads all secrets/config from environment variables |
| django-cors-headers | CORS configuration for the (separately built) frontend |
| Pillow | Available for any local image processing not covered by Cloudinary's own pipeline (currently unused — all transformations are Cloudinary URL-based) |

## 3. Project structure

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py            # Shared settings: apps, middleware, DRF, JWT, Cloudinary, Celery, Unfold
│   │   ├── development.py     # Local Postgres, permissive CORS, non-secure cookies
│   │   └── production.py      # Strict ALLOWED_HOSTS, secure cookies, HSTS
│   ├── urls.py                # Root URLconf: admin, robots.txt, /api/v1/* includes
│   ├── wsgi.py / asgi.py
│   └── celery.py              # Celery app instance, autodiscovers app tasks
├── apps/
│   ├── authentication/        # Both auth gateways: AccessCode + AdminUser models, JWT issuance, permissions
│   ├── family_tree/           # FamilyMember model, recursive tree-building service, tree/detail endpoints
│   ├── gallery/                # Era + Photo models, Cloudinary transformations, draft/publish workflow
│   ├── stories_library/       # Story model (text/audio-stub), draft/publish workflow
│   └── anniversary/            # Minimal: AnniversaryEvent + AnniversaryReflection, read-only endpoint
├── manage.py
├── requirements.txt
├── .env.example
└── ARCHITECTURE.md
```

## 4. Authentication model

This is the security backbone of the entire application: **two independent JWT-issuing flows**, never merged.

```
 ┌─────────────────────────┐            ┌──────────────────────────┐
 │      Family Viewer       │            │      Editor-in-Chief       │
 │  (no account, shared      │            │  (AdminUser: username/    │
 │   access code)            │            │   password)                │
 └─────────────┬─────────────┘            └─────────────┬──────────────┘
               │ POST /api/v1/auth/validate-code/        │ POST /api/v1/auth/admin/login/
               │ { "code": "<plaintext>" }                │ { "username", "password" }
               ▼                                          ▼
   AccessCode.objects.get(code_hash=...)         Django authenticate(username, password)
   check is_valid() (is_active + not expired)     check user.is_active
               │                                          │
               ▼                                          ▼
   issue_viewer_token() → AccessToken              issue_admin_token(user) → AccessToken
   claims: { scope: "viewer", exp: +12h }          claims: { scope: "admin", user_id, exp: +24h }
               │                                          │
               ▼                                          ▼
   Set-Cookie: jmt_viewer_token (HttpOnly)         Set-Cookie: jmt_admin_token (HttpOnly)
               │                                          │
               └───────────────┬──────────────────────────┘
                                ▼
                  CookieJWTAuthentication (DRF auth class)
                  reads admin cookie first, then viewer cookie,
                  decodes + validates, returns (user, token)
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
        IsFamilyViewer                IsPlatformAdmin
   (token.scope in viewer/admin)   (token.scope == admin
    → read endpoints                 AND request.user authenticated)
                                     → write/mutate endpoints
```

Key implementation details (`apps/authentication/`):

- **Tokens are never read from the `Authorization` header.** `CookieJWTAuthentication` (`authentication.py`) reads `request.COOKIES[ADMIN_AUTH_COOKIE_NAME]` and `request.COOKIES[AUTH_COOKIE_NAME]` exclusively, in that order.
- **Viewer tokens carry no user identity** — there is no Django user row for a Family Viewer, so the token is a bare `AccessToken()` with only a `scope: "viewer"` claim and an expiry. `request.user` is set to a lightweight `ViewerUser` stand-in (`is_authenticated = True`, no database row).
- **Admin tokens are tied to a real `AdminUser` row** via a `user_id` claim, exactly like a normal SimpleJWT token, and `CookieJWTAuthentication` re-fetches and validates that user (`is_active`) on every request.
- **`IsFamilyViewer` also accepts admin-scoped tokens** — the Editor-in-Chief should be able to browse the same read endpoints Family Viewers use without separately entering an access code. `IsPlatformAdmin` only ever accepts `scope == "admin"`.
- `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES` is `AllowAny` — there is intentionally **no implicit default permission**. Every view explicitly sets `permission_classes = [IsFamilyViewer]` or `[IsPlatformAdmin]` so the required scope is always visible at the call site, per the project's read-vs-write rule (read endpoints get `IsFamilyViewer`, write/mutate endpoints get `IsPlatformAdmin`).
- `AccessCode.generate(created_by, expires_at, label)` is the only place a plaintext code ever exists — it's returned once in the `GenerateAccessCodeView` response and only its SHA-256 hash (`code_hash`) is persisted.
- `manage.py seed_admin` creates the single initial Editor-in-Chief account (`INITIAL_ADMIN_USERNAME`/`INITIAL_ADMIN_PASSWORD`/`INITIAL_ADMIN_EMAIL` env vars), defaulting to "Dr. Muhumuza Ibra." Additional admins can be created later via Django admin or `createsuperuser` — `AdminUser` supports any number of rows.

## 5. Models

### `apps.authentication`

**`AdminUser`** (extends `django.contrib.auth.models.AbstractUser`; this is `AUTH_USER_MODEL`)
| Field | Type | Purpose |
|---|---|---|
| (all `AbstractUser` fields) | — | `username`, `password`, `email`, `first_name`, `last_name`, `is_staff`, `is_superuser`, `is_active`, etc. |

No additional fields — a thin subclass kept separate from any Family Viewer concept entirely.

**`AccessCode`**
| Field | Type | Purpose |
|---|---|---|
| `code_hash` | `CharField(64, unique)` | SHA-256 hash of the plaintext code; the plaintext itself is never stored |
| `label` | `CharField(100, blank)` | Optional human-readable label (e.g. "2026 reunion code") |
| `created_at` | `DateTimeField(auto_now_add)` | |
| `expires_at` | `DateTimeField` | Checked by `is_valid()` |
| `is_active` | `BooleanField(default=True)` | Manually revocable independent of expiry |
| `created_by` | `FK → AdminUser`, `on_delete=SET_NULL` | Which admin generated this code |

### `apps.family_tree`

**`FamilyMember`**
| Field | Type | Purpose |
|---|---|---|
| `parent` | `FK → self`, `null/blank`, `on_delete=SET_NULL`, `related_name='children'` | Builds the tree hierarchy |
| `full_name` | `CharField(200)` | |
| `title` | `CharField(100, blank)` | e.g. "Patriarch," "Founder" |
| `date_of_birth` | `DateField(null/blank)` | |
| `date_of_death` | `DateField(null/blank)` | Drives `is_deceased` |
| `biography` | `TextField(blank)` | Full bio-modal content |
| `profile_image` | `ImageField` (Cloudinary-backed) | |
| `created_at` / `updated_at` | `DateTimeField` | |
| `is_deceased` *(property, not a DB column)* | `bool` | `date_of_death is not None` — exposed read-only in serializers so the frontend can apply the grayscale/soft-border treatment (SRS FR-2.3) |

Relationship: self-referential FK forms an arbitrary-depth tree (no enforced single root).

### `apps.gallery`

**`Era`**
| Field | Type | Purpose |
|---|---|---|
| `name` | `CharField(100)` | e.g. "1960s," "Migration Era" |
| `display_order` | `PositiveIntegerField(default=0)` | Manual ordering for filter UI |

**`Photo`**
| Field | Type | Purpose |
|---|---|---|
| `title` | `CharField(200, blank)` | |
| `era` | `FK → Era`, `null`, `on_delete=SET_NULL`, `related_name='photos'` | |
| `members` | `M2M → family_tree.FamilyMember`, `blank`, `related_name='photos'` | Tags people present in the photo |
| `status` | `CharField` choices `draft`/`published`, default `draft` | Gates viewer visibility |
| `image` | `ImageField` (Cloudinary-backed) | |
| `caption` | `TextField(blank)` | |
| `uploaded_at` | `DateTimeField(auto_now_add)` | |

### `apps.stories_library`

**`Story`**
| Field | Type | Purpose |
|---|---|---|
| `title` | `CharField(200)` | |
| `category` | `CharField(100, blank)` | e.g. "Migration Era," "Early Beginnings" |
| `year_label` | `CharField(50, blank)` | Display string, e.g. "1942" |
| `excerpt` | `TextField(blank)` | List-view teaser |
| `body` | `TextField(blank)` | Full manuscript |
| `cover_image` | `ImageField(blank/null)` (Cloudinary-backed) | |
| `content_type` | `CharField` choices `text`/`audio`, default `text` | **Schema stub** — see §9 |
| `audio_url` | `URLField(blank/null)` | **Schema stub** — see §9 |
| `status` | `CharField` choices `draft`/`published`, default `draft` | |
| `read_time_minutes` | `PositiveIntegerField(null/blank)` | |
| `created_at` | `DateTimeField(auto_now_add)` | |

### `apps.anniversary`

**`AnniversaryEvent`**
| Field | Type | Purpose |
|---|---|---|
| `title` | `CharField(200)` | |
| `description` | `TextField(blank)` | |
| `hero_image` | `ImageField(blank/null)` (Cloudinary-backed) | |
| `event_date` | `DateField(null/blank)` | |

**`AnniversaryReflection`**
| Field | Type | Purpose |
|---|---|---|
| `event` | `FK → AnniversaryEvent`, `on_delete=CASCADE`, `related_name='reflections'` | |
| `author_name` | `CharField(200)` | |
| `author_role` | `CharField(200, blank)` | |
| `author_photo` | `ImageField(blank/null)` (Cloudinary-backed) | |
| `quote_text` | `TextField` | |

No photo-tagging/face-annotation model and no visitor-submitted reflection/comment model exist anywhere in this app or any other — both are explicitly excluded from scope.

## 6. Endpoints

All paths are prefixed with `/api/v1/`. "Permission" is the DRF permission class enforced; `AllowAny` means the endpoint is intentionally public (it's how a Family Viewer obtains a viewer token, or an admin obtains an admin token, in the first place).

### `apps.authentication` — prefix `auth/`

| Method | Path | Permission | Request body | Response body | Description |
|---|---|---|---|---|---|
| POST | `validate-code/` | `AllowAny` | `{ "code": str }` | `{ "detail": str }` + `Set-Cookie: jmt_viewer_token` | Validates a plaintext access code; issues a viewer JWT as an HTTP-only cookie |
| POST | `admin/login/` | `AllowAny` | `{ "username": str, "password": str }` | `{ "detail": str, "username": str }` + `Set-Cookie: jmt_admin_token` | Validates Editor-in-Chief credentials; issues an admin JWT as an HTTP-only cookie |
| POST | `admin/logout/` | `IsPlatformAdmin` | — | `{ "detail": str }` | Clears the admin cookie |
| POST | `admin/access-codes/` | `IsPlatformAdmin` | `{ "label"?: str, "expires_in_days"?: int }` | `{ "id", "code", "label", "expires_at" }` | Generates a new access code; plaintext `code` is returned only here, once |
| POST | `admin/access-codes/{id}/deactivate/` | `IsPlatformAdmin` | — | `{ "detail": str }` | Immediately revokes an access code |

### `apps.family_tree` — prefix `family-tree/`

| Method | Path | Permission | Request body | Response body | Description |
|---|---|---|---|---|---|
| GET | `` | `IsFamilyViewer` | — | `[ { id, full_name, title, date_of_birth, date_of_death, is_deceased, profile_image, children: [...] } ]` | Full hierarchy as a nested `children` array per root node, shaped for D3.js |
| GET | `members/{id}/` | `IsFamilyViewer` | — | `{ id, parent, parent_name, full_name, title, dates, is_deceased, biography, profile_image, created_at, updated_at }` | Single member's bio-modal detail |

### `apps.gallery` — prefix `gallery/`

| Method | Path | Permission | Request body | Response body | Description |
|---|---|---|---|---|---|
| GET | `photos/?era={id}` | `IsFamilyViewer` | — | Paginated `[ { id, title, era, caption, thumbnail, uploaded_at } ]` | Published-only photo list, optionally filtered by era |
| GET | `photos/{id}/` | `IsFamilyViewer` | — | `{ id, title, era, members, caption, image_url, uploaded_at }` | Published-only lightbox detail |
| POST | `photos/bulk-upload/` | `IsPlatformAdmin` | multipart: `images` (multiple files), `era`? | `[ { id, title, era, members, status, image, preview_url, caption, uploaded_at } ]` | Creates one `Photo` per uploaded file, defaulting to `draft` |
| PATCH | `photos/{id}/status/` | `IsPlatformAdmin` | `{ "status": "draft" \| "published" }` | `{ "status": str }` | Publish/unpublish toggle |

### `apps.stories_library` — prefix `stories/`

| Method | Path | Permission | Request body | Response body | Description |
|---|---|---|---|---|---|
| GET | `?category={category}` | `IsFamilyViewer` | — | Paginated `[ { id, title, category, year_label, excerpt, cover_image, content_type, read_time_minutes, created_at } ]` | Published-only story list |
| GET | `{id}/` | `IsFamilyViewer` | — | `{ id, title, category, year_label, excerpt, body, cover_image, content_type, audio_url, read_time_minutes, created_at }` | Published-only full manuscript |
| GET/POST | `admin/` | `IsPlatformAdmin` | (POST) full `Story` fields | `Story` object(s), any status | Admin list (all statuses) / create |
| GET/PATCH | `admin/{id}/` | `IsPlatformAdmin` | (PATCH) any subset of `Story` fields | `Story` object | Admin edit, including draft/publish toggling |

### `apps.anniversary` — prefix `anniversary/`

| Method | Path | Permission | Request body | Response body | Description |
|---|---|---|---|---|---|
| GET | `events/` | `IsFamilyViewer` | — | `[ { id, title, description, hero_image, event_date, reflections: [ { id, author_name, author_role, author_photo, quote_text } ] } ]` | Read-only list of events with nested reflections |

### Root

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/admin/` | Django session auth (Unfold-skinned) | Editor-in-Chief's primary content management UI |
| GET | `/robots.txt` | `AllowAny` | `Disallow: /` for all crawlers |

## 7. Module relationships

- `apps.gallery.Photo.members` is a `ManyToManyField` → `apps.family_tree.FamilyMember` (`related_name='photos'`), so a family member's photo appearances are queryable via `member.photos.all()`.
- `apps.gallery.Photo.era` is a `ForeignKey` → `apps.gallery.Era` (same app).
- `apps.anniversary.AnniversaryReflection.event` is a `ForeignKey` → `apps.anniversary.AnniversaryEvent` (same app); `anniversary` has no dependency on any other app and nothing depends on it — it is currently fully standalone.
- `apps.stories_library.Story` has no foreign keys to any other app.
- `apps.authentication.AccessCode.created_by` is a `ForeignKey` → `apps.authentication.AdminUser` (same app).
- Every app depends on `apps.authentication.permissions` (`IsFamilyViewer`, `IsPlatformAdmin`) and, transitively, `apps.authentication.authentication.CookieJWTAuthentication` — this is the one cross-cutting dependency every app has on `authentication`.
- `apps.family_tree`, `apps.gallery`, `apps.stories_library` have no dependencies on each other beyond the `Photo.members` M2M noted above.

## 8. Cloudinary integration notes

- **Storage routing**: `config/settings/base.py` sets `STORAGES['default']` to `cloudinary_storage.storage.MediaCloudinaryStorage`. This means every `ImageField` across every app (`FamilyMember.profile_image`, `Photo.image`, `Story.cover_image`, `AnniversaryEvent.hero_image`, `AnniversaryReflection.author_photo`) automatically uploads to and serves from Cloudinary with zero per-model configuration — there is no S3/boto3/django-storages anywhere in this codebase.
- **Transformations**: implemented exclusively in `apps/gallery/cloudinary.py`, by appending Cloudinary transformation parameters to the stored image's URL via `cloudinary.CloudinaryImage(...).build_url(transformation=[...])` — no extra files are stored, no local resize/crop pipeline exists.
  - `thumbnail_url()` — 300×300 fill crop, **watermarked**, used in `PhotoListSerializer` (gallery grid).
  - `web_url()` — 1600px-limited, **watermarked**, used in `PhotoDetailSerializer` (lightbox).
  - `admin_preview_url()` — 300×300 fill crop, **not watermarked**, used in `PhotoAdminSerializer` so the Editor-in-Chief reviews drafts without the overlay.
  - The watermark step (`WATERMARK_OVERLAY` dict at the top of `cloudinary.py`) assumes a Cloudinary-hosted overlay asset has been uploaded under the public ID `"watermark"` — this must exist in the target Cloudinary account before these URLs will render correctly; adjust the overlay's public ID there if a different asset name is used.
  - Only `apps.gallery.Photo` has dedicated transformation helpers, since it's the only model the spec calls out for resizing/watermarking. `FamilyMember.profile_image`, `Story.cover_image`, and the `anniversary` image fields are served as their serializers' raw Cloudinary `.url` — building similar variant/watermark helpers for them is a straightforward future extension following the same pattern in `apps/gallery/cloudinary.py`.

## 9. Known stubs and deferred features

- **`Story.content_type` / `Story.audio_url`** — included now as a forward-compatible schema decision. No audio upload/processing pipeline exists. If `content_type='audio'`, the frontend must handle a missing or empty `audio_url` gracefully; this is deferred functionality, not a bug. *Remaining work*: an upload endpoint, audio storage/transcoding (likely via Celery + Cloudinary's video/audio support), and duration metadata.
- **`apps.anniversary`** — intentionally scaffolded minimally: models plus one read-only list endpoint, no admin-facing API endpoints (content is managed entirely through Django admin), no photo-tagging, no visitor-submitted reflections. *Remaining work*: the full user-facing flow is still being specified separately and will likely need its own pass.
- **Automated Google Drive backup system** — explicitly deferred; **not built in this pass**. No `backups` app, no `google-api-python-client` dependency, no backup management command exist anywhere in this codebase. *Remaining work*: an entire backup app/integration, to be added in a future prompt.

## 10. Environment variables

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django's cryptographic signing key |
| `DJANGO_SETTINGS_MODULE` | Which settings module to load (`config.settings.development` / `config.settings.production`) |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames allowed in production |
| `JWT_SIGNING_KEY` | Signing key for viewer/admin JWTs (kept distinct from `DJANGO_SECRET_KEY`) |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CELERY_BROKER_URL` | Redis broker URL for Celery |
| `CELERY_RESULT_BACKEND` | Redis result backend for Celery |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `INITIAL_ADMIN_USERNAME` | Username for the seeded Editor-in-Chief account (`manage.py seed_admin`) |
| `INITIAL_ADMIN_PASSWORD` | Password for the seeded Editor-in-Chief account |
| `INITIAL_ADMIN_EMAIL` | Email for the seeded Editor-in-Chief account (optional) |
