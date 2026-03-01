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

    class Meta:
        model = Product
        fields = [
            "id", "sku", "name", "description", "category", "category_name",
            "unit", "specifications", "estimated_unit_cost",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        # Auto-generate SKU if not provided
        if not validated_data.get("sku"):
            import datetime
            prefix = "PRD"
            count = Product.objects.count() + 1
            validated_data["sku"] = f"{prefix}-{count:05d}"
        return super().create(validated_data)
