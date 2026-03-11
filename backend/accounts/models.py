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
        MANAGEMENT = "MANAGEMENT", "Management"
        SALES = "SALES", "Sales"
        PURCHASING = "PURCHASING", "Purchasing"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.SALES,
        help_text="Determines permissions across all modules.",
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
        return self.role == self.Role.MANAGEMENT

    @property
    def is_manager_role(self):
        return self.role == self.Role.MANAGEMENT

    @property
    def can_approve(self):
        """Only management can approve RFQs / costing sheets."""
        return self.role == self.Role.MANAGEMENT

    @property
    def can_edit_financial(self):
        """Management can edit financial data."""
        return self.role == self.Role.MANAGEMENT


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


# --------------------------------------------------------------------------
# System-Wide Audit Log
# --------------------------------------------------------------------------
class AuditLog(models.Model):
    """
    Records every significant action across all modules.
    """

    class Module(models.TextChoices):
        ACCOUNTS = "ACCOUNTS", "Accounts"
        PRODUCTS = "PRODUCTS", "Products"
        RFQ = "RFQ", "RFQ"
        COSTING = "COSTING", "Costing"
        SALES = "SALES", "Sales"
        BUDGET = "BUDGET", "Budget"
        PROCUREMENT = "PROCUREMENT", "Procurement"
        SETTINGS = "SETTINGS", "Settings"

    class ActionType(models.TextChoices):
        CREATE = "CREATE", "Created"
        UPDATE = "UPDATE", "Updated"
        DELETE = "DELETE", "Deleted"
        STATUS_CHANGE = "STATUS_CHANGE", "Status Changed"
        SUBMIT = "SUBMIT", "Submitted"
        APPROVE = "APPROVE", "Approved"
        REJECT = "REJECT", "Rejected"
        ACCEPT = "ACCEPT", "Accepted"
        SEND = "SEND", "Sent"
        ISSUE = "ISSUE", "Issued"
        COMPLETE = "COMPLETE", "Completed"
        CLOSE = "CLOSE", "Closed"
        RECALCULATE = "RECALCULATE", "Recalculated"
        SAVE_VERSION = "SAVE_VERSION", "Version Saved"
        EXPORT = "EXPORT", "Exported"
        LOGIN = "LOGIN", "Logged In"
        LOGOUT = "LOGOUT", "Logged Out"

    module = models.CharField(max_length=20, choices=Module.choices)
    action = models.CharField(max_length=20, choices=ActionType.choices)
    object_type = models.CharField(max_length=80, help_text="e.g. RFQ, PurchaseOrder")
    object_id = models.PositiveIntegerField(null=True, blank=True)
    object_repr = models.CharField(max_length=300, blank=True, default="",
                                   help_text="Human-readable representation, e.g. PO-202603-0001")
    old_status = models.CharField(max_length=30, blank=True, default="")
    new_status = models.CharField(max_length=30, blank=True, default="")
    details = models.JSONField(default=dict, blank=True, help_text="Extra context")
    reference = models.CharField(
        max_length=300, blank=True, default="",
        help_text="Related document/invoice reference, e.g. INV-EF-202603-004",
    )
    remarks = models.TextField(
        blank=True, default="",
        help_text="Free-text notes for additional context",
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="audit_logs",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["module", "action"]),
            models.Index(fields=["object_type", "object_id"]),
        ]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.get_action_display()} {self.object_type} {self.object_repr}"


def log_action(*, request=None, user=None, module, action, object_type,
               object_id=None, object_repr="", old_status="", new_status="",
               details=None, reference="", remarks=""):
    """
    Utility to create an AuditLog entry from anywhere.

    Usage::
        log_action(
            request=request,
            module=AuditLog.Module.RFQ,
            action=AuditLog.ActionType.SUBMIT,
            object_type="RFQ",
            object_id=rfq.id,
            object_repr=rfq.rfq_number,
            old_status="DRAFT",
            new_status="PENDING",
        )
    """
    ip = None
    if request:
        ip = (request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
              or request.META.get("REMOTE_ADDR"))
        if not user:
            user = getattr(request, "user", None)
            if user and not user.is_authenticated:
                user = None
    return AuditLog.objects.create(
        module=module,
        action=action,
        object_type=object_type,
        object_id=object_id,
        object_repr=str(object_repr),
        old_status=old_status or "",
        new_status=new_status or "",
        details=details or {},
        reference=reference or "",
        remarks=remarks or "",
        user=user,
        ip_address=ip,
    )
