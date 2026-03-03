# ============================================================================
# costing/admin.py — Costing module admin registration
# ============================================================================

from django.contrib import admin
from .models import (
    CostCategory, CommissionRole,
    CostingSheet, CostingLineItem,
    CostingMarginLevel, CostingCommissionSplit,
    CostingVersion, Scenario,
)


@admin.register(CostCategory)
class CostCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "has_input_vat", "is_default", "is_active", "sort_order"]
    list_filter = ["is_active", "has_input_vat", "is_default"]
    list_editable = ["sort_order"]


@admin.register(CommissionRole)
class CommissionRoleAdmin(admin.ModelAdmin):
    list_display = ["name", "default_percent", "is_active", "sort_order"]
    list_editable = ["default_percent", "sort_order"]


class CostingLineItemInline(admin.TabularInline):
    model = CostingLineItem
    extra = 0


class CostingMarginLevelInline(admin.StackedInline):
    model = CostingMarginLevel
    extra = 0
    readonly_fields = [
        "gross_selling_vat_ex", "vat_amount", "net_selling_vat_inc",
        "total_govt_deduction", "net_amount_due", "net_take_home",
        "earning_before_vat", "earning_after_vat",
        "vat_payable", "commission_amount", "net_profit", "actual_margin_percent",
    ]


@admin.register(CostingSheet)
class CostingSheetAdmin(admin.ModelAdmin):
    list_display = [
        "sheet_number", "title", "client_name", "status", "version",
        "total_project_cost", "currency", "created_at",
    ]
    list_filter = ["status"]
    search_fields = ["sheet_number", "title", "client_name", "project_title"]
    inlines = [CostingLineItemInline, CostingMarginLevelInline]


@admin.register(CostingVersion)
class CostingVersionAdmin(admin.ModelAdmin):
    list_display = ["costing_sheet", "version_number", "created_by", "created_at"]


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ["name", "costing_sheet", "projected_total_cost", "projected_margin_percent"]
