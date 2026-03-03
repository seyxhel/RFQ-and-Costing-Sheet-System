# ============================================================================
# accounts/models.py — Custom User model with role-based access control
# ============================================================================
# - Extends AbstractUser for easy customization
# - Roles: ADMIN, MANAGER, PROCUREMENT, FINANCE, VIEWER
# - Department field for organizational grouping
# - Compatible with both SQLite and PostgreSQL
# ============================================================================

from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
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


class Attachment(models.Model):
    """Generic file attachment for any module."""

    file = models.FileField(upload_to="attachments/%Y/%m/")
    filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0, help_text="Bytes")
    description = models.CharField(max_length=500, blank=True, default="")

    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE,
    )
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    uploaded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return self.filename

    def save(self, *args, **kwargs):
        if self.file and not self.filename:
            self.filename = self.file.name.split("/")[-1]
        if self.file and not self.file_size:
            try:
                self.file_size = self.file.size
            except (OSError, AttributeError):
                pass
        super().save(*args, **kwargs)
