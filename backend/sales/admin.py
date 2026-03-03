# ============================================================================
# sales/admin.py — Sales module admin registration
# ============================================================================

from django.contrib import admin
from .models import FormalQuotation, FormalQuotationItem, SalesOrder, ContractAnalysis


class FormalQuotationItemInline(admin.TabularInline):
    model = FormalQuotationItem
    extra = 0
    readonly_fields = ["amount"]


class ContractAnalysisInline(admin.StackedInline):
    model = ContractAnalysis
    extra = 0


@admin.register(FormalQuotation)
class FormalQuotationAdmin(admin.ModelAdmin):
    list_display = [
        "quotation_number", "client_name", "project_title",
        "status", "total_amount", "date",
    ]
    list_filter = ["status"]
    search_fields = ["quotation_number", "client_name", "project_title"]
    inlines = [FormalQuotationItemInline]


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = [
        "so_number", "client_name", "project_title",
        "contract_amount", "status", "awarded_date",
    ]
    list_filter = ["status"]
    search_fields = ["so_number", "client_name", "project_title"]
    inlines = [ContractAnalysisInline]
