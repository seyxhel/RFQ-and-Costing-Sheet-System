# ============================================================================
# budget/serializers.py — Budget module serializers
# ============================================================================

from rest_framework import serializers
from .models import Budget


class BudgetListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    rfq_number = serializers.CharField(source="rfq.rfq_number", read_only=True, default="")
    utilization_percent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id", "budget_number", "title", "status",
            "allocated_amount", "spent_amount", "remaining_amount",
            "currency", "rfq", "rfq_number", "costing_sheet", "sales_order",
            "utilization_percent",
            "created_by_name", "created_at",
        ]

    def get_utilization_percent(self, obj):
        if obj.allocated_amount and obj.allocated_amount > 0:
            return round(float(obj.spent_amount / obj.allocated_amount * 100), 2)
        return 0.0


class BudgetDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    utilization_percent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id", "budget_number", "title", "description", "status",
            "allocated_amount", "spent_amount", "remaining_amount", "currency",
            "rfq", "costing_sheet", "sales_order",
            "created_by", "created_by_name", "approved_by", "approved_at",
            "utilization_percent",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "budget_number", "created_by", "approved_by", "approved_at",
            "spent_amount", "remaining_amount",
            "created_at", "updated_at",
        ]

    def get_utilization_percent(self, obj):
        if obj.allocated_amount and obj.allocated_amount > 0:
            return round(float(obj.spent_amount / obj.allocated_amount * 100), 2)
        return 0.0

    def create(self, validated_data):
        import datetime
        prefix = datetime.date.today().strftime("BUD-%Y%m")
        last = Budget.objects.filter(
            budget_number__startswith=prefix
        ).order_by("-budget_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.budget_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = Budget.objects.count() + 1
        validated_data["budget_number"] = f"{prefix}-{seq:04d}"
        validated_data["remaining_amount"] = validated_data.get("allocated_amount", 0)
        return Budget.objects.create(**validated_data)
