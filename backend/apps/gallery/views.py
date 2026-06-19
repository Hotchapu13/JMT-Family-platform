from rest_framework import generics
from rest_framework import status as http_status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsFamilyViewer, IsPlatformAdmin

from .models import Photo
from .serializers import (
    PhotoAdminSerializer,
    PhotoDetailSerializer,
    PhotoListSerializer,
    PhotoStatusUpdateSerializer,
)


class PhotoListView(generics.ListAPIView):
    """GET /api/v1/gallery/photos/?era={id}

    Viewer-facing list. The queryset is hard-filtered to status=published
    here — drafts must never reach this endpoint, enforced at the queryset
    level rather than relying on serializer field exposure.
    """

    serializer_class = PhotoListSerializer
    permission_classes = [IsFamilyViewer]

    def get_queryset(self):
        queryset = Photo.objects.filter(status=Photo.Status.PUBLISHED).select_related('era')
        era_id = self.request.query_params.get('era')
        if era_id:
            queryset = queryset.filter(era_id=era_id)
        return queryset


class PhotoDetailView(generics.RetrieveAPIView):
    """GET /api/v1/gallery/photos/{id}/

    Viewer-facing lightbox detail. Same published-only queryset guard as
    the list view — a draft photo's ID is never resolvable here either.
    """

    serializer_class = PhotoDetailSerializer
    permission_classes = [IsFamilyViewer]

    def get_queryset(self):
        return Photo.objects.filter(status=Photo.Status.PUBLISHED).select_related('era')


class PhotoBulkUploadView(APIView):
    """POST /api/v1/gallery/photos/bulk-upload/

    Admin-only. Accepts multiple files in a single multipart request under
    the `images` field (optionally with an `era` id applied to all of them)
    and creates one Photo per file, each defaulting to `draft` status.
    """

    permission_classes = [IsPlatformAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        files = request.FILES.getlist('images')
        if not files:
            return Response(
                {'detail': 'No files provided under the "images" field.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        era_id = request.data.get('era') or None
        created = [Photo.objects.create(image=f, era_id=era_id) for f in files]

        serializer = PhotoAdminSerializer(created, many=True)
        return Response(serializer.data, status=http_status.HTTP_201_CREATED)


class PhotoStatusUpdateView(generics.UpdateAPIView):
    """PATCH /api/v1/gallery/photos/{id}/status/

    Admin-only. Toggles a photo between draft and published.
    """

    queryset = Photo.objects.all()
    serializer_class = PhotoStatusUpdateSerializer
    permission_classes = [IsPlatformAdmin]
    http_method_names = ['patch']
