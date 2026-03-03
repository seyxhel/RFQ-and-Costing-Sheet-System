# ============================================================================
# budget/models.py — Budget allocation, approval, and tracking
# ============================================================================

from django.conf import settings
from django.db import models


class Budget(models.Model):
    """Budget allocation tied to a project, RFQ, or costing sheet."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CLOSED = "CLOSED", "Closed"

    budget_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # Amounts
    allocated_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Total approved budget amount",
    )
    spent_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Total actually spent (from PO actuals)",
    )
    remaining_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Allocated - Spent",
    )
    currency = models.CharField(max_length=10, default="PHP")

    # Links
    rfq = models.ForeignKey(
        "rfq.RFQ", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="budgets",
    )
    costing_sheet = models.ForeignKey(
        "costing.CostingSheet", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="budgets",
    )
    sales_order = models.ForeignKey(
        "sales.SalesOrder", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="budgets",
    )

    # Ownership
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="budgets_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="budgets_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.budget_number} — {self.title}"

    def recalculate(self):
        """Recalculate spent/remaining from linked PO actuals."""
        from procurement.models import ActualCost
        total_spent = ActualCost.objects.filter(
            purchase_order__budget=self
        ).aggregate(total=models.Sum("amount"))["total"] or 0
        self.spent_amount = total_spent
        self.remaining_amount = self.allocated_amount - self.spent_amount
        self.save()
