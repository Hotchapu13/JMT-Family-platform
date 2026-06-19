from rest_framework import generics

from apps.authentication.permissions import IsFamilyViewer

from .models import AnniversaryEvent
from .serializers import AnniversaryEventSerializer


class AnniversaryEventListView(generics.ListAPIView):
    """GET /api/v1/anniversary/events/

    Minimal, read-only endpoint — the full user flow for this domain is
    still being specified separately, so this app is intentionally not
    built out further than this list view.
    """

    queryset = AnniversaryEvent.objects.prefetch_related('reflections')
    serializer_class = AnniversaryEventSerializer
    permission_classes = [IsFamilyViewer]
