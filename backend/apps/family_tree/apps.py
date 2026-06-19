from django.apps import AppConfig


class FamilyTreeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.family_tree'
    label = 'family_tree'
    verbose_name = 'Family Tree'
