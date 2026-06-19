from rest_framework import serializers

from .models import FamilyMember


class FamilyMemberNodeSerializer(serializers.ModelSerializer):
    """Single-node shape used inside the recursive tree response.

    `children` is threaded in by the tree-building service (services.py),
    not by this serializer — a recursive nested serializer would issue one
    query per node, while the service builds the whole tree from a single
    query and attaches `children` afterward.
    """

    is_deceased = serializers.ReadOnlyField()

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'full_name',
            'title',
            'date_of_birth',
            'date_of_death',
            'is_deceased',
            'profile_image',
        ]


class FamilyMemberDetailSerializer(serializers.ModelSerializer):
    """Full bio-modal payload for a single family member."""

    is_deceased = serializers.ReadOnlyField()
    parent_name = serializers.CharField(
        source='parent.full_name', read_only=True, default=None
    )

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'parent',
            'parent_name',
            'full_name',
            'title',
            'date_of_birth',
            'date_of_death',
            'is_deceased',
            'biography',
            'profile_image',
            'created_at',
            'updated_at',
        ]
