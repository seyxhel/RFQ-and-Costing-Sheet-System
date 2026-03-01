# ============================================================================
# costing/models.py — Costing Sheet module data models
# ============================================================================
# Models:
#   CostingSheet        — Header with version control & profit analysis
#   CostingLineItem     — Detailed cost breakdown rows
#   CostingVersion      — Historical snapshots (version control)
#   Scenario            — "What-if" analysis records
#
# Integration points:
#   - Links to rfq.Quotation for dynamic supplier-based calculations
#   - Links to rfq.Supplier for material sourcing
#   - Encrypted fields for sensitive financial data
# ============================================================================

from django.conf import settings
from django.db import models
from django.utils import timezone


class CostingSheet(models.Model):
    """
    Costing Sheet header — aggregates cost breakdown, calculates margins.
    Integration: Pulls unit prices from accepted RFQ quotations.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        IN_REVIEW = "IN_REVIEW", "In Review"
        APPROVED = "APPROVED", "Approved"
        ARCHIVED = "ARCHIVED", "Archived"

    # Reference
    sheet_number = models.CharField(
        max_length=50, unique=True,
        help_text="Auto-generated or user-defined costing sheet reference",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
    )
    version = models.PositiveIntegerField(
        default=1, help_text="Current version number (auto-incremented on save)",
    )

    # ----- Cost aggregates (calculated from line items) -----
    total_material_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_labor_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_overhead_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_logistics_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # ----- Profit margin analysis -----
    target_margin_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=20.00,
        help_text="Desired profit margin percentage",
    )
    selling_price = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Calculated: total_cost / (1 - margin%)",
    )
    actual_margin_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )

    currency = models.CharField(max_length=10, default="PHP")

    # Integration: link to the RFQ whose quotation feeds material costs
    rfq = models.ForeignKey(
        "rfq.RFQ", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="costing_sheets",
        help_text="Source RFQ for supplier pricing data",
    )

    # Ownership
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="costing_sheets_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="costing_sheets_approved",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.sheet_number} v{self.version} — {self.title}"

    # ----- Dynamic calculation helpers -----

    def recalculate_totals(self):
        """
        Re-aggregate cost totals from line items and compute selling price.
        Called after line items are added/edited.
        """
        from django.db.models import Sum

        aggregates = self.line_items.aggregate(
            materials=Sum("material_cost"),
            labor=Sum("labor_cost"),
            overhead=Sum("overhead_cost"),
            logistics=Sum("logistics_cost"),
        )
        self.total_material_cost = aggregates["materials"] or 0
        self.total_labor_cost = aggregates["labor"] or 0
        self.total_overhead_cost = aggregates["overhead"] or 0
        self.total_logistics_cost = aggregates["logistics"] or 0
        self.total_cost = (
            self.total_material_cost
            + self.total_labor_cost
            + self.total_overhead_cost
            + self.total_logistics_cost
        )
        # Selling price = total_cost / (1 - margin%)
        if self.target_margin_percent < 100:
            self.selling_price = self.total_cost / (1 - self.target_margin_percent / 100)
        else:
            self.selling_price = self.total_cost

        # Actual margin
        if self.selling_price > 0:
            self.actual_margin_percent = (
                (self.selling_price - self.total_cost) / self.selling_price * 100
            )
        self.save()


class CostingLineItem(models.Model):
    """
    Individual cost breakdown row — materials, labor, overhead, logistics.
    Integration: material_cost can be auto-populated from QuotationItem.unit_price.
    """

    class CostType(models.TextChoices):
        MATERIAL = "MATERIAL", "Material"
        LABOR = "LABOR", "Labor"
        OVERHEAD = "OVERHEAD", "Overhead"
        LOGISTICS = "LOGISTICS", "Logistics"
        OTHER = "OTHER", "Other"

    costing_sheet = models.ForeignKey(
        CostingSheet, on_delete=models.CASCADE, related_name="line_items",
    )
    cost_type = models.CharField(
        max_length=20, choices=CostType.choices, default=CostType.MATERIAL,
    )
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit = models.CharField(max_length=30, default="pcs")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Breakdown buckets (filled based on cost_type or manually)
    material_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    overhead_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    logistics_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Integration: link to supplier quotation item for dynamic pricing
    quotation_item = models.ForeignKey(
        "rfq.QuotationItem", on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Linked quotation item for auto-pricing",
    )
    supplier = models.ForeignKey(
        "rfq.Supplier", on_delete=models.SET_NULL, null=True, blank=True,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["cost_type", "id"]

    def save(self, *args, **kwargs):
        # Auto-calculate line total
        line_total = self.unit_cost * self.quantity
        self.total_cost = line_total

        # Assign to correct bucket based on cost_type
        if self.cost_type == self.CostType.MATERIAL:
            self.material_cost = line_total
        elif self.cost_type == self.CostType.LABOR:
            self.labor_cost = line_total
        elif self.cost_type == self.CostType.OVERHEAD:
            self.overhead_cost = line_total
        elif self.cost_type == self.CostType.LOGISTICS:
            self.logistics_cost = line_total
        else:
            self.overhead_cost = line_total  # "Other" goes to overhead

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} ({self.cost_type})"


class CostingVersion(models.Model):
    """
    Historical snapshot of a costing sheet for version control.
    Created automatically when a costing sheet is updated/approved.
    """
    costing_sheet = models.ForeignKey(
        CostingSheet, on_delete=models.CASCADE, related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    snapshot_data = models.JSONField(
        help_text="JSON snapshot of the costing sheet and all line items at this version",
    )
    change_summary = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["costing_sheet", "-version_number"]
        unique_together = ["costing_sheet", "version_number"]

    def __str__(self):
        return f"{self.costing_sheet.sheet_number} — v{self.version_number}"


class Scenario(models.Model):
    """
    What-if analysis: compare different supplier/material choices.
    Each scenario is a variant of a costing sheet with modified inputs.
    """
    costing_sheet = models.ForeignKey(
        CostingSheet, on_delete=models.CASCADE, related_name="scenarios",
    )
    name = models.CharField(max_length=255, help_text="e.g. 'Supplier B + Air Freight'")
    description = models.TextField(blank=True, default="")

    # Scenario overrides (JSON: list of line item modifications)
    overrides = models.JSONField(
        default=dict,
        help_text="JSON dict mapping line_item_id -> {field: new_value}",
    )

    # Calculated results
    projected_total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    projected_selling_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    projected_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Scenario: {self.name} for {self.costing_sheet.sheet_number}"

    def calculate(self):
        """
        Apply overrides to the costing sheet line items and recalculate totals.
        Does NOT modify the original costing sheet — read-only projection.

        Formula:
          Adjusted Cost   = sum of (unit_cost × quantity) for every line item
                            after overrides are applied
          Selling Price   = Adjusted Cost × (1 + margin%)
          Margin          = overrides["__margin__"] if present,
                            otherwise the costing sheet's target_margin_percent
        """
        from decimal import Decimal

        base_items = self.costing_sheet.line_items.all()
        total = Decimal("0.00")

        for item in base_items:
            item_id_str = str(item.id)
            if item_id_str in self.overrides:
                mods = self.overrides[item_id_str]
                unit_cost = Decimal(str(mods.get("unit_cost", item.unit_cost)))
                quantity = Decimal(str(mods.get("quantity", item.quantity)))
            else:
                unit_cost = item.unit_cost
                quantity = item.quantity
            total += unit_cost * quantity

        # Adjusted Cost = raw total of line items (no stacking of previous prices)
        self.projected_total_cost = total

        # Margin: allow override via special "__margin__" key in overrides
        if "__margin__" in self.overrides:
            margin = Decimal(str(self.overrides["__margin__"]))
        else:
            margin = self.costing_sheet.target_margin_percent

        # Selling Price = Adjusted Cost × (1 + Margin%)
        self.projected_selling_price = total * (1 + margin / 100)

        # Margin = the applied percentage directly
        self.projected_margin_percent = margin

        self.save()
