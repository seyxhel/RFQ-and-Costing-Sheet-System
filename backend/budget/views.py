# ============================================================================
# budget/views.py — Budget module API views
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from accounts.models import AuditLog, log_action
from .models import Budget
from .serializers import BudgetListSerializer, BudgetDetailSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related("rfq", "costing_sheet", "sales_order", "created_by", "approved_by")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return BudgetListSerializer
        return BudgetDetailSerializer

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        log_action(request=self.request, module=AuditLog.Module.BUDGET,
                   action=AuditLog.ActionType.CREATE, object_type="Budget",
                   object_id=obj.id, object_repr=obj.budget_number,
                   new_status=obj.status)

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(
                Q(budget_number__icontains=q) | Q(title__icontains=q)
            )
        return qs

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        budget = self.get_object()
        if budget.status != Budget.Status.DRAFT:
            return Response(
                {"detail": "Only DRAFT budgets can be submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        budget.status = Budget.Status.PENDING
        budget.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.BUDGET,
                   action=AuditLog.ActionType.SUBMIT, object_type="Budget",
                   object_id=budget.id, object_repr=budget.budget_number,
                   old_status="DRAFT", new_status="PENDING")
        return Response(BudgetDetailSerializer(budget).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        budget = self.get_object()
        if budget.status != Budget.Status.PENDING:
            return Response(
                {"detail": "Only PENDING budgets can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        budget.status = Budget.Status.APPROVED
        budget.approved_by = request.user
        budget.approved_at = timezone.now()
        budget.save(update_fields=["status", "approved_by", "approved_at"])
        log_action(request=request, module=AuditLog.Module.BUDGET,
                   action=AuditLog.ActionType.APPROVE, object_type="Budget",
                   object_id=budget.id, object_repr=budget.budget_number,
                   old_status="PENDING", new_status="APPROVED")
        return Response(BudgetDetailSerializer(budget).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        budget = self.get_object()
        if budget.status != Budget.Status.PENDING:
            return Response(
                {"detail": "Only PENDING budgets can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        budget.status = Budget.Status.REJECTED
        budget.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.BUDGET,
                   action=AuditLog.ActionType.REJECT, object_type="Budget",
                   object_id=budget.id, object_repr=budget.budget_number,
                   old_status="PENDING", new_status="REJECTED")
        return Response(BudgetDetailSerializer(budget).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        budget = self.get_object()
        if budget.status != Budget.Status.APPROVED:
            return Response(
                {"detail": "Only APPROVED budgets can be closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        budget.status = Budget.Status.CLOSED
        budget.save(update_fields=["status"])
        log_action(request=request, module=AuditLog.Module.BUDGET,
                   action=AuditLog.ActionType.CLOSE, object_type="Budget",
                   object_id=budget.id, object_repr=budget.budget_number,
                   old_status="APPROVED", new_status="CLOSED")
        return Response(BudgetDetailSerializer(budget).data)

    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        budget = self.get_object()
        budget.recalculate()
        budget.refresh_from_db()
        log_action(request=request, module=AuditLog.Module.BUDGET,
                   action=AuditLog.ActionType.RECALCULATE, object_type="Budget",
                   object_id=budget.id, object_repr=budget.budget_number)
        return Response(BudgetDetailSerializer(budget).data)
