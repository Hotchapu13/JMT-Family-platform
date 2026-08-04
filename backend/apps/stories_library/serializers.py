from rest_framework import serializers

from .models import Story


class StoryListSerializer(serializers.ModelSerializer):
    """Viewer-facing list shape — excerpt only, not the full manuscript body."""

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'category', 'year_label', 'excerpt', 'cover_image',
            'content_type', 'read_time_minutes', 'created_at',
        ]


class StoryDetailSerializer(serializers.ModelSerializer):
    """Viewer-facing full manuscript detail, including the stubbed audio fields."""

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'category', 'year_label', 'excerpt', 'body',
            'cover_image', 'content_type', 'audio_url', 'read_time_minutes',
            'created_at',
        ]


class StoryAdminSerializer(serializers.ModelSerializer):
    """Admin-facing create/update shape, including draft/publish status."""

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'category', 'year_label', 'excerpt', 'body',
            'cover_image', 'content_type', 'audio_url', 'status',
            'read_time_minutes', 'submitted_by', 'created_at', 'published_at',
        ]
        read_only_fields = ['created_at', 'published_at']


class StorySubmissionSerializer(serializers.ModelSerializer):
    """Viewer-facing submission shape — a Family Viewer proposing a story
    for the Editor-in-Chief to review. `status` is always forced to
    `pending_review` server-side; viewers cannot set it themselves.
    """

    class Meta:
        model = Story
        fields = [
            'id', 'title', 'category', 'year_label', 'excerpt', 'body',
            'cover_image', 'submitted_by',
        ]
