from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('family_tree', '0003_copy_parent_to_father'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='familymember',
            name='parent',
        ),
    ]
