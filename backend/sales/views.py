# ============================================================================
# sales/views.py — Sales module API views
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from datetime import timedelta

from accounts.models import AuditLog, log_action
from rfq.models import RFQ
from .models import FormalQuotation, SalesOrder, ContractAnalysis, Client, QuotationRevision
from .serializers import (
    ClientSerializer,
    FormalQuotationListSerializer, FormalQuotationDetailSerializer,
    QuotationRevisionSerializer,
    SalesOrderListSerializer, SalesOrderDetailSerializer,
    ContractAnalysisSerializer,
)


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(designation__icontains=q)
                | Q(email__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        log_action(request=self.request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.CREATE, object_type="Client",
                   object_id=obj.id, object_repr=obj.name)

    def perform_update(self, serializer):
        obj = serializer.save()
        log_action(request=self.request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.UPDATE, object_type="Client",
                   object_id=obj.id, object_repr=obj.name)

    def perform_destroy(self, instance):
        log_action(request=self.request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.DELETE, object_type="Client",
                   object_id=instance.id, object_repr=instance.name)
        instance.delete()


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

    @action(detail=True, methods=["get"])
    def revisions(self, request, pk=None):
        """List revision history for this quotation."""
        fq = self.get_object()
        revs = fq.revisions.all()
        return Response(QuotationRevisionSerializer(revs, many=True).data)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Mark quotation as SENT to client."""
        fq = self.get_object()
        if fq.status not in (FormalQuotation.Status.DRAFT, FormalQuotation.Status.REVISED):
            return Response(
                {"detail": "Only DRAFT or REVISED quotations can be sent."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old = fq.status
        fq.status = FormalQuotation.Status.SENT
        fq.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.SEND, object_type="FormalQuotation",
                   object_id=fq.id, object_repr=fq.quotation_number,
                   old_status=old, new_status="SENT")
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
        if fq.status not in (FormalQuotation.Status.SENT, FormalQuotation.Status.REVISED):
            return Response(
                {"detail": "Only SENT or REVISED quotations can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old = fq.status
        fq.status = FormalQuotation.Status.REJECTED
        fq.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.REJECT, object_type="FormalQuotation",
                   object_id=fq.id, object_repr=fq.quotation_number,
                   old_status=old, new_status="REJECTED")
        return Response(FormalQuotationDetailSerializer(fq).data)

    @action(detail=True, methods=["post"])
    def win(self, request, pk=None):
        """Mark quotation as WON — client accepted."""
        fq = self.get_object()
        if fq.status not in (FormalQuotation.Status.SENT, FormalQuotation.Status.REVISED):
            return Response(
                {"detail": "Only SENT or REVISED quotations can be marked as won."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old = fq.status
        fq.status = FormalQuotation.Status.WON
        fq.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.SALES,
                   action=AuditLog.ActionType.ACCEPT, object_type="FormalQuotation",
                   object_id=fq.id, object_repr=fq.quotation_number,
                   old_status=old, new_status="WON")
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


# ── Sales Dashboard Summary ────────────────────────────────────────
@api_view(["GET"])
@perm_classes([permissions.IsAuthenticated])
def sales_dashboard_summary(request):
    """Aggregated KPIs for the sales dashboard."""
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    # RFQ counts
    rfqs = RFQ.objects.all()
    rfq_total = rfqs.count()
    rfq_draft = rfqs.filter(status="DRAFT").count()
    rfq_pending = rfqs.filter(status__in=["PENDING_FOR_CANVASS", "UNDER_REVIEW"]).count()
    rfq_approved = rfqs.filter(status="APPROVED").count()

    # Formal Quotation counts & values
    fqs = FormalQuotation.objects.all()
    fq_total = fqs.count()
    fq_sent = fqs.filter(status="SENT").count()
    fq_won = fqs.filter(status="WON").count()
    fq_rejected = fqs.filter(status="REJECTED").count()
    fq_draft = fqs.filter(status="DRAFT").count()
    fq_total_value = fqs.aggregate(s=Sum("total_amount"))["s"] or 0
    fq_won_value = fqs.filter(status="WON").aggregate(s=Sum("total_amount"))["s"] or 0
    fq_pipeline_value = fqs.filter(status__in=["DRAFT", "SENT", "REVISED"]).aggregate(s=Sum("total_amount"))["s"] or 0

    # Win rate
    decided = fq_won + fq_rejected
    win_rate = round((fq_won / decided * 100), 1) if decided > 0 else 0

    # Sales Orders
    sos = SalesOrder.objects.all()
    so_total = sos.count()
    so_confirmed = sos.filter(status="CONFIRMED").count()
    so_in_progress = sos.filter(status="IN_PROGRESS").count()
    so_completed = sos.filter(status="COMPLETED").count()
    so_total_value = sos.aggregate(s=Sum("contract_amount"))["s"] or 0
    so_completed_value = sos.filter(status="COMPLETED").aggregate(s=Sum("contract_amount"))["s"] or 0

    # Clients
    client_count = Client.objects.count()

    # Recent activity (last 30 days)
    recent_rfqs = rfqs.filter(created_at__gte=thirty_days_ago).count()
    recent_fqs = fqs.filter(created_at__gte=thirty_days_ago).count()
    recent_sos = sos.filter(created_at__gte=thirty_days_ago).count()

    # Quotation status breakdown for chart
    fq_by_status = list(
        fqs.values("status").annotate(count=Count("id")).order_by("status")
    )

    # Recent won quotations (return 15 instead of 5)
    recent_wins = list(
        fqs.filter(status="WON")
        .order_by("-updated_at")[:15]
        .values("id", "quotation_number", "project_title", "client_name", "total_amount", "updated_at")
    )

    # Top quotations by value (pipeline)
    top_pipeline = list(
        fqs.filter(status__in=["DRAFT", "SENT", "REVISED"])
        .order_by("-total_amount")[:5]
        .values("id", "quotation_number", "project_title", "client_name", "total_amount", "status")
    )

    return Response({
        "rfq": {
            "total": rfq_total,
            "draft": rfq_draft,
            "pending": rfq_pending,
            "approved": rfq_approved,
        },
        "quotations": {
            "total": fq_total,
            "draft": fq_draft,
            "sent": fq_sent,
            "won": fq_won,
            "rejected": fq_rejected,
            "total_value": float(fq_total_value),
            "won_value": float(fq_won_value),
            "pipeline_value": float(fq_pipeline_value),
            "win_rate": win_rate,
            "by_status": fq_by_status,
        },
        "sales_orders": {
            "total": so_total,
            "confirmed": so_confirmed,
            "in_progress": so_in_progress,
            "completed": so_completed,
            "total_value": float(so_total_value),
            "completed_value": float(so_completed_value),
        },
        "clients": {
            "total": client_count,
        },
        "recent_activity": {
            "rfqs_30d": recent_rfqs,
            "quotations_30d": recent_fqs,
            "orders_30d": recent_sos,
        },
        "recent_wins": recent_wins,
        "top_pipeline": top_pipeline,
    })
