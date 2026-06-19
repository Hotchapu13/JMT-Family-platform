from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import FamilyMember


@admin.register(FamilyMember)
class FamilyMemberAdmin(ModelAdmin):
    list_display = ('full_name', 'title', 'parent', 'date_of_birth', 'date_of_death')
    list_filter = ('title',)
    search_fields = ('full_name', 'biography')
    autocomplete_fields = ('parent',)
