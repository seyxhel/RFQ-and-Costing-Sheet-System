from django.contrib import admin
from .models import CostingSheet, CostingLineItem, CostingVersion, Scenario


class CostingLineItemInline(admin.TabularInline):
    model = CostingLineItem
    extra = 1


@admin.register(CostingSheet)
class CostingSheetAdmin(admin.ModelAdmin):
    list_display = [
        "sheet_number", "title", "status", "version",
        "total_cost", "selling_price", "actual_margin_percent",
    ]
    list_filter = ["status"]
    search_fields = ["sheet_number", "title"]
    inlines = [CostingLineItemInline]


@admin.register(CostingVersion)
class CostingVersionAdmin(admin.ModelAdmin):
    list_display = ["costing_sheet", "version_number", "created_by", "created_at"]


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = [
        "name", "costing_sheet", "projected_total_cost",
        "projected_selling_price", "projected_margin_percent",
    ]
