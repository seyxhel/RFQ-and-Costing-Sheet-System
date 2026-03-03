# ============================================================================
# budget/views.py — Budget module API views
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import Budget
from .serializers import BudgetListSerializer, BudgetDetailSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related("rfq", "costing_sheet", "created_by", "approved_by")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return BudgetListSerializer
        return BudgetDetailSerializer

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
                Q(budget_number__icontains=q) | Q(title__icontains=q)
            )
        return qs

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
        return Response(BudgetDetailSerializer(budget).data)

    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        budget = self.get_object()
        budget.recalculate()
        budget.refresh_from_db()
        return Response(BudgetDetailSerializer(budget).data)
