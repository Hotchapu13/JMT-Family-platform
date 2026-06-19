import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'Creates the initial Editor-in-Chief admin account for '
        'Dr. Muhumuza Ibra, if it does not already exist. Reads credentials '
        'from INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD / '
        'INITIAL_ADMIN_EMAIL environment variables.'
    )

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('INITIAL_ADMIN_USERNAME', 'muhumuza.ibra')
        password = os.environ.get('INITIAL_ADMIN_PASSWORD')

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Admin user "{username}" already exists — skipping.')
            )
            return

        if not password:
            self.stdout.write(
                self.style.ERROR(
                    'Set INITIAL_ADMIN_PASSWORD in the environment before running this command.'
                )
            )
            return

        User.objects.create_superuser(
            username=username,
            email=os.environ.get('INITIAL_ADMIN_EMAIL', ''),
            password=password,
            first_name='Muhumuza',
            last_name='Ibra',
        )
        self.stdout.write(
            self.style.SUCCESS(f'Created Editor-in-Chief admin account "{username}".')
        )
