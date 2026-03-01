from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F
from .models import PurchaseOrder, POLineItem, ActualCost
from .serializers import (
    PurchaseOrderListSerializer, PurchaseOrderDetailSerializer,
    POLineItemSerializer, ActualCostSerializer,
)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related(
        "supplier", "rfq", "quotation", "costing_sheet", "budget", "created_by"
    ).all()
    filterset_fields = ["status", "supplier", "rfq", "costing_sheet", "budget"]
    search_fields = ["title", "po_number"]

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        return PurchaseOrderDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        po = self.get_object()
        po.status = "ISSUED"
        po.save()
        return Response({"status": "issued"})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        po = self.get_object()
        po.status = "COMPLETED"
        po.save()
        # Recalculate linked budget
        if po.budget:
            po.budget.recalculate()
        return Response({"status": "completed"})

    @action(detail=False, methods=["get"])
    def variance_summary(self, request):
        """Variance monitoring — overview of all POs with estimated vs actual."""
        pos = PurchaseOrder.objects.exclude(status="CANCELLED").exclude(status="DRAFT")
        summary = pos.aggregate(
            total_estimated=Sum("estimated_total"),
            total_actual=Sum("actual_total"),
        )
        total_est = float(summary["total_estimated"] or 0)
        total_act = float(summary["total_actual"] or 0)

        # Per-PO variance
        po_list = pos.values(
            "id", "po_number", "title", "status",
            "estimated_total", "actual_total",
        )
        items = []
        for po in po_list:
            est = float(po["estimated_total"])
            act = float(po["actual_total"])
            variance = est - act
            pct = round(variance / est * 100, 2) if est > 0 else 0
            items.append({
                **po,
                "estimated_total": est,
                "actual_total": act,
                "variance": variance,
                "variance_percent": pct,
                "status_color": "green" if variance >= 0 else "red",
            })

        return Response({
            "total_estimated": total_est,
            "total_actual": total_act,
            "total_variance": total_est - total_act,
            "total_variance_percent": round((total_est - total_act) / total_est * 100, 2) if total_est > 0 else 0,
            "items": items,
        })


class ActualCostViewSet(viewsets.ModelViewSet):
    queryset = ActualCost.objects.select_related("purchase_order", "recorded_by").all()
    serializer_class = ActualCostSerializer
    filterset_fields = ["purchase_order", "cost_type"]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
