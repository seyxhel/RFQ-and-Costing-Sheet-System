from django.contrib import admin
from .models import Supplier, RFQ, RFQItem, Quotation, QuotationItem, ApprovalLog


class RFQItemInline(admin.TabularInline):
    model = RFQItem
    extra = 1


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 1


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ["name", "contact_person", "email", "rating", "is_active"]
    list_filter = ["is_active", "rating"]
    search_fields = ["name", "contact_person", "email"]


@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ["rfq_number", "title", "status", "priority", "deadline", "created_by"]
    list_filter = ["status", "priority"]
    search_fields = ["rfq_number", "title"]
    inlines = [RFQItemInline]


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ["quotation_number", "rfq", "supplier", "total_amount", "status"]
    list_filter = ["status"]
    inlines = [QuotationItemInline]


@admin.register(ApprovalLog)
class ApprovalLogAdmin(admin.ModelAdmin):
    list_display = ["rfq", "approver", "action", "level", "created_at"]
    list_filter = ["action", "level"]
