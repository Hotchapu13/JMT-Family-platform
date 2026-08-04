from django.db import migrations, models


def copy_parent_to_father(apps, schema_editor):
    """The old single `parent` field carried no gender information, so we
    assume every existing parent link was a father. Any that were actually
    mothers should be corrected by hand (or via the admin) after this
    migration runs.
    """
    FamilyMember = apps.get_model('family_tree', 'FamilyMember')
    FamilyMember.objects.exclude(parent__isnull=True).update(father=models.F('parent'))


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('family_tree', '0002_father_mother_spouse'),
    ]

    operations = [
        migrations.RunPython(copy_parent_to_father, noop_reverse),
    ]
