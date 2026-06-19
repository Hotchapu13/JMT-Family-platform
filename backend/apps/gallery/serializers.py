from rest_framework import serializers

from .cloudinary import admin_preview_url, thumbnail_url, web_url
from .models import Era, Photo


class EraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Era
        fields = ['id', 'name', 'display_order']


class PhotoListSerializer(serializers.ModelSerializer):
    """Viewer-facing list shape — `thumbnail` is always the watermarked
    Cloudinary transformation, never the raw original (see cloudinary.py)."""

    era = EraSerializer(read_only=True)
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'title', 'era', 'caption', 'thumbnail', 'uploaded_at']

    def get_thumbnail(self, obj):
        return thumbnail_url(obj.image)


class PhotoDetailSerializer(serializers.ModelSerializer):
    """Viewer-facing lightbox shape — larger, still-watermarked image."""

    era = EraSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    members = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Photo
        fields = ['id', 'title', 'era', 'members', 'caption', 'image_url', 'uploaded_at']

    def get_image_url(self, obj):
        return web_url(obj.image)


class PhotoAdminSerializer(serializers.ModelSerializer):
    """Admin-facing shape returned from bulk upload — includes status and
    an unwatermarked preview for reviewing drafts."""

    preview_url = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            'id', 'title', 'era', 'members', 'status', 'image', 'preview_url',
            'caption', 'uploaded_at',
        ]
        read_only_fields = ['uploaded_at']

    def get_preview_url(self, obj):
        return admin_preview_url(obj.image)


class PhotoStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = ['status']
