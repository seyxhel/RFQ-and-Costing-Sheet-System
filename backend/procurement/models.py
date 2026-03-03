# ============================================================================
# procurement/models.py — Purchase Orders + Actual Cost Tracking
# ============================================================================

from django.conf import settings
from django.db import models


class PurchaseOrder(models.Model):
    """
    Purchase Order generated from an approved costing sheet + accepted quotation.
    Links budget for limit enforcement and tracks actual costs for variance.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ISSUED = "ISSUED", "Issued"
        PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially Received"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    po_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.DRAFT)

    # Links
    supplier = models.ForeignKey(
        "rfq.Supplier", on_delete=models.SET_NULL, null=True, related_name="purchase_orders",
    )
    rfq = models.ForeignKey(
        "rfq.RFQ", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders",
    )
    quotation = models.ForeignKey(
        "rfq.Quotation", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders",
    )
    costing_sheet = models.ForeignKey(
        "costing.CostingSheet", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders",
    )
    budget = models.ForeignKey(
        "budget.Budget", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders",
    )

    # Financial
    estimated_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    actual_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="PHP")

    # Dates
    issue_date = models.DateField(auto_now_add=True)
    expected_delivery = models.DateField(null=True, blank=True)
    actual_delivery = models.DateField(null=True, blank=True)

    # Ownership
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="pos_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.po_number} — {self.title}"

    def recalculate_actuals(self):
        total = self.actual_costs.aggregate(t=models.Sum("amount"))["t"] or 0
        self.actual_total = total
        self.save()


class POLineItem(models.Model):
    """Line items in a PO — maps to quotation items / costing line items."""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="line_items")
    product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL, null=True, blank=True,
    )
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit = models.CharField(max_length=30, default="pcs")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.total_cost = self.unit_cost * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} (x{self.quantity})"


class ActualCost(models.Model):
    """
    Actual cost entries — recorded from invoices/receipts against a PO.
    Used for variance monitoring (estimated vs actual).
    """

    class CostType(models.TextChoices):
        MATERIAL = "MATERIAL", "Material"
        LABOR = "LABOR", "Labor"
        OVERHEAD = "OVERHEAD", "Overhead"
        LOGISTICS = "LOGISTICS", "Logistics"
        SHIPPING = "SHIPPING", "Shipping"
        TAX = "TAX", "Tax"
        OTHER = "OTHER", "Other"

    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name="actual_costs",
    )
    cost_type = models.CharField(max_length=20, choices=CostType.choices, default=CostType.MATERIAL)
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reference_number = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Invoice number, receipt number, etc.",
    )
    date = models.DateField()
    notes = models.TextField(blank=True, default="")
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.description} — {self.amount}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-update PO actual total
        self.purchase_order.recalculate_actuals()
