# ============================================================================
# costing/models.py — Costing Sheet with PH-tax-aware 3-margin financial model
# ============================================================================

import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models

TWO = Decimal("0.01")
D = Decimal


def _r(val):
    """Round to 2 decimal places."""
    return val.quantize(TWO, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------
# Cost Category (CRUD-configurable)
# --------------------------------------------------------------------------
class CostCategory(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    has_input_vat = models.BooleanField(
        default=False,
        help_text="If checked, this category contributes to Input VAT computation",
    )
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "cost categories"

    def __str__(self):
        return self.name


# --------------------------------------------------------------------------
# Commission Role (CRUD-configurable)
# --------------------------------------------------------------------------
class CommissionRole(models.Model):
    name = models.CharField(max_length=255, unique=True)
    default_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.name} ({self.default_percent}%)"


# --------------------------------------------------------------------------
# Costing Sheet
# --------------------------------------------------------------------------
class CostingSheet(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        IN_REVIEW = "IN_REVIEW", "In Review"
        APPROVED = "APPROVED", "Approved"
        ARCHIVED = "ARCHIVED", "Archived"

    # Reference
    sheet_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    version = models.PositiveIntegerField(default=1)

    # Project info (from QUO template header)
    project_title = models.CharField(max_length=255, blank=True, default="")
    client_name = models.CharField(max_length=255, blank=True, default="")
    date = models.DateField(default=datetime.date.today)
    warranty = models.CharField(max_length=255, blank=True, default="")

    # ---- Cost aggregates ----
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Contingency
    contingency_percent = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    contingency_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_project_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # VAT rate for all margin-level computations
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    currency = models.CharField(max_length=10, default="PHP")

    # Integration
    rfq = models.ForeignKey(
        "rfq.RFQ", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="costing_sheets",
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

    # ---- Input VAT base: sum of line items whose category has_input_vat ----
    def _get_input_vat_base(self):
        return self.line_items.filter(
            category__has_input_vat=True
        ).aggregate(t=models.Sum("total_cost"))["t"] or D("0")

    def recalculate(self):
        """Recalculate totals from line items, contingency, and all margin levels."""
        from django.db.models import Sum

        total = self.line_items.aggregate(t=Sum("total_cost"))["t"] or D("0")
        self.total_cost = _r(total)
        cp = D(str(self.contingency_percent))
        self.contingency_amount = _r(self.total_cost * cp / D("100"))
        self.total_project_cost = _r(self.total_cost + self.contingency_amount)
        self.save()

        ivb = self._get_input_vat_base()
        for ml in self.margin_levels.all():
            ml.recalculate(self.total_project_cost, self.vat_rate, ivb)


# --------------------------------------------------------------------------
# Costing Line Item
# --------------------------------------------------------------------------
class CostingLineItem(models.Model):
    costing_sheet = models.ForeignKey(CostingSheet, on_delete=models.CASCADE, related_name="line_items")
    category = models.ForeignKey(CostCategory, on_delete=models.PROTECT, related_name="line_items")
    description = models.CharField(max_length=500, blank=True, default="")
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    quotation_item = models.ForeignKey(
        "rfq.QuotationItem", on_delete=models.SET_NULL, null=True, blank=True,
    )
    supplier = models.ForeignKey(
        "rfq.Supplier", on_delete=models.SET_NULL, null=True, blank=True,
    )
    notes = models.TextField(blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def save(self, *args, **kwargs):
        self.total_cost = self.amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category.name}: {self.amount}"


# --------------------------------------------------------------------------
# Costing Margin Level (Low / Medium / High)
# --------------------------------------------------------------------------
class CostingMarginLevel(models.Model):
    class Label(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    costing_sheet = models.ForeignKey(CostingSheet, on_delete=models.CASCADE, related_name="margin_levels")
    label = models.CharField(max_length=10, choices=Label.choices)

    # ---- Input percentages (user-configurable per margin level) ----
    facilitation_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    desired_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    jv_cost_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cost_of_money_percent = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    municipal_tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    others_1_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    others_1_label = models.CharField(max_length=100, default="Others 1")
    others_2_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    others_2_label = models.CharField(max_length=100, default="Others 2")
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)

    # Government deduction rates
    withholding_tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    creditable_tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    warranty_security_percent = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)

    # ---- Computed: Selling price build-up ----
    facilitation_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    desired_margin_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    jv_cost_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cost_of_money_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    municipal_tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    others_1_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    others_2_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    gross_selling_vat_ex = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_selling_vat_inc = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # ---- Computed: Government deductions ----
    withholding_tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    creditable_tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    warranty_security_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_govt_deduction = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_amount_due = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # ---- Computed: Profitability ----
    municipal_tax_revenue_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_take_home = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    earning_before_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    output_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    input_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_payable = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    earning_after_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_profit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    actual_margin_percent = models.DecimalField(max_digits=7, decimal_places=2, default=0)

    class Meta:
        ordering = ["costing_sheet", "label"]
        unique_together = ["costing_sheet", "label"]

    def __str__(self):
        return f"{self.costing_sheet.sheet_number} — {self.get_label_display()}"

    # ------------------------------------------------------------------
    # FULL PH-TAX-AWARE COSTING FORMULA (verified against QUO template)
    # ------------------------------------------------------------------
    def recalculate(self, total_project_cost, vat_rate, input_vat_base):
        tpc = D(str(total_project_cost))
        vr = D(str(vat_rate)) / D("100")

        # Convert all percent fields to Decimal for safety
        fac = D(str(self.facilitation_percent))
        dm  = D(str(self.desired_margin_percent))
        jv  = D(str(self.jv_cost_percent))
        com = D(str(self.cost_of_money_percent))
        mt  = D(str(self.municipal_tax_percent))
        o1  = D(str(self.others_1_percent))
        o2  = D(str(self.others_2_percent))
        wht = D(str(self.withholding_tax_percent))
        crt = D(str(self.creditable_tax_percent))
        wsp = D(str(self.warranty_security_percent))
        cmp = D(str(self.commission_percent))

        # Sum of all addon percentages
        total_pct = fac + dm + jv + com + mt + o1 + o2

        # Gross Selling (VAT Ex) = Total Project Cost / (1 - sum_of_pct%)
        divisor = D("1") - total_pct / D("100")
        if divisor > 0:
            gs = _r(tpc / divisor)
        else:
            gs = tpc
        self.gross_selling_vat_ex = gs

        # Individual addon amounts = gross_selling × pct%
        self.facilitation_amount = _r(gs * fac / D("100"))
        self.desired_margin_amount = _r(gs * dm / D("100"))
        self.jv_cost_amount = _r(gs * jv / D("100"))
        self.cost_of_money_amount = _r(gs * com / D("100"))
        self.municipal_tax_amount = _r(gs * mt / D("100"))
        self.others_1_amount = _r(gs * o1 / D("100"))
        self.others_2_amount = _r(gs * o2 / D("100"))

        # VAT
        self.vat_amount = _r(gs * vr)
        self.net_selling_vat_inc = _r(gs + self.vat_amount)
        ns = self.net_selling_vat_inc

        # Government deductions
        self.withholding_tax_amount = _r(gs * wht / D("100"))
        self.creditable_tax_amount = _r(gs * crt / D("100"))
        self.warranty_security_amount = _r(ns * wsp / D("100"))
        self.total_govt_deduction = _r(
            self.withholding_tax_amount
            + self.creditable_tax_amount
            + self.warranty_security_amount
        )
        self.net_amount_due = _r(ns - self.total_govt_deduction)

        # Profitability
        self.municipal_tax_revenue_amount = _r(ns * mt / D("100"))
        self.net_take_home = _r(
            self.net_amount_due - self.facilitation_amount - self.municipal_tax_revenue_amount
        )
        self.earning_before_vat = _r(self.net_take_home - tpc)

        # VAT passthrough
        self.output_vat = self.vat_amount
        ivb = D(str(input_vat_base))
        self.input_vat = _r(ivb * vr / (D("1") + vr)) if ivb > 0 else D("0")
        self.vat_payable = _r(self.output_vat - self.input_vat - self.creditable_tax_amount)

        self.earning_after_vat = _r(self.earning_before_vat - self.vat_payable)

        # Commission (based on earning before VAT)
        self.commission_amount = _r(self.earning_before_vat * cmp / D("100"))

        # Net Profit
        self.net_profit = _r(self.earning_after_vat - self.commission_amount - self.jv_cost_amount)

        # Actual margin %
        if self.net_selling_vat_inc > 0:
            self.actual_margin_percent = _r(self.net_profit / self.net_selling_vat_inc * D("100"))
        else:
            self.actual_margin_percent = D("0")

        self.save()

        # Recalculate commission splits
        for cs in self.commission_splits.all():
            cs.amount = _r(self.commission_amount * D(str(cs.percent)) / D("100"))
            cs.save(update_fields=["amount"])


# --------------------------------------------------------------------------
# Commission Split (per margin level)
# --------------------------------------------------------------------------
class CostingCommissionSplit(models.Model):
    margin_level = models.ForeignKey(
        CostingMarginLevel, on_delete=models.CASCADE, related_name="commission_splits",
    )
    role = models.ForeignKey(CommissionRole, on_delete=models.CASCADE)
    percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["role__sort_order"]
        unique_together = ["margin_level", "role"]

    def __str__(self):
        return f"{self.role.name}: {self.percent}% = {self.amount}"


# --------------------------------------------------------------------------
# Version snapshots
# --------------------------------------------------------------------------
class CostingVersion(models.Model):
    costing_sheet = models.ForeignKey(CostingSheet, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    snapshot_data = models.JSONField()
    change_summary = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["costing_sheet", "-version_number"]
        unique_together = ["costing_sheet", "version_number"]

    def __str__(self):
        return f"{self.costing_sheet.sheet_number} — v{self.version_number}"


# --------------------------------------------------------------------------
# Scenario (What-If)
# --------------------------------------------------------------------------
class Scenario(models.Model):
    costing_sheet = models.ForeignKey(CostingSheet, on_delete=models.CASCADE, related_name="scenarios")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    overrides = models.JSONField(default=dict)
    projected_total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    projected_selling_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    projected_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Scenario: {self.name}"

    def calculate(self):
        from decimal import Decimal as D
        base_items = self.costing_sheet.line_items.all()
        total = D("0")
        for item in base_items:
            sid = str(item.id)
            if sid in self.overrides:
                mods = self.overrides[sid]
                amt = D(str(mods.get("amount", item.amount)))
            else:
                amt = item.amount
            total += amt

        cs = self.costing_sheet
        contingency = total * cs.contingency_percent / D("100")
        tpc = total + contingency
        self.projected_total_cost = _r(tpc)

        margin = D(str(self.overrides.get("__margin__", cs.margin_levels.filter(label="LOW").first().desired_margin_percent if cs.margin_levels.exists() else 20)))
        divisor = D("1") - margin / D("100")
        if divisor > 0:
            self.projected_selling_price = _r(tpc / divisor)
        else:
            self.projected_selling_price = tpc
        self.projected_margin_percent = margin
        self.save()
