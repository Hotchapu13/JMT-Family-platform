from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsFamilyViewer, IsPlatformAdmin

from .models import FamilyMember
from .serializers import FamilyMemberAdminSerializer, FamilyMemberDetailSerializer
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


class FamilyMemberAdminListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/family-tree/admin/members/

    Admin-only content management: list every family member, or create a
    new one (multipart, for the profile_image upload).
    """

    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberAdminSerializer
    permission_classes = [IsPlatformAdmin]


class FamilyMemberAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/family-tree/admin/members/{id}/

    Admin-only: edit or remove a family member. Deletion is blocked while
    the member still has children in the tree — reparent or delete the
    children first, so the tree never silently loses a branch.
    """

    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberAdminSerializer
    permission_classes = [IsPlatformAdmin]

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        if member.children.exists():
            return Response(
                {'detail': 'Reassign or delete this member\'s children before deleting them.'},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)
