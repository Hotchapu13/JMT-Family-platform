"""
Shared settings for the JMT Legacy Platform backend.

Environment-specific overrides (DATABASES, DEBUG, ALLOWED_HOSTS, storage
config) live in development.py and production.py.
"""
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(str(BASE_DIR / '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY', default='insecure-dev-key-do-not-use-in-production')

DEBUG = False

ALLOWED_HOSTS = []

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

UNFOLD_APPS = [
    'unfold',
    'unfold.contrib.filters',
]

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'cloudinary_storage',
    'cloudinary',
]

LOCAL_APPS = [
    'apps.authentication',
    'apps.family_tree',
    'apps.gallery',
    'apps.stories_library',
    'apps.anniversary',
]

INSTALLED_APPS = UNFOLD_APPS + DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = 'authentication.AdminUser'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Ensures every response (API + admin) is blocked from search indexing,
    # since this is a private family archive that must never be crawled.
    'apps.authentication.middleware.NoIndexMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Cloudinary — every ImageField across the project routes through Cloudinary
# automatically via this STORAGES setting, with no per-model configuration.
# ---------------------------------------------------------------------------

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': env('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': env('CLOUDINARY_API_SECRET', default=''),
}

STORAGES = {
    'default': {
        'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.authentication.authentication.CookieJWTAuthentication',
    ),
    # No default permission class: every view explicitly sets IsFamilyViewer
    # or IsPlatformAdmin (see apps/authentication/permissions.py) so the
    # required scope is always visible at the call site, not implied.
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 24,
}

# ---------------------------------------------------------------------------
# SimpleJWT
#
# Two distinct token "scopes" are layered on top of SimpleJWT: viewer tokens
# (short-lived, issued to Family Viewers who enter a valid access code) and
# admin tokens (longer-lived, issued to the Editor-in-Chief via username/
# password). Both are signed with the same SIGNING_KEY but carry a custom
# "scope" claim that the two permission classes check independently. See
# apps/authentication/permissions.py and apps/authentication/views.py.
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=4),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SIGNING_KEY', default=SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# Viewer tokens are intentionally much shorter-lived than admin tokens since
# they protect a publicly-reachable "front door" guarded only by a shared code.
VIEWER_TOKEN_LIFETIME = timedelta(hours=12)
ADMIN_TOKEN_LIFETIME = timedelta(days=1)

AUTH_COOKIE_NAME = 'jmt_viewer_token'
ADMIN_AUTH_COOKIE_NAME = 'jmt_admin_token'

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------

CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# ---------------------------------------------------------------------------
# django-unfold — admin skin for the Editor-in-Chief
# ---------------------------------------------------------------------------

UNFOLD = {
    'SITE_TITLE': 'JMT Legacy Platform',
    'SITE_HEADER': 'JMT Legacy Platform',
    'SITE_SYMBOL': 'history_edu',
    'SHOW_HISTORY': True,
}
