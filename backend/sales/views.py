# ============================================================================
# sales/views.py — Sales module API views
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from accounts.models import AuditLog, log_action
from .models import FormalQuotation, SalesOrder, ContractAnalysis
from .serializers import (
    FormalQuotationListSerializer, FormalQuotationDetailSerializer,
    SalesOrderListSerializer, SalesOrderDetailSerializer,
    ContractAnalysisSerializer,
)


class FormalQuotationViewSet(viewsets.ModelViewSet):
    queryset = FormalQuotation.objects.select_related(
        "rfq", "costing_sheet", "margin_level", "created_by",
    ).prefetch_related("items")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return FormalQuotationListSerializer
        return FormalQuotationDetailSerializer

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        log_action(request=self.request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.CREATE, object_type="FormalQuotation",
                   object_id=obj.id, object_repr=obj.quotation_number,
                   new_status=obj.status)

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(
                Q(quotation_number__icontains=q)
                | Q(client_name__icontains=q)
                | Q(project_title__icontains=q)
            )
        return qs

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Mark quotation as SENT to client."""
        fq = self.get_object()
        if fq.status != FormalQuotation.Status.DRAFT:
            return Response(
                {"detail": "Only DRAFT quotations can be sent."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        fq.status = FormalQuotation.Status.SENT
        fq.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.SEND, object_type="FormalQuotation",
                   object_id=fq.id, object_repr=fq.quotation_number,
                   old_status="DRAFT", new_status="SENT")
        return Response(FormalQuotationDetailSerializer(fq).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        fq = self.get_object()
        old = fq.status
        fq.status = FormalQuotation.Status.ACCEPTED
        fq.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.ACCEPT, object_type="FormalQuotation",
                   object_id=fq.id, object_repr=fq.quotation_number,
                   old_status=old, new_status="ACCEPTED")
        return Response(FormalQuotationDetailSerializer(fq).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        fq = self.get_object()
        old = fq.status
        fq.status = FormalQuotation.Status.REJECTED
        fq.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.REJECT, object_type="FormalQuotation",
                   object_id=fq.id, object_repr=fq.quotation_number,
                   old_status=old, new_status="REJECTED")
        return Response(FormalQuotationDetailSerializer(fq).data)


class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.select_related(
        "formal_quotation", "rfq", "costing_sheet", "created_by",
    ).prefetch_related("contract_analyses")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return SalesOrderListSerializer
        return SalesOrderDetailSerializer

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        log_action(request=self.request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.CREATE, object_type="SalesOrder",
                   object_id=obj.id, object_repr=obj.so_number,
                   new_status=obj.status)

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(
                Q(so_number__icontains=q)
                | Q(client_name__icontains=q)
                | Q(project_title__icontains=q)
            )
        return qs

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        so = self.get_object()
        if so.status != SalesOrder.Status.DRAFT:
            return Response(
                {"detail": "Only DRAFT orders can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        so.status = SalesOrder.Status.CONFIRMED
        so.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.STATUS_CHANGE, object_type="SalesOrder",
                   object_id=so.id, object_repr=so.so_number,
                   old_status="DRAFT", new_status="CONFIRMED")
        return Response(SalesOrderDetailSerializer(so).data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        so = self.get_object()
        old = so.status
        so.status = SalesOrder.Status.IN_PROGRESS
        so.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.STATUS_CHANGE, object_type="SalesOrder",
                   object_id=so.id, object_repr=so.so_number,
                   old_status=old, new_status="IN_PROGRESS")
        return Response(SalesOrderDetailSerializer(so).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        so = self.get_object()
        old = so.status
        so.status = SalesOrder.Status.COMPLETED
        so.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.COMPLETE, object_type="SalesOrder",
                   object_id=so.id, object_repr=so.so_number,
                   old_status=old, new_status="COMPLETED")
        return Response(SalesOrderDetailSerializer(so).data)


class ContractAnalysisViewSet(viewsets.ModelViewSet):
    queryset = ContractAnalysis.objects.select_related("sales_order")
    serializer_class = ContractAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        so_id = self.request.query_params.get("sales_order")
        if so_id:
            qs = qs.filter(sales_order_id=so_id)
        return qs

    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        analysis = self.get_object()
        analysis.recalculate()
        analysis.refresh_from_db()
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.RECALCULATE, object_type="ContractAnalysis",
                   object_id=analysis.id, object_repr=f"CA-{analysis.id}")
        return Response(ContractAnalysisSerializer(analysis).data)
