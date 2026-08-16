from rest_framework import serializers

from .models import FamilyMember


class FamilyMemberNodeSerializer(serializers.ModelSerializer):
    """Single-node shape used inside the graph-shaped tree response.

    Union/spouse grouping is done by the tree-building service
    (services.py), not by this serializer.
    """

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'father',
            'mother',
            'spouse',
            'joined_by_marriage',
            'full_name',
            'title',
            'date_of_birth',
            'date_of_death',
            'is_deceased',
            'profile_image',
        ]


class FamilyMemberAdminSerializer(serializers.ModelSerializer):
    """Admin-facing create/update/delete shape for CRUD management."""

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'father',
            'mother',
            'spouse',
            'joined_by_marriage',
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
        read_only_fields = ['created_at', 'updated_at']


class FamilyMemberDetailSerializer(serializers.ModelSerializer):
    """Full bio-modal payload for a single family member."""

    father_name = serializers.CharField(
        source='father.full_name', read_only=True, default=None
    )
    mother_name = serializers.CharField(
        source='mother.full_name', read_only=True, default=None
    )
    spouse_name = serializers.CharField(
        source='spouse.full_name', read_only=True, default=None
    )

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'father',
            'father_name',
            'mother',
            'mother_name',
            'spouse',
            'spouse_name',
            'joined_by_marriage',
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
