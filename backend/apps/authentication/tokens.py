"""
Issues the two distinct JWT scopes used across the platform.

Viewer tokens are not tied to any Django user row — Family Viewers share a
single access code and have no individual identity — so a viewer token is
built from a bare AccessToken with no `user_id` claim. Admin tokens are tied
to a real AdminUser row via `user_id`, exactly like a normal SimpleJWT token.

Both carry a `scope` claim ('viewer' or 'admin') that CookieJWTAuthentication
and the IsFamilyViewer / IsPlatformAdmin permission classes check.
"""
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken


def issue_viewer_token():
    token = AccessToken()
    token.set_exp(lifetime=settings.VIEWER_TOKEN_LIFETIME)
    token['scope'] = 'viewer'
    return token


def issue_admin_token(user):
    token = AccessToken()
    token.set_exp(lifetime=settings.ADMIN_TOKEN_LIFETIME)
    token['scope'] = 'admin'
    token['user_id'] = user.id
    token['username'] = user.username
    return token
