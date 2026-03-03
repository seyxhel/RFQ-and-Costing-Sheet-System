# ============================================================================
# rfq/admin.py — RFQ module admin registration
# ============================================================================

from django.contrib import admin
from .models import Supplier, RFQ, RFQItem, Quotation, QuotationItem, ApprovalLog


class RFQItemInline(admin.TabularInline):
    model = RFQItem
    extra = 0


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 0
    readonly_fields = ["amount", "unit_price_vat_ex", "vat_amount"]


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ["name", "contact_person", "email", "phone", "rating", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "contact_person", "email"]


@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ["rfq_number", "title", "client_name", "status", "priority", "issue_date"]
    list_filter = ["status", "priority"]
    search_fields = ["rfq_number", "title", "client_name", "project_title"]
    inlines = [RFQItemInline]


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ["quotation_number", "rfq", "supplier", "status", "total_amount"]
    list_filter = ["status"]
    search_fields = ["quotation_number"]
    inlines = [QuotationItemInline]


@admin.register(ApprovalLog)
class ApprovalLogAdmin(admin.ModelAdmin):
    list_display = ["rfq", "approver", "action", "level", "created_at"]
    list_filter = ["action"]
