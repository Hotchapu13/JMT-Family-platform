from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME', default='jmt_legacy_dev'),
        'USER': env('DB_USER', default='jmt_dev'),
        'PASSWORD': env('DB_PASSWORD', default='jmt_dev'),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='5432'),
    }
}

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])

# Cookies don't require HTTPS in local development.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
AUTH_COOKIE_SECURE = False
