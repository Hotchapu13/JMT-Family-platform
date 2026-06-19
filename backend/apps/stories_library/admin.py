from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Story


@admin.register(Story)
class StoryAdmin(ModelAdmin):
    list_display = ('title', 'category', 'year_label', 'content_type', 'status', 'created_at')
    list_filter = ('status', 'content_type', 'category')
    search_fields = ('title', 'excerpt', 'body')
