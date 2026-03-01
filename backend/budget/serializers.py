from rest_framework import serializers
from .models import Budget


class BudgetSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, default="")
    rfq_title = serializers.CharField(source="rfq.title", read_only=True, default="")
    costing_sheet_title = serializers.CharField(source="costing_sheet.title", read_only=True, default="")
    utilization_percent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            "id", "budget_number", "title", "description", "status",
            "allocated_amount", "spent_amount", "remaining_amount", "currency",
            "rfq", "rfq_title", "costing_sheet", "costing_sheet_title",
            "created_by", "created_by_name", "approved_by", "approved_by_name",
            "approved_at", "created_at", "updated_at", "utilization_percent",
        ]
        read_only_fields = ["id", "budget_number", "spent_amount", "remaining_amount",
                            "created_by", "approved_by", "approved_at", "created_at", "updated_at"]

    def get_utilization_percent(self, obj):
        if obj.allocated_amount > 0:
            return round(float(obj.spent_amount) / float(obj.allocated_amount) * 100, 2)
        return 0

    def create(self, validated_data):
        import datetime
        prefix = datetime.date.today().strftime("BUD-%Y%m")
        last = Budget.objects.filter(budget_number__startswith=prefix).order_by("-budget_number").first()
        seq = 1
        if last:
            try:
                seq = int(last.budget_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = Budget.objects.count() + 1
        validated_data["budget_number"] = f"{prefix}-{seq:04d}"
        validated_data["remaining_amount"] = validated_data.get("allocated_amount", 0)
        return super().create(validated_data)
