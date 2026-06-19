from django.db import models


class Story(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

    class ContentType(models.TextChoices):
        TEXT = 'text', 'Text'
        AUDIO = 'audio', 'Audio'

    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100, blank=True)  # e.g. "Migration Era", "Early Beginnings"
    year_label = models.CharField(max_length=50, blank=True)  # display string, e.g. "1942"
    excerpt = models.TextField(blank=True)
    body = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='stories/', blank=True, null=True)
    content_type = models.CharField(max_length=10, choices=ContentType.choices, default=ContentType.TEXT)
    # `audio_url` and `content_type` are a forward-compatible schema stub —
    # no audio upload/processing pipeline is built in this pass. If
    # content_type='audio', the frontend is expected to handle a missing or
    # empty audio_url gracefully; this is deferred functionality, not a bug.
    audio_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    read_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Story'
        verbose_name_plural = 'Stories'

    def __str__(self):
        return self.title
