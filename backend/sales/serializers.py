# ============================================================================
# sales/serializers.py — Sales module serializers
# ============================================================================

from rest_framework import serializers
from .models import (
    Client,
    FormalQuotation, FormalQuotationItem, QuotationRevision,
    SalesOrder, ContractAnalysis,
)


# --------------------------------------------------------------------------
# Client
# --------------------------------------------------------------------------
class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


# --------------------------------------------------------------------------
# Formal Quotation Item
# --------------------------------------------------------------------------
class FormalQuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormalQuotationItem
        fields = [
            "id", "item_number", "description", "brand", "model_number",
            "quantity", "unit", "unit_price", "amount", "notes",
        ]
        read_only_fields = ["id", "amount"]


# --------------------------------------------------------------------------
# Formal Quotation
# --------------------------------------------------------------------------
class FormalQuotationListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = FormalQuotation
        fields = [
            "id", "quotation_number", "date",
            "client", "client_name", "client_designation",
            "client_contact_number", "project_title",
            "status", "total_amount", "currency",
            "created_by_name", "created_at",
        ]


class FormalQuotationDetailSerializer(serializers.ModelSerializer):
    items = FormalQuotationItemSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    margin_level_label = serializers.CharField(source="margin_level.label", read_only=True, default="")

    class Meta:
        model = FormalQuotation
        fields = [
            "id", "quotation_number", "date",
            "client", "client_name", "client_designation",
            "client_contact_number", "client_address",
            "client_contact", "client_email",
            "project_title", "description", "warranty",
            "rfq", "costing_sheet", "margin_level", "margin_level_label",
            "subtotal", "vat_rate", "vat_amount", "total_amount", "currency",
            "payment_terms", "delivery_terms", "validity_days",
            "terms_and_conditions", "notes",
            "status", "created_by", "created_by_name",
            "items", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "quotation_number", "created_by",
            "subtotal", "vat_amount", "total_amount",
            "created_at", "updated_at",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])

        # Generate quotation number
        import datetime
        prefix = datetime.date.today().strftime("FQ-%Y%m")
        last = FormalQuotation.objects.filter(
            quotation_number__startswith=prefix
        ).order_by("-quotation_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.quotation_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = FormalQuotation.objects.count() + 1
        validated_data["quotation_number"] = f"{prefix}-{seq:04d}"

        quotation = FormalQuotation.objects.create(**validated_data)
        for i, item_data in enumerate(items_data):
            item_data.setdefault("item_number", i + 1)
            FormalQuotationItem.objects.create(quotation=quotation, **item_data)
        quotation.recalculate()
        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        # Track revision if margin level changed
        new_ml = validated_data.get("margin_level")
        if new_ml and instance.margin_level_id and new_ml.id != instance.margin_level_id:
            rev_num = instance.revisions.count() + 1
            old_label = instance.margin_level.label if instance.margin_level else ""
            QuotationRevision.objects.create(
                quotation=instance,
                revision_number=rev_num,
                margin_level_label=old_label,
                total_amount=instance.total_amount,
                subtotal=instance.subtotal,
                vat_amount=instance.vat_amount,
                reason=self.initial_data.get("revision_reason", ""),
                snapshot_items=[
                    {
                        "item_number": it.item_number,
                        "description": it.description,
                        "quantity": str(it.quantity),
                        "unit": it.unit,
                        "unit_price": str(it.unit_price),
                        "amount": str(it.amount),
                    }
                    for it in instance.items.all()
                ],
                changed_by=self.context["request"].user,
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Auto-set REVISED status when editing a REJECTED quotation
        if instance.status == FormalQuotation.Status.REJECTED:
            instance.status = FormalQuotation.Status.REVISED

        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for i, item_data in enumerate(items_data):
                item_data.setdefault("item_number", i + 1)
                FormalQuotationItem.objects.create(quotation=instance, **item_data)
        instance.recalculate()
        return instance


# --------------------------------------------------------------------------
# Quotation Revision
# --------------------------------------------------------------------------
class QuotationRevisionSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(
        source="changed_by.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = QuotationRevision
        fields = [
            "id", "quotation", "revision_number",
            "margin_level_label", "total_amount", "subtotal", "vat_amount",
            "reason", "snapshot_items",
            "changed_by", "changed_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# --------------------------------------------------------------------------
# Sales Order
# --------------------------------------------------------------------------
class SalesOrderListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id", "so_number", "date",
            "client_name", "project_title",
            "contract_amount", "currency",
            "status", "awarded_date",
            "created_by_name", "created_at",
        ]


class SalesOrderDetailSerializer(serializers.ModelSerializer):
    contract_analyses = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id", "so_number", "date",
            "client_name", "project_title", "description",
            "formal_quotation", "rfq", "costing_sheet",
            "contract_amount", "vat_rate", "currency",
            "status", "awarded_date",
            "created_by", "created_by_name",
            "contract_analyses",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "so_number", "created_by",
            "created_at", "updated_at",
        ]

    def get_contract_analyses(self, obj):
        return ContractAnalysisSerializer(
            obj.contract_analyses.all(), many=True
        ).data

    def create(self, validated_data):
        import datetime
        prefix = datetime.date.today().strftime("SO-%Y%m")
        last = SalesOrder.objects.filter(
            so_number__startswith=prefix
        ).order_by("-so_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.so_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = SalesOrder.objects.count() + 1
        validated_data["so_number"] = f"{prefix}-{seq:04d}"
        return SalesOrder.objects.create(**validated_data)


# --------------------------------------------------------------------------
# Contract Analysis
# --------------------------------------------------------------------------
class ContractAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractAnalysis
        fields = [
            "id", "sales_order", "name",
            "contract_price", "vat_ex_amount", "vat_amount",
            "warranty_security", "ewt_amount", "lgu_amount",
            "facilitation", "cogs", "implementation",
            "total_deductions",
            "net_cash_flow", "net_cash_flow_percent", "net_benefit",
            "output_vat", "input_vat", "vat_payable",
            "notes", "created_at",
        ]
        read_only_fields = [
            "id",
            "vat_ex_amount", "vat_amount", "total_deductions",
            "net_cash_flow", "net_cash_flow_percent",
            "output_vat", "input_vat", "vat_payable",
            "created_at",
        ]

    def create(self, validated_data):
        analysis = ContractAnalysis.objects.create(**validated_data)
        analysis.recalculate()
        return analysis

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.recalculate()
        return instance
