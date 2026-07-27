from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.permissions import IsFamilyViewer, IsPlatformAdmin

from .models import FamilyMember
from .serializers import FamilyMemberAdminSerializer, FamilyMemberDetailSerializer
from .services import build_family_graph


class FamilyTreeView(APIView):
    """GET /api/v1/family-tree/

    Returns the full family graph: members, unions (parent-pair groupings
    of children), and spouse links.
    """

    permission_classes = [IsFamilyViewer]

    def get(self, request):
        return Response(build_family_graph())


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
    the member is still referenced as a father, mother, or spouse
    elsewhere in the tree — reassign those references first, so the tree
    never silently loses a branch or a marriage link.
    """

    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberAdminSerializer
    permission_classes = [IsPlatformAdmin]

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        if (
            member.fathered_children.exists()
            or member.mothered_children.exists()
            or member.spouse_of.exists()
        ):
            return Response(
                {
                    'detail': (
                        'Reassign or delete this member\'s children, or clear the spouse '
                        'link, before deleting them.'
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)
