from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccessCode
from .permissions import IsPlatformAdmin
from .serializers import (
    AdminLoginSerializer,
    GenerateAccessCodeSerializer,
    ValidateCodeSerializer,
)
from .tokens import issue_admin_token, issue_viewer_token


class ValidateCodeView(APIView):
    """POST /api/v1/auth/validate-code/

    Accepts a plaintext family access code. On success, issues a viewer-
    scoped JWT as an HTTP-only cookie — never in the JSON response body.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ValidateCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plaintext_code = serializer.validated_data['code']

        code_hash = AccessCode.hash_code(plaintext_code)
        try:
            access_code = AccessCode.objects.get(code_hash=code_hash)
        except AccessCode.DoesNotExist:
            return Response(
                {'detail': 'Invalid access code.'}, status=status.HTTP_401_UNAUTHORIZED
            )

        if not access_code.is_valid():
            return Response(
                {'detail': 'This access code has expired or been deactivated.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token = issue_viewer_token()
        response = Response({'detail': 'Access granted.'}, status=status.HTTP_200_OK)
        response.set_cookie(
            settings.AUTH_COOKIE_NAME,
            str(token),
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Lax',
            max_age=int(settings.VIEWER_TOKEN_LIFETIME.total_seconds()),
        )
        return response


class AdminLoginView(APIView):
    """POST /api/v1/auth/admin/login/

    Validates the Editor-in-Chief's username/password and issues a longer-
    lived admin-scoped JWT as an HTTP-only cookie.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )
        if user is None or not user.is_active:
            return Response(
                {'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED
            )

        token = issue_admin_token(user)
        response = Response(
            {'detail': 'Login successful.', 'username': user.username},
            status=status.HTTP_200_OK,
        )
        response.set_cookie(
            settings.ADMIN_AUTH_COOKIE_NAME,
            str(token),
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Lax',
            max_age=int(settings.ADMIN_TOKEN_LIFETIME.total_seconds()),
        )
        return response


class AdminLogoutView(APIView):
    """POST /api/v1/auth/admin/logout/"""

    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        response = Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)
        response.delete_cookie(settings.ADMIN_AUTH_COOKIE_NAME)
        return response


class GenerateAccessCodeView(APIView):
    """POST /api/v1/auth/admin/access-codes/

    Admin-only endpoint to generate (rotate) a new Family Viewer access
    code. The plaintext code is returned exactly once, in this response —
    it cannot be recovered afterward since only its hash is persisted.
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        serializer = GenerateAccessCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        expires_at = timezone.now() + timedelta(
            days=serializer.validated_data['expires_in_days']
        )
        access_code, plaintext_code = AccessCode.generate(
            created_by=request.user,
            expires_at=expires_at,
            label=serializer.validated_data.get('label', ''),
        )
        return Response(
            {
                'id': access_code.id,
                'code': plaintext_code,
                'label': access_code.label,
                'expires_at': access_code.expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


class DeactivateAccessCodeView(APIView):
    """POST /api/v1/auth/admin/access-codes/{id}/deactivate/

    Admin-only endpoint to immediately revoke an existing access code.
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        try:
            access_code = AccessCode.objects.get(pk=pk)
        except AccessCode.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        access_code.is_active = False
        access_code.save(update_fields=['is_active'])
        return Response({'detail': 'Access code deactivated.'})
