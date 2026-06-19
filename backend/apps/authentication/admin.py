from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from unfold.admin import ModelAdmin

from .models import AccessCode, AdminUser


@admin.register(AdminUser)
class AdminUserAdmin(UserAdmin, ModelAdmin):
    pass


@admin.register(AccessCode)
class AccessCodeAdmin(ModelAdmin):
    list_display = ('label', 'is_active', 'created_at', 'expires_at', 'created_by')
    list_filter = ('is_active',)
    search_fields = ('label',)
    readonly_fields = ('code_hash', 'created_at')
