# ============================================================================
# products/models.py — Product/Item Catalog
# ============================================================================

from django.db import models


class Category(models.Model):
    """Product categories for organization (e.g., IT Equipment, Office Supplies)."""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Reusable product/item catalog. Users can search/select from here
    when creating RFQ line items or costing line items.
    """
    sku = models.CharField(
        max_length=50, unique=True, blank=True,
        help_text="Stock Keeping Unit / internal code — auto-generated if left empty",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="products",
    )
    brand = models.CharField(max_length=255, blank=True, default="")
    model_number = models.CharField(max_length=255, blank=True, default="")
    unit = models.CharField(max_length=30, default="pcs", help_text="Default unit of measure")
    specifications = models.TextField(blank=True, default="", help_text="Technical specs, tolerances, etc.")
    estimated_unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Estimated cost per unit (for RFQ stage estimation)",
    )

    # Project-based links — a product is registered for a specific RFQ/supplier
    rfq = models.ForeignKey(
        "rfq.RFQ", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="products",
        help_text="The RFQ this product is planned for",
    )
    supplier = models.ForeignKey(
        "rfq.Supplier", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="products",
        help_text="The supplier this product will be sourced from",
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.sku} — {self.name}" if self.sku else self.name
