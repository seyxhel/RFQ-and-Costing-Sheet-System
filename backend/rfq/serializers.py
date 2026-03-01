# ============================================================================
# rfq/serializers.py — DRF serializers for the RFQ module
# ============================================================================
# Nested serializers for RFQ → Items and Quotation → Items.
# Supports create/update with nested line items in a single request.
# ============================================================================

from rest_framework import serializers
from .models import Supplier, RFQ, RFQItem, Quotation, QuotationItem, ApprovalLog


# --------------------------------------------------------------------------
# Supplier
# --------------------------------------------------------------------------
class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


# --------------------------------------------------------------------------
# RFQ Items (nested inside RFQ)
# --------------------------------------------------------------------------
class RFQItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default="")

    class Meta:
        model = RFQItem
        fields = [
            "id", "product", "product_name", "item_name", "description",
            "quantity", "unit", "specifications", "inventory_item_id",
        ]
        read_only_fields = ["id"]


# --------------------------------------------------------------------------
# RFQ
# --------------------------------------------------------------------------
class RFQListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)
    quotation_count = serializers.IntegerField(source="quotations.count", read_only=True)

    class Meta:
        model = RFQ
        fields = [
            "id", "rfq_number", "title", "status", "priority",
            "issue_date", "deadline", "created_by_name",
            "item_count", "quotation_count", "created_at",
        ]


class RFQDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with nested items."""
    items = RFQItemSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = RFQ
        fields = [
            "id", "rfq_number", "title", "description", "status", "priority",
            "issue_date", "deadline", "suppliers", "created_by", "created_by_name",
            "approved_by", "items", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "rfq_number", "created_by", "approved_by", "created_at", "updated_at"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        suppliers_data = validated_data.pop("suppliers", [])
        # Auto-generate rfq_number
        import datetime
        prefix = datetime.date.today().strftime("RFQ-%Y%m")
        last = RFQ.objects.filter(rfq_number__startswith=prefix).order_by("-rfq_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.rfq_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = RFQ.objects.count() + 1
        validated_data["rfq_number"] = f"{prefix}-{seq:04d}"
        rfq = RFQ.objects.create(**validated_data)
        rfq.suppliers.set(suppliers_data)

        for item_data in items_data:
            RFQItem.objects.create(rfq=rfq, **item_data)
        return rfq

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        suppliers_data = validated_data.pop("suppliers", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if suppliers_data is not None:
            instance.suppliers.set(suppliers_data)

        if items_data is not None:
            # Replace all items (simple strategy; could be enhanced with PATCH)
            instance.items.all().delete()
            for item_data in items_data:
                RFQItem.objects.create(rfq=instance, **item_data)

        return instance


# --------------------------------------------------------------------------
# Quotation Items
# --------------------------------------------------------------------------
class QuotationItemSerializer(serializers.ModelSerializer):
    rfq_item_name = serializers.CharField(source="rfq_item.item_name", read_only=True)

    class Meta:
        model = QuotationItem
        fields = [
            "id", "rfq_item", "rfq_item_name", "unit_price",
            "quantity", "total_price", "delivery_days", "notes",
        ]
        read_only_fields = ["id", "total_price"]


# --------------------------------------------------------------------------
# Quotation
# --------------------------------------------------------------------------
class QuotationListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_rating = serializers.DecimalField(
        source="supplier.rating", max_digits=3, decimal_places=2, read_only=True
    )

    class Meta:
        model = Quotation
        fields = [
            "id", "rfq", "supplier", "supplier_name", "quotation_number",
            "status", "total_amount", "currency", "delivery_days",
            "payment_terms", "supplier_rating",
            "submitted_at",
        ]


class QuotationDetailSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "id", "rfq", "supplier", "supplier_name", "quotation_number",
            "status", "total_amount", "currency", "delivery_days",
            "payment_terms", "warranty_terms", "validity_days",
            "notes", "items", "submitted_at", "updated_at",
        ]
        read_only_fields = ["id", "submitted_at", "updated_at"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        quotation = Quotation.objects.create(**validated_data)
        for item_data in items_data:
            QuotationItem.objects.create(quotation=quotation, **item_data)
        # Recalculate total
        quotation.total_amount = sum(
            qi.total_price for qi in quotation.items.all()
        )
        quotation.save()
        return quotation


# --------------------------------------------------------------------------
# Quotation Comparison (read-only, flattened for side-by-side display)
# --------------------------------------------------------------------------
class QuotationComparisonSerializer(serializers.Serializer):
    """
    Custom serializer to compare quotations for a given RFQ.
    Returns a list of quotations with items aligned by rfq_item.
    """
    rfq_id = serializers.IntegerField()
    rfq_number = serializers.CharField()
    quotations = QuotationListSerializer(many=True)
    comparison_matrix = serializers.ListField(
        child=serializers.DictField(),
        help_text="Rows = RFQ items, columns = supplier prices",
    )


# --------------------------------------------------------------------------
# Approval Log
# --------------------------------------------------------------------------
class ApprovalLogSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source="approver.get_full_name", read_only=True)

    class Meta:
        model = ApprovalLog
        fields = [
            "id", "rfq", "approver", "approver_name", "action",
            "level", "comments", "created_at",
        ]
        read_only_fields = ["id", "approver", "created_at"]
