from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsFamilyViewer, IsPlatformAdmin

from .models import Story
from .serializers import (
    StoryAdminSerializer,
    StoryDetailSerializer,
    StoryListSerializer,
    StorySubmissionSerializer,
)


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


class StoryPublishView(APIView):
    """POST /api/v1/stories/admin/{id}/publish/

    Admin-only: an explicit publish action (rather than a generic status
    PATCH) that also stamps `published_at` at the moment of transition.
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        try:
            story = Story.objects.get(pk=pk)
        except Story.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        story.status = Story.Status.PUBLISHED
        story.published_at = timezone.now()
        story.save(update_fields=['status', 'published_at'])
        return Response(StoryAdminSerializer(story).data)


class StorySubmissionView(generics.CreateAPIView):
    """POST /api/v1/stories/submit/

    Any signed-in Family Viewer can submit a story of their own for the
    Editor-in-Chief to review. Always lands as `pending_review` —
    viewers cannot publish or save drafts directly.
    """

    serializer_class = StorySubmissionSerializer
    permission_classes = [IsFamilyViewer]

    def perform_create(self, serializer):
        serializer.save(status=Story.Status.PENDING_REVIEW)
