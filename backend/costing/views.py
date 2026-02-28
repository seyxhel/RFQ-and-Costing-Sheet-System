# ============================================================================
# costing/views.py — API views for the Costing Sheet module
# ============================================================================
# ViewSets for CostingSheet, Scenario, plus custom actions for
# version control, recalculation, and export.
# ============================================================================

import csv
import json
from io import StringIO

from django.http import HttpResponse
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import CanApprove, CanEditFinancial

from .models import CostingSheet, CostingLineItem, CostingVersion, Scenario
from .serializers import (
    CostingSheetListSerializer,
    CostingSheetDetailSerializer,
    CostingLineItemSerializer,
    CostingVersionSerializer,
    ScenarioSerializer,
    CostingReportSerializer,
)


class CostingSheetViewSet(viewsets.ModelViewSet):
    """
    CRUD + workflow actions for Costing Sheets.

    Endpoints:
        GET    /api/v1/costing/sheets/                      — List all sheets
        POST   /api/v1/costing/sheets/                      — Create sheet
        GET    /api/v1/costing/sheets/{id}/                  — Sheet detail
        PUT    /api/v1/costing/sheets/{id}/                  — Update sheet
        DELETE /api/v1/costing/sheets/{id}/                  — Delete sheet

    Custom actions:
        POST   /api/v1/costing/sheets/{id}/recalculate/     — Recalculate totals
        POST   /api/v1/costing/sheets/{id}/save_version/    — Save version snapshot
        GET    /api/v1/costing/sheets/{id}/versions/        — Version history
        POST   /api/v1/costing/sheets/{id}/approve/         — Approve sheet
        GET    /api/v1/costing/sheets/{id}/export_csv/      — Export as CSV
        GET    /api/v1/costing/sheets/{id}/export_json/     — Export as JSON
    """
    queryset = CostingSheet.objects.prefetch_related("line_items", "versions", "scenarios")
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "rfq", "created_by"]
    search_fields = ["sheet_number", "title"]
    ordering_fields = ["created_at", "updated_at", "total_cost"]

    def get_serializer_class(self):
        if self.action == "list":
            return CostingSheetListSerializer
        return CostingSheetDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # ----- Recalculate totals from line items -----
    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        """Recalculate all totals and selling price from line items."""
        sheet = self.get_object()
        sheet.recalculate_totals()
        return Response(CostingSheetDetailSerializer(sheet).data)

    # ----- Version control -----
    @action(detail=True, methods=["post"])
    def save_version(self, request, pk=None):
        """
        Save a snapshot of the current costing sheet state.
        Body: { "change_summary": "Updated material prices" }
        """
        sheet = self.get_object()

        # Build snapshot
        snapshot = CostingSheetDetailSerializer(sheet).data

        version = CostingVersion.objects.create(
            costing_sheet=sheet,
            version_number=sheet.version,
            snapshot_data=snapshot,
            change_summary=request.data.get("change_summary", ""),
            created_by=request.user,
        )

        # Increment version on the sheet
        sheet.version += 1
        sheet.save()

        return Response(CostingVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """List all historical versions of this costing sheet."""
        sheet = self.get_object()
        versions = sheet.versions.all()
        return Response(CostingVersionSerializer(versions, many=True).data)

    # ----- Approval -----
    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanApprove])
    def approve(self, request, pk=None):
        """Approve a costing sheet."""
        sheet = self.get_object()
        if sheet.status != CostingSheet.Status.IN_REVIEW:
            return Response(
                {"detail": "Sheet must be IN_REVIEW to approve."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sheet.status = CostingSheet.Status.APPROVED
        sheet.approved_by = request.user
        sheet.save()
        return Response(CostingSheetDetailSerializer(sheet).data)

    # ----- Export: CSV -----
    @action(detail=True, methods=["get"])
    def export_csv(self, request, pk=None):
        """Export costing sheet as a CSV file."""
        sheet = self.get_object()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{sheet.sheet_number}.csv"'

        writer = csv.writer(response)
        # Header
        writer.writerow([
            "Cost Type", "Description", "Quantity", "Unit",
            "Unit Cost", "Material", "Labor", "Overhead",
            "Logistics", "Total",
        ])
        # Line items
        for item in sheet.line_items.all():
            writer.writerow([
                item.cost_type, item.description, item.quantity, item.unit,
                item.unit_cost, item.material_cost, item.labor_cost,
                item.overhead_cost, item.logistics_cost, item.total_cost,
            ])
        # Summary row
        writer.writerow([])
        writer.writerow(["TOTALS", "", "", "", "",
                         sheet.total_material_cost, sheet.total_labor_cost,
                         sheet.total_overhead_cost, sheet.total_logistics_cost,
                         sheet.total_cost])
        writer.writerow(["Selling Price", sheet.selling_price])
        writer.writerow(["Margin %", sheet.actual_margin_percent])

        return response

    # ----- Export: JSON -----
    @action(detail=True, methods=["get"])
    def export_json(self, request, pk=None):
        """Export costing sheet as a JSON report."""
        sheet = self.get_object()
        data = CostingSheetDetailSerializer(sheet).data
        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type="application/json",
        )
        response["Content-Disposition"] = f'attachment; filename="{sheet.sheet_number}.json"'
        return response


# --------------------------------------------------------------------------
# Costing Line Item (standalone CRUD for fine-grained editing)
# --------------------------------------------------------------------------
class CostingLineItemViewSet(viewsets.ModelViewSet):
    """
    CRUD for individual costing line items.
    Typically used for adding/editing items within an existing costing sheet.
    After modification, call /sheets/{id}/recalculate/ to update totals.

    Endpoints:
        GET    /api/v1/costing/line-items/
        POST   /api/v1/costing/line-items/
        GET    /api/v1/costing/line-items/{id}/
        PUT    /api/v1/costing/line-items/{id}/
        DELETE /api/v1/costing/line-items/{id}/
    """
    queryset = CostingLineItem.objects.select_related("costing_sheet", "supplier")
    serializer_class = CostingLineItemSerializer
    permission_classes = [permissions.IsAuthenticated, CanEditFinancial]
    filterset_fields = ["costing_sheet", "cost_type", "supplier"]
    ordering_fields = ["cost_type", "total_cost"]


# --------------------------------------------------------------------------
# Scenario (What-If Analysis)
# --------------------------------------------------------------------------
class ScenarioViewSet(viewsets.ModelViewSet):
    """
    CRUD + calculate for what-if scenarios.

    Endpoints:
        GET    /api/v1/costing/scenarios/
        POST   /api/v1/costing/scenarios/
        GET    /api/v1/costing/scenarios/{id}/
        PUT    /api/v1/costing/scenarios/{id}/
        DELETE /api/v1/costing/scenarios/{id}/

    Custom actions:
        POST   /api/v1/costing/scenarios/{id}/calculate/   — Run projection
    """
    queryset = Scenario.objects.select_related("costing_sheet")
    serializer_class = ScenarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["costing_sheet"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def calculate(self, request, pk=None):
        """Apply overrides and calculate projected totals."""
        scenario = self.get_object()
        scenario.calculate()
        return Response(ScenarioSerializer(scenario).data)
