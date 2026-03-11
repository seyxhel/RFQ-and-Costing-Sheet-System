# ============================================================================
# sales/models.py — Formal Quotation, Sales Order, Contract Analysis
# ============================================================================

import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models

TWO = Decimal("0.01")


def _r(val):
    return val.quantize(TWO, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------
# Client (reusable client registry)
# --------------------------------------------------------------------------
class Client(models.Model):
    name = models.CharField(max_length=255)
    designation = models.CharField(max_length=255, blank=True, default="")
    contact_number = models.CharField(max_length=100, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# --------------------------------------------------------------------------
# Formal Quotation (outgoing to client)
# --------------------------------------------------------------------------
class FormalQuotation(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SENT = "SENT", "Sent to Client"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        REVISED = "REVISED", "Revised"
        WON = "WON", "Won"

    quotation_number = models.CharField(max_length=50, unique=True)
    date = models.DateField(default=datetime.date.today)

    # Client details
    client = models.ForeignKey(
        Client, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="formal_quotations",
    )
    client_name = models.CharField(max_length=255)
    client_designation = models.CharField(max_length=255, blank=True, default="")
    client_contact_number = models.CharField(max_length=100, blank=True, default="")
    client_address = models.TextField(blank=True, default="")
    client_contact = models.CharField(max_length=255, blank=True, default="")
    client_email = models.EmailField(blank=True, default="")

    # Project
    project_title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    warranty = models.CharField(max_length=255, blank=True, default="")

    # Links to source data
    rfq = models.ForeignKey(
        "rfq.RFQ", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="formal_quotations",
    )
    costing_sheet = models.ForeignKey(
        "costing.CostingSheet", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="formal_quotations",
    )
    margin_level = models.ForeignKey(
        "costing.CostingMarginLevel", on_delete=models.SET_NULL,
        null=True, blank=True,
        help_text="Which margin scenario was selected for pricing",
    )

    # Financials
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="PHP")

    # Terms
    payment_terms = models.TextField(blank=True, default="")
    delivery_terms = models.TextField(blank=True, default="")
    validity_days = models.PositiveIntegerField(default=30)
    terms_and_conditions = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="formal_quotations_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.quotation_number} — {self.project_title}"

    def recalculate(self):
        from django.db.models import Sum
        self.subtotal = self.items.aggregate(t=Sum("amount"))["t"] or Decimal("0")
        vr = Decimal(str(self.vat_rate))
        self.vat_amount = _r(self.subtotal * vr / Decimal("100"))
        self.total_amount = _r(self.subtotal + self.vat_amount)
        self.save()


class FormalQuotationItem(models.Model):
    quotation = models.ForeignKey(FormalQuotation, on_delete=models.CASCADE, related_name="items")
    item_number = models.PositiveIntegerField(default=1)
    description = models.TextField()
    brand = models.CharField(max_length=255, blank=True, default="")
    model_number = models.CharField(max_length=255, blank=True, default="")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30, default="pcs")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["item_number", "id"]

    def save(self, *args, **kwargs):
        self.amount = _r(self.unit_price * self.quantity)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description[:80]} (x{self.quantity})"


# --------------------------------------------------------------------------
# Quotation Revision (margin change history)
# --------------------------------------------------------------------------
class QuotationRevision(models.Model):
    quotation = models.ForeignKey(
        FormalQuotation, on_delete=models.CASCADE, related_name="revisions",
    )
    revision_number = models.PositiveIntegerField(default=1)
    margin_level_label = models.CharField(max_length=15, blank=True, default="")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    reason = models.TextField(blank=True, default="")
    snapshot_items = models.JSONField(default=list)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-revision_number"]

    def __str__(self):
        return f"{self.quotation.quotation_number} rev{self.revision_number}"
class SalesOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        CONFIRMED = "CONFIRMED", "Confirmed"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    so_number = models.CharField(max_length=50, unique=True)
    date = models.DateField(default=datetime.date.today)

    client_name = models.CharField(max_length=255)
    project_title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    # Links
    formal_quotation = models.ForeignKey(
        FormalQuotation, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="sales_orders",
    )
    rfq = models.ForeignKey("rfq.RFQ", on_delete=models.SET_NULL, null=True, blank=True)
    costing_sheet = models.ForeignKey("costing.CostingSheet", on_delete=models.SET_NULL, null=True, blank=True)

    contract_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("12.00"))
    currency = models.CharField(max_length=10, default="PHP")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="sales_orders_created",
    )
    awarded_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.so_number} — {self.project_title}"


# --------------------------------------------------------------------------
# Contract Analysis
# --------------------------------------------------------------------------
class ContractAnalysis(models.Model):
    """Financial breakdown from different perspectives (e.g. direct-to-user, JVA partner)."""
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name="contract_analyses")
    name = models.CharField(max_length=255, help_text="e.g. 'Direct to End-User', 'JVA Partner View'")

    contract_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_ex_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Deductions
    warranty_security = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    ewt_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, help_text="5% EWT")
    lgu_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, help_text="2% LGU")
    facilitation = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cogs = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    implementation = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Results
    net_cash_flow = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_cash_flow_percent = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    net_benefit = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # VAT passthrough
    output_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    input_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_payable = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sales_order", "id"]
        verbose_name_plural = "contract analyses"

    def __str__(self):
        return f"{self.name} — {self.sales_order.so_number}"

    def recalculate(self):
        vr = Decimal(str(self.sales_order.vat_rate)) / Decimal("100")
        self.vat_ex_amount = _r(self.contract_price / (1 + vr))
        self.vat_amount = _r(self.contract_price - self.vat_ex_amount)
        self.total_deductions = _r(
            self.warranty_security + self.ewt_amount + self.lgu_amount
            + self.facilitation + self.cogs + self.implementation
        )
        self.net_cash_flow = _r(self.contract_price - self.total_deductions)
        if self.contract_price > 0:
            self.net_cash_flow_percent = _r(self.net_cash_flow / self.contract_price * 100)
        self.output_vat = _r(self.contract_price * vr / (1 + vr))
        self.input_vat = _r(self.cogs * vr / (1 + vr)) if self.cogs > 0 else Decimal("0")
        self.vat_payable = _r(self.output_vat - self.input_vat)
        self.save()
