# ============================================================================
# procurement/views.py — Procurement module API views
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import PurchaseOrder, ActualCost
from .serializers import (
    PurchaseOrderListSerializer, PurchaseOrderDetailSerializer,
    ActualCostSerializer,
)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related(
        "supplier", "rfq", "quotation", "costing_sheet", "budget", "created_by",
    ).prefetch_related("line_items", "actual_costs")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        return PurchaseOrderDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(
                Q(po_number__icontains=q) | Q(title__icontains=q)
            )
        return qs

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        po = self.get_object()
        if po.status != PurchaseOrder.Status.DRAFT:
            return Response(
                {"detail": "Only DRAFT POs can be issued."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        po.status = PurchaseOrder.Status.ISSUED
        po.save(update_fields=["status"])
        return Response(PurchaseOrderDetailSerializer(po).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        po = self.get_object()
        po.status = PurchaseOrder.Status.COMPLETED
        po.save(update_fields=["status"])
        return Response(PurchaseOrderDetailSerializer(po).data)


class ActualCostViewSet(viewsets.ModelViewSet):
    queryset = ActualCost.objects.select_related("purchase_order", "recorded_by")
    serializer_class = ActualCostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        po_id = self.request.query_params.get("purchase_order")
        if po_id:
            qs = qs.filter(purchase_order_id=po_id)
        return qs
