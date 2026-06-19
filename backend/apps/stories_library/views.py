from rest_framework import generics

from apps.authentication.permissions import IsFamilyViewer, IsPlatformAdmin

from .models import Story
from .serializers import StoryAdminSerializer, StoryDetailSerializer, StoryListSerializer


class StoryListView(generics.ListAPIView):
    """GET /api/v1/stories/?category={category}

    Viewer-facing list. Drafts are excluded at the queryset level.
    """

    serializer_class = StoryListSerializer
    permission_classes = [IsFamilyViewer]

    def get_queryset(self):
        queryset = Story.objects.filter(status=Story.Status.PUBLISHED)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class StoryDetailView(generics.RetrieveAPIView):
    """GET /api/v1/stories/{id}/

    Viewer-facing full manuscript detail. Same published-only guard.
    """

    serializer_class = StoryDetailSerializer
    permission_classes = [IsFamilyViewer]

    def get_queryset(self):
        return Story.objects.filter(status=Story.Status.PUBLISHED)


class StoryAdminListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/stories/admin/

    Admin-only content management: list every story regardless of status,
    or create a new one (defaults to draft).
    """

    queryset = Story.objects.all()
    serializer_class = StoryAdminSerializer
    permission_classes = [IsPlatformAdmin]


class StoryAdminDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/stories/admin/{id}/

    Admin-only: edit content and toggle draft/publish status.
    """

    queryset = Story.objects.all()
    serializer_class = StoryAdminSerializer
    permission_classes = [IsPlatformAdmin]
