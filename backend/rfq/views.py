# ============================================================================
# rfq/views.py — API views for the RFQ module
# ============================================================================
# ViewSets for Supplier, RFQ, Quotation, plus custom actions for
# comparison and approval workflow.
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import CanApprove, CanEditFinancial, IsOwnerOrAdmin

from .models import Supplier, RFQ, RFQItem, Quotation, QuotationItem, ApprovalLog
from .serializers import (
    SupplierSerializer,
    RFQListSerializer,
    RFQDetailSerializer,
    RFQItemSerializer,
    QuotationListSerializer,
    QuotationDetailSerializer,
    QuotationItemSerializer,
    ApprovalLogSerializer,
)


# --------------------------------------------------------------------------
# Supplier CRUD
# --------------------------------------------------------------------------
class SupplierViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for the supplier database.
    Endpoints:
        GET    /api/v1/rfq/suppliers/
        POST   /api/v1/rfq/suppliers/
        GET    /api/v1/rfq/suppliers/{id}/
        PUT    /api/v1/rfq/suppliers/{id}/
        DELETE /api/v1/rfq/suppliers/{id}/
    """
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["is_active", "rating"]
    search_fields = ["name", "contact_person", "email"]
    ordering_fields = ["name", "rating", "on_time_delivery_rate"]


# --------------------------------------------------------------------------
# RFQ CRUD + Workflow Actions
# --------------------------------------------------------------------------
class RFQViewSet(viewsets.ModelViewSet):
    """
    CRUD + workflow actions for RFQs.

    Endpoints:
        GET    /api/v1/rfq/rfqs/                   — List all RFQs
        POST   /api/v1/rfq/rfqs/                   — Create new RFQ
        GET    /api/v1/rfq/rfqs/{id}/               — RFQ detail
        PUT    /api/v1/rfq/rfqs/{id}/               — Update RFQ
        DELETE /api/v1/rfq/rfqs/{id}/               — Delete RFQ

    Custom actions:
        POST   /api/v1/rfq/rfqs/{id}/submit/        — Submit for review
        POST   /api/v1/rfq/rfqs/{id}/approve/       — Approve RFQ
        POST   /api/v1/rfq/rfqs/{id}/reject/        — Reject RFQ
        GET    /api/v1/rfq/rfqs/{id}/compare/       — Compare quotations
    """
    queryset = RFQ.objects.prefetch_related("items", "quotations", "suppliers")
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "priority", "created_by"]
    search_fields = ["rfq_number", "title", "description"]
    ordering_fields = ["created_at", "deadline", "status"]

    def get_serializer_class(self):
        if self.action == "list":
            return RFQListSerializer
        return RFQDetailSerializer

    def perform_create(self, serializer):
        # Automatically set created_by to the current user
        serializer.save(created_by=self.request.user)

    # ----- Workflow actions -----

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit RFQ for approval — changes status to PENDING."""
        rfq = self.get_object()
        if rfq.status != RFQ.Status.DRAFT:
            return Response(
                {"detail": "Only DRAFT RFQs can be submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rfq.status = RFQ.Status.PENDING
        rfq.save()
        return Response(RFQDetailSerializer(rfq).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanApprove])
    def approve(self, request, pk=None):
        """
        Approve an RFQ — multi-level approval.
        Body: { "level": 1, "comments": "Looks good" }
        """
        rfq = self.get_object()
        if rfq.status not in (RFQ.Status.PENDING, RFQ.Status.UNDER_REVIEW):
            return Response(
                {"detail": "RFQ is not in an approvable state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        level = request.data.get("level", 1)
        comments = request.data.get("comments", "")

        # Log the approval
        ApprovalLog.objects.create(
            rfq=rfq,
            approver=request.user,
            action=ApprovalLog.Action.APPROVED,
            level=level,
            comments=comments,
        )

        # If highest level reached (configurable; default = 2 levels)
        max_level = 2
        approved_levels = rfq.approvals.filter(
            action=ApprovalLog.Action.APPROVED
        ).values_list("level", flat=True).distinct()

        if set(range(1, max_level + 1)).issubset(set(approved_levels)):
            rfq.status = RFQ.Status.APPROVED
            rfq.approved_by = request.user
        else:
            rfq.status = RFQ.Status.UNDER_REVIEW

        rfq.save()
        return Response(RFQDetailSerializer(rfq).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanApprove])
    def reject(self, request, pk=None):
        """Reject an RFQ."""
        rfq = self.get_object()
        comments = request.data.get("comments", "")

        ApprovalLog.objects.create(
            rfq=rfq,
            approver=request.user,
            action=ApprovalLog.Action.REJECTED,
            level=request.data.get("level", 1),
            comments=comments,
        )
        rfq.status = RFQ.Status.REJECTED
        rfq.save()
        return Response(RFQDetailSerializer(rfq).data)

    @action(detail=True, methods=["get"])
    def compare(self, request, pk=None):
        """
        Compare all quotations for this RFQ side-by-side.
        Returns a matrix: rows = RFQ items, columns = supplier quotes.
        """
        rfq = self.get_object()
        quotations = rfq.quotations.select_related("supplier").prefetch_related("items")
        rfq_items = rfq.items.all()

        # Build comparison matrix
        matrix = []
        for item in rfq_items:
            row = {
                "rfq_item_id": item.id,
                "item_name": item.item_name,
                "quantity": str(item.quantity),
                "unit": item.unit,
                "quotes": [],
            }
            for q in quotations:
                qi = q.items.filter(rfq_item=item).first()
                row["quotes"].append({
                    "quotation_id": q.id,
                    "supplier_id": q.supplier_id,
                    "supplier_name": q.supplier.name,
                    "unit_price": str(qi.unit_price) if qi else None,
                    "total_price": str(qi.total_price) if qi else None,
                    "delivery_days": qi.delivery_days if qi else None,
                })
            matrix.append(row)

        return Response({
            "rfq_id": rfq.id,
            "rfq_number": rfq.rfq_number,
            "quotations": QuotationListSerializer(quotations, many=True).data,
            "comparison_matrix": matrix,
        })

    @action(detail=True, methods=["get"])
    def approvals(self, request, pk=None):
        """Get approval history for this RFQ."""
        rfq = self.get_object()
        logs = rfq.approvals.select_related("approver")
        return Response(ApprovalLogSerializer(logs, many=True).data)


# --------------------------------------------------------------------------
# Quotation CRUD
# --------------------------------------------------------------------------
class QuotationViewSet(viewsets.ModelViewSet):
    """
    CRUD for supplier quotations.
    Endpoints:
        GET    /api/v1/rfq/quotations/
        POST   /api/v1/rfq/quotations/
        GET    /api/v1/rfq/quotations/{id}/
        PUT    /api/v1/rfq/quotations/{id}/
        DELETE /api/v1/rfq/quotations/{id}/

    Custom actions:
        POST   /api/v1/rfq/quotations/{id}/accept/
        POST   /api/v1/rfq/quotations/{id}/reject/
    """
    queryset = Quotation.objects.select_related("rfq", "supplier").prefetch_related("items")
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["rfq", "supplier", "status"]
    search_fields = ["quotation_number", "supplier__name"]
    ordering_fields = ["total_amount", "delivery_days", "submitted_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return QuotationListSerializer
        return QuotationDetailSerializer

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, CanApprove])
    def accept(self, request, pk=None):
        """Accept a quotation — marks it as ACCEPTED, others as REJECTED."""
        quotation = self.get_object()
        quotation.status = Quotation.Status.ACCEPTED
        quotation.save()

        # Reject other quotations for the same RFQ
        Quotation.objects.filter(rfq=quotation.rfq).exclude(id=quotation.id).update(
            status=Quotation.Status.REJECTED
        )

        # Update RFQ status
        quotation.rfq.status = RFQ.Status.RECEIVED
        quotation.rfq.save()

        return Response(QuotationDetailSerializer(quotation).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a quotation."""
        quotation = self.get_object()
        quotation.status = Quotation.Status.REJECTED
        quotation.save()
        return Response(QuotationDetailSerializer(quotation).data)
