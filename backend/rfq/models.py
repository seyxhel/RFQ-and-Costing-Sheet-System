# ============================================================================
# rfq/models.py — RFQ module data models
# ============================================================================
# Models:
#   Supplier         — Supplier profiles, contacts, performance
#   RFQ              — Request for Quotation header
#   RFQItem          — Line items within an RFQ
#   Quotation        — Supplier quotation in response to an RFQ
#   QuotationItem    — Line items within a quotation
#   ApprovalLog      — Multi-level approval workflow audit trail
#
# All models use BigAutoField PKs and are compatible with SQLite & PostgreSQL.
# ============================================================================

import datetime

from django.conf import settings
from django.db import models
from django.utils import timezone


# --------------------------------------------------------------------------
# Supplier
# --------------------------------------------------------------------------
class Supplier(models.Model):
    """
    Supplier database — profiles, contacts, performance history.
    Integration point: linked from Quotation and Costing Sheet.
    """
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    address = models.TextField(blank=True, default="")
    website = models.URLField(blank=True, default="")

    # Performance tracking
    rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00,
        help_text="Average supplier rating (0.00–5.00)",
    )
    on_time_delivery_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
        help_text="Percentage of on-time deliveries",
    )
    total_orders = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True, default="")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# --------------------------------------------------------------------------
# RFQ (Request for Quotation)
# --------------------------------------------------------------------------
class RFQ(models.Model):
    """
    RFQ header — tracks deadlines, status, and approval workflow.
    Integration points:
      - Links to inventory items via RFQItem
      - Triggers purchase orders upon approval
      - Feeds into Costing Sheet module via approved quotation prices
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent to Suppliers"
        RECEIVED = "RECEIVED", "Quotations Received"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CLOSED = "CLOSED", "Closed"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    # Header fields
    rfq_number = models.CharField(
        max_length=50, unique=True,
        help_text="Auto-generated or user-defined RFQ reference number",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM,
    )

    # Dates
    issue_date = models.DateField(default=datetime.date.today)
    deadline = models.DateField(
        null=True, blank=True,
        help_text="Deadline for suppliers to submit quotations",
    )

    # Relationships
    suppliers = models.ManyToManyField(
        Supplier, blank=True, related_name="rfqs",
        help_text="Suppliers invited to quote",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="rfqs_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="rfqs_approved",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "RFQ"
        verbose_name_plural = "RFQs"

    def __str__(self):
        return f"{self.rfq_number} — {self.title}"


class RFQItem(models.Model):
    """
    Line items within an RFQ — item details, quantities, specifications.
    Integration point: maps to inventory items for stock lookup.
    """
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="rfq_items",
        help_text="Select from product catalog (optional)",
    )
    item_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(
        max_length=30, default="pcs",
        help_text="Unit of measure (pcs, kg, m, etc.)",
    )
    specifications = models.TextField(
        blank=True, default="",
        help_text="Technical specs, material grade, tolerances, etc.",
    )
    # Optional: link to inventory system (future integration)
    inventory_item_id = models.CharField(
        max_length=50, blank=True, default="",
        help_text="External inventory system item ID",
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.item_name} (x{self.quantity} {self.unit})"


# --------------------------------------------------------------------------
# Quotation — Supplier responses
# --------------------------------------------------------------------------
class Quotation(models.Model):
    """
    A supplier's quotation in response to an RFQ.
    Used for comparison by price, delivery time, and terms.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Review"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="quotations")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="quotations")

    quotation_number = models.CharField(max_length=50, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
    )

    # Financial summary
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="USD")

    # Delivery & terms
    delivery_days = models.PositiveIntegerField(
        default=0, help_text="Estimated delivery time in days",
    )
    payment_terms = models.CharField(max_length=255, blank=True, default="")
    warranty_terms = models.CharField(max_length=255, blank=True, default="")
    validity_days = models.PositiveIntegerField(
        default=30, help_text="Quotation validity in days",
    )
    notes = models.TextField(blank=True, default="")

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["total_amount"]  # cheapest first for comparison

    def __str__(self):
        return f"Quote by {self.supplier.name} for {self.rfq.rfq_number}"


class QuotationItem(models.Model):
    """
    Line items within a quotation — maps back to RFQ items.
    Enables item-level price and delivery comparison.
    """
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="items")
    rfq_item = models.ForeignKey(
        RFQItem, on_delete=models.CASCADE, related_name="quoted_items",
        help_text="The RFQ line item this quote covers",
    )
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=14, decimal_places=2)
    delivery_days = models.PositiveIntegerField(default=0)
    notes = models.CharField(max_length=500, blank=True, default="")

    def save(self, *args, **kwargs):
        # Auto-calculate total_price
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.rfq_item.item_name} @ {self.unit_price}/{self.rfq_item.unit}"


# --------------------------------------------------------------------------
# Approval workflow
# --------------------------------------------------------------------------
class ApprovalLog(models.Model):
    """
    Multi-level approval audit trail for RFQs.
    Each approval step is logged with the approver, action, and comments.
    """

    class Action(models.TextChoices):
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        RETURNED = "RETURNED", "Returned for Revision"

    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    level = models.PositiveIntegerField(
        default=1,
        help_text="Approval level (1 = first approver, 2 = second, etc.)",
    )
    comments = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["rfq", "level", "-created_at"]

    def __str__(self):
        return f"Level {self.level} {self.action} by {self.approver}"
