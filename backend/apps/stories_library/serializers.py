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
            'read_time_minutes', 'created_at',
        ]
        read_only_fields = ['created_at']
