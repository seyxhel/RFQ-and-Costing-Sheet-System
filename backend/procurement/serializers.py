# ============================================================================
# procurement/serializers.py — Procurement module serializers
# ============================================================================

from rest_framework import serializers
from .models import PurchaseOrder, POLineItem, ActualCost


class POLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default="")

    class Meta:
        model = POLineItem
        fields = [
            "id", "product", "product_name",
            "description", "quantity", "unit",
            "unit_cost", "total_cost",
        ]
        read_only_fields = ["id", "total_cost"]


class ActualCostSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = ActualCost
        fields = [
            "id", "purchase_order", "cost_type",
            "description", "amount",
            "reference_number", "date", "notes",
            "recorded_by", "recorded_by_name", "created_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at"]


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default="")
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    variance = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "title", "status",
            "supplier", "supplier_name",
            "estimated_total", "actual_total", "currency",
            "variance",
            "issue_date", "expected_delivery",
            "created_by_name", "created_at",
        ]

    def get_variance(self, obj):
        return float(obj.estimated_total - obj.actual_total)


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    line_items = POLineItemSerializer(many=True, required=False)
    actual_costs = ActualCostSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default="")
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    variance = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "title", "description", "status",
            "supplier", "supplier_name",
            "rfq", "quotation", "costing_sheet", "budget",
            "estimated_total", "actual_total", "currency",
            "variance",
            "issue_date", "expected_delivery", "actual_delivery",
            "created_by", "created_by_name",
            "line_items", "actual_costs",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "po_number", "created_by",
            "actual_total", "created_at", "updated_at",
        ]

    def get_variance(self, obj):
        return float(obj.estimated_total - obj.actual_total)

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        import datetime
        prefix = datetime.date.today().strftime("PO-%Y%m")
        last = PurchaseOrder.objects.filter(
            po_number__startswith=prefix
        ).order_by("-po_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.po_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = PurchaseOrder.objects.count() + 1
        validated_data["po_number"] = f"{prefix}-{seq:04d}"

        po = PurchaseOrder.objects.create(**validated_data)
        total = 0
        for item_data in items_data:
            item = POLineItem.objects.create(purchase_order=po, **item_data)
            total += float(item.total_cost)
        if not validated_data.get("estimated_total"):
            po.estimated_total = total
            po.save(update_fields=["estimated_total"])
        return po

    def update(self, instance, validated_data):
        items_data = validated_data.pop("line_items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.line_items.all().delete()
            for item_data in items_data:
                POLineItem.objects.create(purchase_order=instance, **item_data)
        return instance
