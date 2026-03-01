from rest_framework import serializers
from .models import PurchaseOrder, POLineItem, ActualCost


class POLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default="")

    class Meta:
        model = POLineItem
        fields = [
            "id", "product", "product_name", "description",
            "quantity", "unit", "unit_cost", "total_cost",
        ]
        read_only_fields = ["id", "total_cost"]


class ActualCostSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True, default="")

    class Meta:
        model = ActualCost
        fields = [
            "id", "purchase_order", "cost_type", "description", "amount",
            "reference_number", "date", "notes",
            "recorded_by", "recorded_by_name", "created_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at"]


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default="")
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")
    variance = serializers.SerializerMethodField()
    variance_percent = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "title", "status",
            "supplier", "supplier_name",
            "estimated_total", "actual_total", "currency",
            "variance", "variance_percent",
            "rfq", "costing_sheet", "budget",
            "issue_date", "expected_delivery", "actual_delivery",
            "created_by_name", "created_at",
        ]

    def get_variance(self, obj):
        return float(obj.estimated_total - obj.actual_total)

    def get_variance_percent(self, obj):
        if obj.estimated_total > 0:
            return round(float(obj.estimated_total - obj.actual_total) / float(obj.estimated_total) * 100, 2)
        return 0


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    line_items = POLineItemSerializer(many=True, required=False)
    actual_costs = ActualCostSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default="")
    variance = serializers.SerializerMethodField()
    variance_percent = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "title", "description", "status",
            "supplier", "supplier_name",
            "rfq", "quotation", "costing_sheet", "budget",
            "estimated_total", "actual_total", "currency",
            "variance", "variance_percent",
            "issue_date", "expected_delivery", "actual_delivery",
            "created_by", "line_items", "actual_costs",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "po_number", "actual_total", "created_by", "created_at", "updated_at"]

    def get_variance(self, obj):
        return float(obj.estimated_total - obj.actual_total)

    def get_variance_percent(self, obj):
        if obj.estimated_total > 0:
            return round(float(obj.estimated_total - obj.actual_total) / float(obj.estimated_total) * 100, 2)
        return 0

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        import datetime
        prefix = datetime.date.today().strftime("PO-%Y%m")
        last = PurchaseOrder.objects.filter(po_number__startswith=prefix).order_by("-po_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.po_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = PurchaseOrder.objects.count() + 1
        validated_data["po_number"] = f"{prefix}-{seq:04d}"
        po = PurchaseOrder.objects.create(**validated_data)
        for item in items_data:
            POLineItem.objects.create(purchase_order=po, **item)
        # Calculate estimated total from line items
        po.estimated_total = sum(li.total_cost for li in po.line_items.all())
        po.save()
        return po

    def update(self, instance, validated_data):
        items_data = validated_data.pop("line_items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.line_items.all().delete()
            for item in items_data:
                POLineItem.objects.create(purchase_order=instance, **item)
            instance.estimated_total = sum(li.total_cost for li in instance.line_items.all())
            instance.save()
        return instance
