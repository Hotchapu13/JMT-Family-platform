from django.core.exceptions import ValidationError
from django.db import models


class FamilyMember(models.Model):
    father = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='fathered_children'
    )
    mother = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='mothered_children'
    )
    spouse = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='spouse_of'
    )
    joined_by_marriage = models.BooleanField(default=False)
    full_name = models.CharField(max_length=200)
    title = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    date_of_death = models.DateField(null=True, blank=True)
    biography = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to='profiles/')  # Cloudinary-backed storage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']
        verbose_name = 'Family Member'
        verbose_name_plural = 'Family Members'

    def __str__(self):
        return self.full_name

    @property
    def is_deceased(self):
        return self.date_of_death is not None

    def clean(self):
        super().clean()
        if self.father_id is not None and self.father_id == self.id:
            raise ValidationError({'father': 'A member cannot be their own father.'})
        if self.mother_id is not None and self.mother_id == self.id:
            raise ValidationError({'mother': 'A member cannot be their own mother.'})
        if self.spouse_id is not None and self.spouse_id == self.id:
            raise ValidationError({'spouse': 'A member cannot be their own spouse.'})
