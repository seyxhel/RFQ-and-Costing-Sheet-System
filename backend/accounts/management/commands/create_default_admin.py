from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = "Create default accounts (idempotent)."

    def handle(self, *args, **options):
        defaults = [
            {
                "username": "admin",
                "password": "admin",
                "role": User.Role.MANAGEMENT,
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Admin",
                "last_name": "User",
            },
            {
                "username": "management",
                "password": "management",
                "role": User.Role.MANAGEMENT,
                "is_staff": False,
                "is_superuser": False,
                "first_name": "Management",
                "last_name": "User",
            },
            {
                "username": "sales",
                "password": "sales",
                "role": User.Role.SALES,
                "is_staff": False,
                "is_superuser": False,
                "first_name": "Sales",
                "last_name": "User",
            },
            {
                "username": "purchasing",
                "password": "purchasing",
                "role": User.Role.PURCHASING,
                "is_staff": False,
                "is_superuser": False,
                "first_name": "Purchasing",
                "last_name": "User",
            },
        ]

        for entry in defaults:
            username = entry.pop("username")
            password = entry.pop("password")
            user, created = User.objects.get_or_create(
                username=username, defaults=entry
            )
            if created:
                user.set_password(password)
                user.save(update_fields=["password"])
                self.stdout.write(self.style.SUCCESS(f"Created user: {username}"))
            else:
                self.stdout.write(f"User already exists: {username}")
