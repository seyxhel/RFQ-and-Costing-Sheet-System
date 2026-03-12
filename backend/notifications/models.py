from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    In-app notification so users know when they have something to act on.
    """

    class Type(models.TextChoices):
        RFQ_CREATED = "rfq_created", "New RFQ"
        RFQ_UPDATED = "rfq_updated", "RFQ Updated"
        COSTING_CREATED = "costing_created", "Costing Created"
        COSTING_UPDATED = "costing_updated", "Costing Updated"
        QUOTATION_SENT = "quotation_sent", "Quotation Sent"
        QUOTATION_WON = "quotation_won", "Quotation Won"
        QUOTATION_REJECTED = "quotation_rejected", "Quotation Rejected"
        SALES_ORDER = "sales_order", "Sales Order"
        BUDGET_CREATED = "budget_created", "Budget Created"
        BUDGET_APPROVED = "budget_approved", "Budget Approved"
        BUDGET_REJECTED = "budget_rejected", "Budget Rejected"
        PROCUREMENT = "procurement", "Procurement"
        GENERAL = "general", "General"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=Type.choices,
        default=Type.GENERAL,
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    reference_id = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="E.g. RFQ number, SO number, etc.",
    )
    reference_url = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Frontend path to navigate to when clicked.",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient}"
