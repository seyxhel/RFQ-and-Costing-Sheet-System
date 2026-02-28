# ============================================================================
# accounts/models.py — Custom User model with role-based access control
# ============================================================================
# - Extends AbstractUser for easy customization
# - Roles: ADMIN, MANAGER, PROCUREMENT, FINANCE, VIEWER
# - Department field for organizational grouping
# - Compatible with both SQLite and PostgreSQL
# ============================================================================

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model with RBAC roles.
    Django's default password hashing (PBKDF2) is used automatically.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        MANAGER = "MANAGER", "Manager"
        PROCUREMENT = "PROCUREMENT", "Procurement Officer"
        FINANCE = "FINANCE", "Finance Officer"
        VIEWER = "VIEWER", "Viewer (Read-Only)"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        help_text="Determines permissions across RFQ and Costing modules.",
    )
    department = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        ordering = ["username"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    # ----- Convenience permission helpers -----

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN

    @property
    def is_manager_role(self):
        return self.role in (self.Role.ADMIN, self.Role.MANAGER)

    @property
    def can_approve(self):
        """Only admins and managers can approve RFQs / costing sheets."""
        return self.role in (self.Role.ADMIN, self.Role.MANAGER)

    @property
    def can_edit_financial(self):
        """Finance officers, managers, and admins can edit financial data."""
        return self.role in (self.Role.ADMIN, self.Role.MANAGER, self.Role.FINANCE)
