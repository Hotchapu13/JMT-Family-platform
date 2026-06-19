from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import AnniversaryEvent, AnniversaryReflection


class AnniversaryReflectionInline(admin.TabularInline):
    model = AnniversaryReflection
    extra = 1


@admin.register(AnniversaryEvent)
class AnniversaryEventAdmin(ModelAdmin):
    list_display = ('title', 'event_date')
    search_fields = ('title', 'description')
    inlines = [AnniversaryReflectionInline]


@admin.register(AnniversaryReflection)
class AnniversaryReflectionAdmin(ModelAdmin):
    list_display = ('author_name', 'author_role', 'event')
    list_filter = ('event',)
    search_fields = ('author_name', 'quote_text')
