"""
The two custom permission classes that gate every view in the platform.

Apply these explicitly per-view, never rely on a default: read endpoints get
IsFamilyViewer, write/mutate endpoints get IsPlatformAdmin. This is the
security backbone of the whole app — see ARCHITECTURE.md for the full
auth-flow diagram.
"""
from rest_framework.permissions import BasePermission


class IsFamilyViewer(BasePermission):
    """Valid, unexpired viewer JWT required.

    Admin-scoped tokens also satisfy this permission, since the
    Editor-in-Chief needs to browse the same read endpoints Family Viewers
    use without separately entering an access code.
    """

    message = 'A valid family access code is required.'

    def has_permission(self, request, view):
        token = getattr(request, 'auth', None)
        if token is None:
            return False
        return token.get('scope') in ('viewer', 'admin')


class IsPlatformAdmin(BasePermission):
    """Valid admin JWT required (named to avoid clashing with DRF's own
    `IsAdminUser`, which checks `user.is_staff` rather than our JWT scope).
    """

    message = 'Editor-in-Chief credentials are required.'

    def has_permission(self, request, view):
        token = getattr(request, 'auth', None)
        if token is None:
            return False
        return token.get('scope') == 'admin' and bool(
            request.user and request.user.is_authenticated
        )
