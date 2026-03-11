# ============================================================================
# products/serializers.py — Product catalog serializers
# ============================================================================

from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "is_active", "product_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    rfq_number = serializers.CharField(source="rfq.rfq_number", read_only=True, default="")
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default="")

    class Meta:
        model = Product
        fields = [
            "id", "sku", "name", "description",
            "category", "category_name",
            "brand", "model_number",
            "unit", "specifications",
            "estimated_unit_cost",
            "rfq", "rfq_number",
            "supplier", "supplier_name",
            "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    @staticmethod
    def _generate_sku():
        """Auto-generate SKU in format PRD-00001."""
        last = Product.objects.filter(sku__startswith="PRD-").order_by("-sku").first()
        if last and last.sku.startswith("PRD-"):
            try:
                num = int(last.sku.split("-")[1]) + 1
            except (ValueError, IndexError):
                num = 1
        else:
            num = 1
        return f"PRD-{num:05d}"

    def create(self, validated_data):
        if not validated_data.get("sku"):
            validated_data["sku"] = self._generate_sku()
        return super().create(validated_data)
