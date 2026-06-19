from django.db import models


class Era(models.Model):
    name = models.CharField(max_length=100)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'Era'
        verbose_name_plural = 'Eras'

    def __str__(self):
        return self.name


class Photo(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

    title = models.CharField(max_length=200, blank=True)
    era = models.ForeignKey(Era, on_delete=models.SET_NULL, null=True, related_name='photos')
    members = models.ManyToManyField(
        'family_tree.FamilyMember', blank=True, related_name='photos'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    image = models.ImageField(upload_to='gallery/')  # Cloudinary-backed
    caption = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Photo'
        verbose_name_plural = 'Photos'

    def __str__(self):
        return self.title or f'Photo #{self.pk}'
