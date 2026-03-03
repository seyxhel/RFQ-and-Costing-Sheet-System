# ============================================================================
# costing/views.py — Costing module API views
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import (
    CostCategory, CommissionRole,
    CostingSheet, CostingLineItem,
    CostingMarginLevel, CostingCommissionSplit,
    CostingVersion, Scenario,
)
from .serializers import (
    CostCategorySerializer, CommissionRoleSerializer,
    CostingSheetListSerializer, CostingSheetDetailSerializer,
    CostingLineItemSerializer, CostingMarginLevelSerializer,
    CostingCommissionSplitSerializer,
    CostingVersionSerializer, ScenarioSerializer,
)


class CostCategoryViewSet(viewsets.ModelViewSet):
    queryset = CostCategory.objects.all()
    serializer_class = CostCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name"]
    filterset_fields = ["is_active"]


class CommissionRoleViewSet(viewsets.ModelViewSet):
    queryset = CommissionRole.objects.all()
    serializer_class = CommissionRoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name"]
    filterset_fields = ["is_active"]


class CostingSheetViewSet(viewsets.ModelViewSet):
    queryset = CostingSheet.objects.select_related(
        "rfq", "created_by", "approved_by",
    ).prefetch_related("line_items", "margin_levels")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return CostingSheetListSerializer
        return CostingSheetDetailSerializer

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
                Q(sheet_number__icontains=q)
                | Q(title__icontains=q)
                | Q(project_title__icontains=q)
                | Q(client_name__icontains=q)
            )
        return qs

    # ----- Recalculate -----
    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        """Recalculate all totals, margin levels, and profitability."""
        sheet = self.get_object()
        sheet.recalculate()
        sheet.refresh_from_db()
        return Response(CostingSheetDetailSerializer(sheet).data)

    # ----- Workflow -----
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        sheet = self.get_object()
        if sheet.status != CostingSheet.Status.DRAFT:
            return Response(
                {"detail": "Only DRAFT sheets can be submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sheet.status = CostingSheet.Status.IN_REVIEW
        sheet.save(update_fields=["status"])
        return Response(CostingSheetDetailSerializer(sheet).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        sheet = self.get_object()
        if sheet.status != CostingSheet.Status.IN_REVIEW:
            return Response(
                {"detail": "Only IN_REVIEW sheets can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sheet.status = CostingSheet.Status.APPROVED
        sheet.approved_by = request.user
        sheet.save(update_fields=["status", "approved_by"])
        return Response(CostingSheetDetailSerializer(sheet).data)

    # ----- Version Snapshot -----
    @action(detail=True, methods=["post"])
    def save_version(self, request, pk=None):
        """Snapshot current state into a version record."""
        sheet = self.get_object()
        data = CostingSheetDetailSerializer(sheet).data
        ver_num = sheet.versions.count() + 1
        version = CostingVersion.objects.create(
            costing_sheet=sheet,
            version_number=ver_num,
            snapshot_data=data,
            change_summary=request.data.get("change_summary", ""),
            created_by=request.user,
        )
        sheet.version = ver_num
        sheet.save(update_fields=["version"])
        return Response(CostingVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        sheet = self.get_object()
        versions = sheet.versions.all()
        return Response(CostingVersionSerializer(versions, many=True).data)

    # ----- Margin CRUD -----
    @action(detail=True, methods=["get", "put"], url_path="margin/(?P<label>[A-Z]+)")
    def margin(self, request, pk=None, label=None):
        """Get or update a specific margin level."""
        sheet = self.get_object()
        try:
            ml = sheet.margin_levels.get(label=label)
        except CostingMarginLevel.DoesNotExist:
            return Response({"detail": "Margin level not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(CostingMarginLevelSerializer(ml).data)

        # PUT
        from .serializers import CostingMarginLevelWriteSerializer
        ser = CostingMarginLevelWriteSerializer(ml, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        sheet.recalculate()
        ml.refresh_from_db()
        return Response(CostingMarginLevelSerializer(ml).data)

    # ----- Commission Splits -----
    @action(detail=True, methods=["put"], url_path="margin/(?P<label>[A-Z]+)/commission-splits")
    def update_commission_splits(self, request, pk=None, label=None):
        """Bulk update commission splits for a margin level."""
        sheet = self.get_object()
        try:
            ml = sheet.margin_levels.get(label=label)
        except CostingMarginLevel.DoesNotExist:
            return Response({"detail": "Margin level not found."}, status=status.HTTP_404_NOT_FOUND)

        splits_data = request.data.get("splits", [])
        for split_data in splits_data:
            role_id = split_data.get("role")
            percent = split_data.get("percent", 0)
            cs, _ = CostingCommissionSplit.objects.get_or_create(
                margin_level=ml, role_id=role_id,
            )
            cs.percent = percent
            cs.save()
        sheet.recalculate()
        ml.refresh_from_db()
        return Response(CostingMarginLevelSerializer(ml).data)


class CostingLineItemViewSet(viewsets.ModelViewSet):
    queryset = CostingLineItem.objects.select_related("category", "supplier")
    serializer_class = CostingLineItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        sheet_id = self.request.query_params.get("costing_sheet")
        if sheet_id:
            qs = qs.filter(costing_sheet_id=sheet_id)
        return qs


class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.select_related("costing_sheet", "created_by")
    serializer_class = ScenarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        scenario = serializer.save(created_by=self.request.user)
        scenario.calculate()

    @action(detail=True, methods=["post"])
    def calculate(self, request, pk=None):
        scenario = self.get_object()
        scenario.calculate()
        return Response(ScenarioSerializer(scenario).data)
