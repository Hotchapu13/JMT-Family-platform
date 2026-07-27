from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import FamilyMember


@admin.register(FamilyMember)
class FamilyMemberAdmin(ModelAdmin):
    list_display = (
        'full_name', 'title', 'father', 'mother', 'spouse', 'joined_by_marriage',
        'date_of_birth', 'date_of_death',
    )
    list_filter = ('title', 'joined_by_marriage')
    search_fields = ('full_name', 'biography')
    autocomplete_fields = ('father', 'mother', 'spouse')
