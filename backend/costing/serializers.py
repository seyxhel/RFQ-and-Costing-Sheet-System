# ============================================================================
# costing/serializers.py — DRF serializers for the Costing Sheet module
# ============================================================================

from rest_framework import serializers
from .models import CostingSheet, CostingLineItem, CostingVersion, Scenario


# --------------------------------------------------------------------------
# Costing Line Item
# --------------------------------------------------------------------------
class CostingLineItemSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default="")

    class Meta:
        model = CostingLineItem
        fields = [
            "id", "cost_type", "description", "quantity", "unit",
            "unit_cost", "material_cost", "labor_cost", "overhead_cost",
            "logistics_cost", "total_cost", "quotation_item", "supplier",
            "supplier_name", "notes",
        ]
        read_only_fields = [
            "id", "material_cost", "labor_cost", "overhead_cost",
            "logistics_cost", "total_cost",
        ]


# --------------------------------------------------------------------------
# Costing Sheet
# --------------------------------------------------------------------------
class CostingSheetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    line_item_count = serializers.IntegerField(source="line_items.count", read_only=True)

    class Meta:
        model = CostingSheet
        fields = [
            "id", "sheet_number", "title", "status", "version",
            "total_cost", "selling_price", "actual_margin_percent",
            "currency", "created_by_name", "line_item_count",
            "created_at", "updated_at",
        ]


class CostingSheetDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with nested line items."""
    line_items = CostingLineItemSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = CostingSheet
        fields = [
            "id", "sheet_number", "title", "description", "status", "version",
            "total_material_cost", "total_labor_cost", "total_overhead_cost",
            "total_logistics_cost", "total_cost",
            "target_margin_percent", "selling_price", "actual_margin_percent",
            "currency", "rfq",
            "created_by", "created_by_name", "approved_by",
            "line_items", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "sheet_number", "created_by", "approved_by",
            "total_material_cost", "total_labor_cost",
            "total_overhead_cost", "total_logistics_cost", "total_cost",
            "selling_price", "actual_margin_percent",
            "created_at", "updated_at",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        # Auto-generate sheet_number
        import datetime
        prefix = datetime.date.today().strftime("CS-%Y%m")
        last = CostingSheet.objects.filter(sheet_number__startswith=prefix).order_by("-sheet_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.sheet_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = CostingSheet.objects.count() + 1
        validated_data["sheet_number"] = f"{prefix}-{seq:04d}"
        sheet = CostingSheet.objects.create(**validated_data)
        for item_data in items_data:
            CostingLineItem.objects.create(costing_sheet=sheet, **item_data)
        sheet.recalculate_totals()
        return sheet

    def update(self, instance, validated_data):
        items_data = validated_data.pop("line_items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.line_items.all().delete()
            for item_data in items_data:
                CostingLineItem.objects.create(costing_sheet=instance, **item_data)

        instance.recalculate_totals()
        return instance


# --------------------------------------------------------------------------
# Costing Version (read-only)
# --------------------------------------------------------------------------
class CostingVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = CostingVersion
        fields = [
            "id", "costing_sheet", "version_number", "snapshot_data",
            "change_summary", "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# --------------------------------------------------------------------------
# Scenario (What-If Analysis)
# --------------------------------------------------------------------------
class ScenarioSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Scenario
        fields = [
            "id", "costing_sheet", "name", "description", "overrides",
            "projected_total_cost", "projected_selling_price",
            "projected_margin_percent", "created_by", "created_by_name",
            "created_at",
        ]
        read_only_fields = [
            "id", "created_by", "projected_total_cost",
            "projected_selling_price", "projected_margin_percent", "created_at",
        ]


# --------------------------------------------------------------------------
# Export / Report serializer (flattened for CSV/PDF export)
# --------------------------------------------------------------------------
class CostingReportSerializer(serializers.Serializer):
    """Read-only serializer for exporting costing reports."""
    sheet_number = serializers.CharField()
    title = serializers.CharField()
    version = serializers.IntegerField()
    total_material_cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_labor_cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_overhead_cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_logistics_cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=14, decimal_places=2)
    target_margin_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    selling_price = serializers.DecimalField(max_digits=14, decimal_places=2)
    actual_margin_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    line_items = CostingLineItemSerializer(many=True)
