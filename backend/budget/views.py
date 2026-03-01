from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Budget
from .serializers import BudgetSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related("rfq", "costing_sheet", "created_by", "approved_by").all()
    serializer_class = BudgetSerializer
    filterset_fields = ["status", "rfq", "costing_sheet"]
    search_fields = ["title", "budget_number"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        budget = self.get_object()
        budget.status = "PENDING"
        budget.save()
        return Response({"status": "submitted"})

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        budget = self.get_object()
        budget.status = "APPROVED"
        budget.approved_by = request.user
        budget.approved_at = timezone.now()
        budget.save()
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        budget = self.get_object()
        budget.status = "REJECTED"
        budget.save()
        return Response({"status": "rejected"})

    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        budget = self.get_object()
        budget.recalculate()
        return Response(BudgetSerializer(budget).data)
