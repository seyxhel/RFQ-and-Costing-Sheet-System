from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from accounts.models import AuditLog, log_action
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["name"]

    def perform_create(self, serializer):
        obj = serializer.save()
        log_action(request=self.request, module=AuditLog.Module.PRODUCTS,
                   action=AuditLog.ActionType.CREATE, object_type="Category",
                   object_id=obj.id, object_repr=obj.name)

    def perform_update(self, serializer):
        obj = serializer.save()
        log_action(request=self.request, module=AuditLog.Module.PRODUCTS,
                   action=AuditLog.ActionType.UPDATE, object_type="Category",
                   object_id=obj.id, object_repr=obj.name)

    def perform_destroy(self, instance):
        log_action(request=self.request, module=AuditLog.Module.PRODUCTS,
                   action=AuditLog.ActionType.DELETE, object_type="Category",
                   object_id=instance.id, object_repr=instance.name)
        instance.delete()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "rfq", "supplier").all()
    serializer_class = ProductSerializer
    search_fields = ["name", "sku", "description", "specifications"]
    filterset_fields = ["category", "is_active", "rfq", "supplier"]

    def perform_create(self, serializer):
        obj = serializer.save()
        log_action(request=self.request, module=AuditLog.Module.PRODUCTS,
                   action=AuditLog.ActionType.CREATE, object_type="Product",
                   object_id=obj.id, object_repr=f"{obj.sku} — {obj.name}")

    def perform_update(self, serializer):
        obj = serializer.save()
        log_action(request=self.request, module=AuditLog.Module.PRODUCTS,
                   action=AuditLog.ActionType.UPDATE, object_type="Product",
                   object_id=obj.id, object_repr=f"{obj.sku} — {obj.name}")

    def perform_destroy(self, instance):
        log_action(request=self.request, module=AuditLog.Module.PRODUCTS,
                   action=AuditLog.ActionType.DELETE, object_type="Product",
                   object_id=instance.id, object_repr=f"{instance.sku} — {instance.name}")
        instance.delete()
