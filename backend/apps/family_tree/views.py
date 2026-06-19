from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsFamilyViewer

from .models import FamilyMember
from .serializers import FamilyMemberDetailSerializer
from .services import build_family_tree


class FamilyTreeView(APIView):
    """GET /api/v1/family-tree/

    Returns the full family hierarchy as a nested `children` array per
    node, shaped for direct consumption by a D3.js frontend.
    """

    permission_classes = [IsFamilyViewer]

    def get(self, request):
        return Response(build_family_tree())


class FamilyMemberDetailView(generics.RetrieveAPIView):
    """GET /api/v1/family-tree/members/{id}/

    Full bio-modal payload for a single family member.
    """

    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberDetailSerializer
    permission_classes = [IsFamilyViewer]
