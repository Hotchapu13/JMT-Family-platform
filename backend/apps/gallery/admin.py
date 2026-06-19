from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Era, Photo


@admin.register(Era)
class EraAdmin(ModelAdmin):
    list_display = ('name', 'display_order')
    search_fields = ('name',)


@admin.register(Photo)
class PhotoAdmin(ModelAdmin):
    list_display = ('title', 'era', 'status', 'uploaded_at')
    list_filter = ('status', 'era')
    search_fields = ('title', 'caption')
    filter_horizontal = ('members',)
