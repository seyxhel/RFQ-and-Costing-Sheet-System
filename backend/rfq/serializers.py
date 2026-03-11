# ============================================================================
# rfq/serializers.py — RFQ module serializers
# ============================================================================

from rest_framework import serializers
from .models import Supplier, RFQ, RFQItem, Quotation, QuotationItem, ApprovalLog
from products.models import Product


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


# --------------------------------------------------------------------------
# RFQ Items
# --------------------------------------------------------------------------
class RFQItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True, default="")

    class Meta:
        model = RFQItem
        fields = [
            "id", "product", "product_name", "item_number",
            "item_name", "brand", "model_number",
            "description", "quantity", "unit", "specifications",
        ]
        read_only_fields = ["id"]


# --------------------------------------------------------------------------
# RFQ
# --------------------------------------------------------------------------
class RFQListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)
    quotation_count = serializers.IntegerField(source="quotations.count", read_only=True)

    class Meta:
        model = RFQ
        fields = [
            "id", "rfq_number", "title", "project_title", "client_name",
            "company_name", "status", "priority",
            "issue_date", "deadline", "created_by_name",
            "item_count", "quotation_count", "created_at",
        ]


class RFQDetailSerializer(serializers.ModelSerializer):
    items = RFQItemSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = RFQ
        fields = [
            "id", "rfq_number", "title", "description",
            "project_title", "client_name", "company_name",
            "status", "priority",
            "issue_date", "deadline", "suppliers",
            "created_by", "created_by_name", "approved_by",
            "items", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "rfq_number", "created_by", "approved_by", "created_at", "updated_at"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        suppliers_data = validated_data.pop("suppliers", [])
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
        for i, item_data in enumerate(items_data):
            item_data.setdefault("item_number", i + 1)
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
            instance.items.all().delete()
            for i, item_data in enumerate(items_data):
                item_data.setdefault("item_number", i + 1)
                RFQItem.objects.create(rfq=instance, **item_data)
        return instance


# --------------------------------------------------------------------------
# Quotation Items (supplier canvass data)
# --------------------------------------------------------------------------
class QuotationItemSerializer(serializers.ModelSerializer):
    rfq_item_name = serializers.CharField(source="rfq_item.item_name", read_only=True)

    class Meta:
        model = QuotationItem
        fields = [
            "id", "rfq_item", "rfq_item_name",
            "offer_type", "brand", "model_number", "description",
            "quantity", "unit", "unit_price", "amount",
            "vat_type", "vat_rate", "unit_price_vat_ex", "vat_amount",
            "availability", "availability_detail",
            "warranty_period", "warranty_detail",
            "price_validity", "tax_type", "remarks", "reference",
            "price_proposal",
            "delivery_days", "notes",
        ]
        read_only_fields = ["id", "amount", "unit_price_vat_ex", "vat_amount"]


# --------------------------------------------------------------------------
# Quotation (supplier response)
# --------------------------------------------------------------------------
class QuotationListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_rating = serializers.DecimalField(source="supplier.rating", max_digits=3, decimal_places=2, read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "id", "rfq", "supplier", "supplier_name", "quotation_number",
            "status", "total_amount", "currency", "delivery_days",
            "payment_terms", "supplier_rating", "submitted_at",
        ]


class QuotationDetailSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "id", "rfq", "supplier", "supplier_name", "quotation_number",
            "status", "total_amount", "currency", "delivery_days",
            "payment_terms", "validity_days",
            "notes", "items", "submitted_at", "updated_at",
        ]
        read_only_fields = ["id", "submitted_at", "updated_at"]

    @staticmethod
    def _auto_register_products(quotation):
        """Silently register canvass items into Product Catalog if not already existing."""
        for qi in quotation.items.select_related("rfq_item").all():
            rfq_item = qi.rfq_item
            item_name = qi.brand and qi.brand.strip() or rfq_item.item_name
            brand = qi.brand or rfq_item.brand
            model_number = qi.model_number or rfq_item.model_number
            supplier = quotation.supplier

            exists = Product.objects.filter(
                name__iexact=rfq_item.item_name,
                brand__iexact=brand,
                model_number__iexact=model_number,
                supplier=supplier,
            ).exists()
            if exists:
                continue

            # Auto-generate SKU
            last = Product.objects.filter(sku__startswith="PRD-").order_by("-sku").first()
            if last and last.sku.startswith("PRD-"):
                try:
                    num = int(last.sku.split("-")[1]) + 1
                except (ValueError, IndexError):
                    num = Product.objects.count() + 1
            else:
                num = 1

            Product.objects.create(
                sku=f"PRD-{num:05d}",
                name=rfq_item.item_name,
                brand=brand,
                model_number=model_number,
                description=qi.description or rfq_item.description,
                unit=qi.unit or rfq_item.unit,
                specifications=rfq_item.specifications,
                supplier=supplier,
            )

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        quotation = Quotation.objects.create(**validated_data)
        for item_data in items_data:
            QuotationItem.objects.create(quotation=quotation, **item_data)
        quotation.recalculate_total()
        self._auto_register_products(quotation)
        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                QuotationItem.objects.create(quotation=instance, **item_data)
        instance.recalculate_total()
        self._auto_register_products(instance)
        return instance


class ApprovalLogSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source="approver.get_full_name", read_only=True)

    class Meta:
        model = ApprovalLog
        fields = [
            "id", "rfq", "approver", "approver_name", "action",
            "level", "comments", "created_at",
        ]
        read_only_fields = ["id", "approver", "created_at"]
