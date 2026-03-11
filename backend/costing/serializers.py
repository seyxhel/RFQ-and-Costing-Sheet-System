# ============================================================================
# costing/serializers.py — Costing module serializers
# ============================================================================

from rest_framework import serializers
from .models import (
    CostCategory, CommissionRole,
    CostingSheet, CostingLineItem,
    CostingMarginLevel, CostingCommissionSplit,
    CostingVersion, Scenario,
)


# --------------------------------------------------------------------------
# Cost Category (CRUD-configurable)
# --------------------------------------------------------------------------
class CostCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCategory
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


# --------------------------------------------------------------------------
# Commission Role (CRUD-configurable)
# --------------------------------------------------------------------------
class CommissionRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionRole
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


# --------------------------------------------------------------------------
# Commission Split
# --------------------------------------------------------------------------
class CostingCommissionSplitSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = CostingCommissionSplit
        fields = ["id", "role", "role_name", "percent", "amount"]
        read_only_fields = ["id", "amount"]


# --------------------------------------------------------------------------
# Margin Level (Low / Medium / High)
# --------------------------------------------------------------------------
class CostingMarginLevelSerializer(serializers.ModelSerializer):
    commission_splits = CostingCommissionSplitSerializer(many=True, read_only=True)

    class Meta:
        model = CostingMarginLevel
        fields = [
            "id", "label",
            # Input percentages
            "facilitation_percent", "desired_margin_percent",
            "jv_cost_percent", "cost_of_money_percent",
            "municipal_tax_percent",
            "others_1_percent", "others_1_label",
            "others_2_percent", "others_2_label",
            "commission_percent",
            # Government deduction rates
            "withholding_tax_percent", "creditable_tax_percent",
            "warranty_security_percent",
            # Computed: selling price build-up
            "facilitation_amount", "desired_margin_amount",
            "jv_cost_amount", "cost_of_money_amount",
            "municipal_tax_amount",
            "others_1_amount", "others_2_amount",
            "gross_selling_vat_ex", "vat_amount", "net_selling_vat_inc",
            # Computed: government deductions
            "withholding_tax_amount", "creditable_tax_amount",
            "warranty_security_amount", "total_govt_deduction",
            "net_amount_due",
            # Computed: profitability
            "municipal_tax_revenue_amount", "net_take_home",
            "earning_before_vat", "output_vat", "input_vat",
            "vat_payable", "earning_after_vat",
            "commission_amount", "net_profit", "actual_margin_percent",
            # Nested
            "commission_splits",
        ]
        read_only_fields = [
            "id",
            "facilitation_amount", "desired_margin_amount",
            "jv_cost_amount", "cost_of_money_amount",
            "municipal_tax_amount",
            "others_1_amount", "others_2_amount",
            "gross_selling_vat_ex", "vat_amount", "net_selling_vat_inc",
            "withholding_tax_amount", "creditable_tax_amount",
            "warranty_security_amount", "total_govt_deduction",
            "net_amount_due",
            "municipal_tax_revenue_amount", "net_take_home",
            "earning_before_vat", "output_vat", "input_vat",
            "vat_payable", "earning_after_vat",
            "commission_amount", "net_profit", "actual_margin_percent",
        ]


class CostingMarginLevelWriteSerializer(serializers.ModelSerializer):
    """Slim serializer for writing margin-level input percentages."""

    class Meta:
        model = CostingMarginLevel
        fields = [
            "label",
            "facilitation_percent", "desired_margin_percent",
            "jv_cost_percent", "cost_of_money_percent",
            "municipal_tax_percent",
            "others_1_percent", "others_1_label",
            "others_2_percent", "others_2_label",
            "commission_percent",
            "withholding_tax_percent", "creditable_tax_percent",
            "warranty_security_percent",
        ]


# --------------------------------------------------------------------------
# Costing Line Item
# --------------------------------------------------------------------------
class CostingLineItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    has_input_vat = serializers.BooleanField(source="category.has_input_vat", read_only=True)

    class Meta:
        model = CostingLineItem
        fields = [
            "id", "category", "category_name", "has_input_vat",
            "description", "amount", "total_cost",
            "quotation_item", "supplier", "notes", "sort_order",
        ]
        read_only_fields = ["id", "total_cost"]


# --------------------------------------------------------------------------
# Costing Sheet — List / Detail
# --------------------------------------------------------------------------
class CostingSheetListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    rfq_number = serializers.CharField(source="rfq.rfq_number", read_only=True, default="")
    margin_level_count = serializers.IntegerField(source="margin_levels.count", read_only=True)

    class Meta:
        model = CostingSheet
        fields = [
            "id", "sheet_number", "title", "project_title", "client_name",
            "status", "version", "total_project_cost", "currency",
            "rfq", "rfq_number", "margin_level_count",
            "created_by_name", "created_at", "updated_at",
        ]


class CostingSheetDetailSerializer(serializers.ModelSerializer):
    line_items = CostingLineItemSerializer(many=True, required=False)
    margin_levels = CostingMarginLevelSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    rfq_number = serializers.CharField(source="rfq.rfq_number", read_only=True, default="")

    class Meta:
        model = CostingSheet
        fields = [
            "id", "sheet_number", "title", "description",
            "project_title", "client_name", "date", "warranty",
            "status", "version",
            "total_cost", "contingency_percent", "contingency_amount",
            "total_project_cost", "vat_rate", "commission_rate", "currency",
            "rfq", "rfq_number",
            "created_by", "created_by_name", "approved_by",
            "line_items", "margin_levels",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "sheet_number", "created_by", "approved_by",
            "total_cost", "contingency_amount", "total_project_cost",
            "created_at", "updated_at",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        margin_levels_data = self.initial_data.get("margin_levels", [])

        # Generate sheet number
        import datetime
        prefix = datetime.date.today().strftime("QUO-%Y%m")
        last = CostingSheet.objects.filter(
            sheet_number__startswith=prefix
        ).order_by("-sheet_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.sheet_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = CostingSheet.objects.count() + 1
        validated_data["sheet_number"] = f"{prefix}-{seq:04d}"

        sheet = CostingSheet.objects.create(**validated_data)

        # Create line items
        for item_data in items_data:
            CostingLineItem.objects.create(costing_sheet=sheet, **item_data)

        # Create 3 default margin levels if none provided
        if not margin_levels_data:
            margin_levels_data = [
                {"label": "VERY_LOW", "desired_margin_percent": "10.00"},
                {"label": "LOW", "desired_margin_percent": "20.00"},
                {"label": "MEDIUM_LOW", "desired_margin_percent": "30.00"},
                {"label": "MEDIUM_HIGH", "desired_margin_percent": "40.00"},
                {"label": "HIGH", "desired_margin_percent": "50.00"},
                {"label": "VERY_HIGH", "desired_margin_percent": "60.00"},
            ]

        for ml_data in margin_levels_data:
            ml_ser = CostingMarginLevelWriteSerializer(data=ml_data)
            ml_ser.is_valid(raise_exception=True)
            ml = CostingMarginLevel.objects.create(
                costing_sheet=sheet, **ml_ser.validated_data
            )
            # Create default commission splits
            for role in CommissionRole.objects.filter(is_active=True):
                CostingCommissionSplit.objects.create(
                    margin_level=ml, role=role, percent=role.default_percent,
                )

        # Recalculate everything
        sheet.recalculate()
        return sheet

    def update(self, instance, validated_data):
        items_data = validated_data.pop("line_items", None)
        margin_levels_data = self.initial_data.get("margin_levels", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Replace line items if provided
        if items_data is not None:
            instance.line_items.all().delete()
            for item_data in items_data:
                CostingLineItem.objects.create(costing_sheet=instance, **item_data)

        # Update margin levels if provided
        if margin_levels_data is not None:
            submitted_labels = {ml_data.get("label") for ml_data in margin_levels_data if ml_data.get("label")}
            # Remove margin levels no longer submitted (e.g. custom removed)
            instance.margin_levels.exclude(label__in=submitted_labels).delete()
            for ml_data in margin_levels_data:
                label = ml_data.get("label")
                if label:
                    ml, _ = CostingMarginLevel.objects.get_or_create(
                        costing_sheet=instance, label=label,
                    )
                    ml_ser = CostingMarginLevelWriteSerializer(ml, data=ml_data, partial=True)
                    if ml_ser.is_valid():
                        ml_ser.save()

        instance.recalculate()
        return instance


# --------------------------------------------------------------------------
# Version & Scenario
# --------------------------------------------------------------------------
class CostingVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = CostingVersion
        fields = [
            "id", "costing_sheet", "version_number", "snapshot_data",
            "change_summary", "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]


class ScenarioSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Scenario
        fields = [
            "id", "costing_sheet", "name", "description", "overrides",
            "projected_total_cost", "projected_selling_price",
            "projected_margin_percent",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = [
            "id", "created_by", "created_at",
            "projected_total_cost", "projected_selling_price",
            "projected_margin_percent",
        ]
