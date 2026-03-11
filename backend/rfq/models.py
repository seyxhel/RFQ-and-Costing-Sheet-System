# ============================================================================
# rfq/models.py — RFQ module: Suppliers, RFQs, Quotations, Approvals
# ============================================================================

import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models

TWO = Decimal("0.01")


# --------------------------------------------------------------------------
# Supplier
# --------------------------------------------------------------------------
class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    address = models.TextField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    viber = models.CharField(max_length=30, blank=True, default="")
    whatsapp = models.CharField(max_length=30, blank=True, default="")
    facebook = models.CharField(max_length=255, blank=True, default="")

    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    on_time_delivery_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
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
# RFQ
# --------------------------------------------------------------------------
class RFQ(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_FOR_CANVASS = "PENDING_FOR_CANVASS", "Pending for Canvass"
        CANVASS_DONE = "CANVASS_DONE", "Canvass Complete"
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

    rfq_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    # Project / client info
    project_title = models.CharField(max_length=255, blank=True, default="")
    client_name = models.CharField(max_length=255, blank=True, default="")
    company_name = models.CharField(max_length=255, blank=True, default="")

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)

    issue_date = models.DateField(default=datetime.date.today)
    deadline = models.DateField(null=True, blank=True)

    suppliers = models.ManyToManyField(Supplier, blank=True, related_name="rfqs")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="rfqs_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="rfqs_approved",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "RFQ"
        verbose_name_plural = "RFQs"

    def __str__(self):
        return f"{self.rfq_number} — {self.title}"


# --------------------------------------------------------------------------
# RFQ Item (Client Requirement)
# --------------------------------------------------------------------------
class RFQItem(models.Model):
    """Line item = one client requirement row (left side of canvass sheet)."""
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="rfq_items",
    )
    item_number = models.PositiveIntegerField(default=1)
    item_name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True, default="")
    model_number = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30, default="pcs")
    specifications = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["item_number", "id"]

    def __str__(self):
        return f"{self.item_name} (x{self.quantity} {self.unit})"


# --------------------------------------------------------------------------
# Quotation (Supplier response — incoming)
# --------------------------------------------------------------------------
class Quotation(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Review"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="quotations")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="quotations")

    quotation_number = models.CharField(max_length=50, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="PHP")

    delivery_days = models.PositiveIntegerField(default=0)
    payment_terms = models.CharField(max_length=255, blank=True, default="")
    validity_days = models.PositiveIntegerField(default=30)
    notes = models.TextField(blank=True, default="")

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["total_amount"]

    def __str__(self):
        return f"Quote by {self.supplier.name} for {self.rfq.rfq_number}"

    def recalculate_total(self):
        total = self.items.aggregate(t=models.Sum("amount"))["t"] or 0
        self.total_amount = total
        self.save(update_fields=["total_amount"])


# --------------------------------------------------------------------------
# Quotation Item (one row on the right side of canvass sheet)
# --------------------------------------------------------------------------
class QuotationItem(models.Model):
    class OfferType(models.TextChoices):
        SAME = "SAME", "Same as per requirement"
        COUNTER = "COUNTER", "Counter-offer"

    class AvailabilityType(models.TextChoices):
        ON_STOCK = "ON_STOCK", "On-Stock"
        ORDER_BASIS = "ORDER_BASIS", "Order Basis"

    class WarrantyPeriod(models.TextChoices):
        SIX_MONTHS = "6MOS", "6 Months"
        ONE_YEAR = "1YR", "1 Year"
        THREE_YEARS = "3YRS", "3 Years"
        FIVE_YEARS = "5YRS", "5 Years"
        OTHER = "OTHER", "Other"

    class VatType(models.TextChoices):
        INCLUSIVE = "VAT_INC", "VAT Inclusive"
        EXCLUSIVE = "VAT_EX", "VAT Exclusive"
        EXEMPT = "VAT_EXEMPT", "VAT Exempt"

    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="items")
    rfq_item = models.ForeignKey(RFQItem, on_delete=models.CASCADE, related_name="quoted_items")

    # Offer details
    offer_type = models.CharField(max_length=20, choices=OfferType.choices, default=OfferType.SAME)
    brand = models.CharField(max_length=255, blank=True, default="")
    model_number = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")

    # Quantity & pricing
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30, default="pcs")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # VAT
    vat_type = models.CharField(max_length=20, choices=VatType.choices, default=VatType.INCLUSIVE)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    unit_price_vat_ex = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Supplier terms
    availability = models.CharField(max_length=20, choices=AvailabilityType.choices, blank=True, default="")
    availability_detail = models.CharField(max_length=255, blank=True, default="",
                                           help_text="e.g. '30 to 45 Days'")
    warranty_period = models.CharField(max_length=10, choices=WarrantyPeriod.choices, blank=True, default="")
    warranty_detail = models.CharField(max_length=255, blank=True, default="")
    price_validity = models.CharField(max_length=100, blank=True, default="",
                                      help_text="e.g. '15 days'")

    # Tax & remarks
    tax_type = models.CharField(max_length=255, blank=True, default="",
                                help_text="Tax type/computation from supplier proposal")
    remarks = models.TextField(blank=True, default="",
                               help_text="e.g. VAT Inclusive / VAT Exclusive")
    reference = models.CharField(max_length=255, blank=True, default="")

    # File attachment
    price_proposal = models.FileField(
        upload_to="quotations/price_proposals/%Y/%m/",
        blank=True, null=True,
    )

    delivery_days = models.PositiveIntegerField(default=0)
    notes = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        # Amount = unit_price × quantity
        up = Decimal(str(self.unit_price))
        qty = Decimal(str(self.quantity))
        self.amount = (up * qty).quantize(TWO, ROUND_HALF_UP)

        # VAT calculations
        rate = Decimal(str(self.vat_rate)) / Decimal("100")
        if self.vat_type == self.VatType.INCLUSIVE and rate > 0:
            self.unit_price_vat_ex = (up / (1 + rate)).quantize(TWO, ROUND_HALF_UP)
            self.vat_amount = (up - self.unit_price_vat_ex).quantize(TWO, ROUND_HALF_UP)
        elif self.vat_type == self.VatType.EXCLUSIVE and rate > 0:
            self.unit_price_vat_ex = up
            self.vat_amount = (up * rate).quantize(TWO, ROUND_HALF_UP)
        else:
            self.unit_price_vat_ex = up
            self.vat_amount = Decimal("0")

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.brand} {self.model_number} — {self.description[:50]}"


# --------------------------------------------------------------------------
# Approval Log
# --------------------------------------------------------------------------
class ApprovalLog(models.Model):
    class Action(models.TextChoices):
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        RETURNED = "RETURNED", "Returned for Revision"

    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    level = models.PositiveIntegerField(default=1)
    comments = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["rfq", "level", "-created_at"]

    def __str__(self):
        return f"Level {self.level} {self.action} by {self.approver}"
