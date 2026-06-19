from django.db import models


class AnniversaryEvent(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    hero_image = models.ImageField(upload_to='anniversary/', blank=True, null=True)
    event_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-event_date']
        verbose_name = 'Anniversary Event'
        verbose_name_plural = 'Anniversary Events'

    def __str__(self):
        return self.title


class AnniversaryReflection(models.Model):
    event = models.ForeignKey(AnniversaryEvent, on_delete=models.CASCADE, related_name='reflections')
    author_name = models.CharField(max_length=200)
    author_role = models.CharField(max_length=200, blank=True)
    author_photo = models.ImageField(upload_to='anniversary/reflections/', blank=True, null=True)
    quote_text = models.TextField()

    class Meta:
        verbose_name = 'Anniversary Reflection'
        verbose_name_plural = 'Anniversary Reflections'

    def __str__(self):
        return f'{self.author_name} on {self.event}'
