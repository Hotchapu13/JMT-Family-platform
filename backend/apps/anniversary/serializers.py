from rest_framework import serializers

from .models import AnniversaryEvent, AnniversaryReflection


class AnniversaryReflectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnniversaryReflection
        fields = ['id', 'author_name', 'author_role', 'author_photo', 'quote_text']


class AnniversaryEventSerializer(serializers.ModelSerializer):
    reflections = AnniversaryReflectionSerializer(many=True, read_only=True)

    class Meta:
        model = AnniversaryEvent
        fields = ['id', 'title', 'description', 'hero_image', 'event_date', 'reflections']
