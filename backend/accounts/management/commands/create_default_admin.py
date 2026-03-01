"""
Management command: create_default_admin
Creates an ADMIN superuser if one doesn't exist yet.
Uses env vars DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_PASSWORD, DJANGO_SUPERUSER_EMAIL.
"""
import os
from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = "Create a default admin superuser from environment variables (if not exists)"

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")

        if not password:
            self.stdout.write(self.style.WARNING("DJANGO_SUPERUSER_PASSWORD not set — skipping admin creation."))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.SUCCESS(f"Admin user '{username}' already exists."))
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role="ADMIN",
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin user '{username}'."))
