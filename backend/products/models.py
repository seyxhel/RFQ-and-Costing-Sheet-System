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
    unit = models.CharField(max_length=30, default="pcs", help_text="Default unit of measure")
    specifications = models.TextField(blank=True, default="", help_text="Technical specs, tolerances, etc.")
    estimated_unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Estimated cost per unit (for RFQ stage estimation)",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.sku} — {self.name}" if self.sku else self.name
