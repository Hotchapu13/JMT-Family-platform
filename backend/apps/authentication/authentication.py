"""
Custom DRF authentication backend for the platform's two JWT gateways.

Both viewer and admin tokens are read exclusively from HTTP-only cookies —
never from the Authorization header — per the project's auth model. See
ARCHITECTURE.md for the full two-gateway diagram.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


class ViewerUser:
    """Stand-in for `request.user` when a valid viewer-scoped JWT is presented.

    Family Viewers share one access code and are never persisted as rows in
    any user table, so there is no model to attach here — just enough of the
    User-like interface for DRF and permission checks to work against.
    """

    is_authenticated = True
    is_anonymous = False
    is_staff = False
    is_viewer = True
    pk = None
    id = None

    def __str__(self):
        return 'FamilyViewer'


class CookieJWTAuthentication(BaseAuthentication):
    """Authenticates requests using the admin or viewer cookie, in that order.

    Returns `(user, validated_token)` on success so permission classes can
    inspect the token's `scope` claim via `request.auth`.
    """

    def authenticate(self, request):
        admin_raw = request.COOKIES.get(settings.ADMIN_AUTH_COOKIE_NAME)
        if admin_raw:
            return self._authenticate_admin(admin_raw)

        viewer_raw = request.COOKIES.get(settings.AUTH_COOKIE_NAME)
        if viewer_raw:
            return self._authenticate_viewer(viewer_raw)

        return None

    def _authenticate_admin(self, raw_token):
        token = self._decode(raw_token)
        if token.get('scope') != 'admin':
            raise AuthenticationFailed('Invalid token scope for admin cookie.')

        User = get_user_model()
        try:
            user = User.objects.get(pk=token['user_id'], is_active=True)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed('Admin user not found or inactive.') from exc

        return (user, token)

    def _authenticate_viewer(self, raw_token):
        token = self._decode(raw_token)
        if token.get('scope') != 'viewer':
            raise AuthenticationFailed('Invalid token scope for viewer cookie.')

        return (ViewerUser(), token)

    @staticmethod
    def _decode(raw_token):
        try:
            return AccessToken(raw_token)
        except TokenError as exc:
            raise AuthenticationFailed(str(exc)) from exc
