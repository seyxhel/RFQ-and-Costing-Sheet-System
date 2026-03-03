# ============================================================================
# rfq/views.py — RFQ module API views
# ============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import Supplier, RFQ, Quotation, QuotationItem, ApprovalLog
from .serializers import (
    SupplierSerializer,
    RFQListSerializer, RFQDetailSerializer,
    QuotationListSerializer, QuotationDetailSerializer,
    QuotationItemSerializer, ApprovalLogSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name", "contact_person", "email"]
    filterset_fields = ["is_active"]


class RFQViewSet(viewsets.ModelViewSet):
    queryset = RFQ.objects.select_related("created_by", "approved_by").prefetch_related(
        "items", "suppliers", "quotations",
    )
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return RFQListSerializer
        return RFQDetailSerializer

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
                Q(rfq_number__icontains=q)
                | Q(title__icontains=q)
                | Q(project_title__icontains=q)
                | Q(client_name__icontains=q)
            )
        return qs

    # ----- Workflow actions -----

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Move RFQ from DRAFT to PENDING."""
        rfq = self.get_object()
        if rfq.status != RFQ.Status.DRAFT:
            return Response(
                {"detail": "Only DRAFT RFQs can be submitted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rfq.status = RFQ.Status.PENDING
        rfq.save(update_fields=["status"])
        return Response(RFQDetailSerializer(rfq).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve an RFQ under review."""
        rfq = self.get_object()
        if rfq.status not in (RFQ.Status.PENDING, RFQ.Status.UNDER_REVIEW):
            return Response(
                {"detail": "RFQ is not in an approvable state."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rfq.status = RFQ.Status.APPROVED
        rfq.approved_by = request.user
        rfq.save(update_fields=["status", "approved_by"])
        ApprovalLog.objects.create(
            rfq=rfq, approver=request.user,
            action=ApprovalLog.Action.APPROVED,
            comments=request.data.get("comments", ""),
        )
        return Response(RFQDetailSerializer(rfq).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        rfq = self.get_object()
        rfq.status = RFQ.Status.REJECTED
        rfq.save(update_fields=["status"])
        ApprovalLog.objects.create(
            rfq=rfq, approver=request.user,
            action=ApprovalLog.Action.REJECTED,
            comments=request.data.get("comments", ""),
        )
        return Response(RFQDetailSerializer(rfq).data)

    @action(detail=True, methods=["get"])
    def compare(self, request, pk=None):
        """Build the canvass comparison matrix for this RFQ."""
        rfq = self.get_object()
        items = rfq.items.all().order_by("item_number")
        quotations = rfq.quotations.select_related("supplier").prefetch_related("items")

        # Build quotation summary list (for supplier cards)
        quotation_list = []
        for q in quotations:
            quotation_list.append({
                "id": q.id,
                "supplier": q.supplier_id,
                "supplier_name": q.supplier.name,
                "quotation_number": q.quotation_number,
                "status": q.status,
                "total_amount": str(q.total_amount),
                "currency": q.currency,
                "delivery_days": q.delivery_days,
                "payment_terms": q.payment_terms,
                "validity_days": q.validity_days,
                "supplier_rating": str(q.supplier.rating),
            })

        # Build item-level comparison matrix
        matrix = []
        for item in items:
            row = {
                "rfq_item_id": item.id,
                "item_number": item.item_number,
                "item_name": item.item_name,
                "brand": item.brand,
                "model_number": item.model_number,
                "description": item.description,
                "quantity": str(item.quantity),
                "unit": item.unit,
                "quotes": [],
            }
            for quot in quotations:
                qi = quot.items.filter(rfq_item=item).first()
                if qi:
                    row["quotes"].append({
                        "supplier_id": quot.supplier_id,
                        "supplier_name": quot.supplier.name,
                        "quotation_id": quot.id,
                        "unit_price": str(qi.unit_price),
                        "amount": str(qi.amount),
                        "brand": qi.brand,
                        "model_number": qi.model_number,
                        "description": qi.description,
                        "offer_type": qi.offer_type,
                        "vat_type": qi.vat_type,
                        "availability": qi.availability,
                        "warranty_period": qi.warranty_period,
                        "delivery_days": qi.delivery_days,
                        "notes": qi.notes,
                    })
                else:
                    row["quotes"].append({
                        "supplier_id": quot.supplier_id,
                        "supplier_name": quot.supplier.name,
                        "quotation_id": quot.id,
                        "unit_price": None,
                        "no_quote": True,
                    })
            matrix.append(row)

        return Response({
            "rfq": RFQListSerializer(rfq).data,
            "quotations": quotation_list,
            "comparison_matrix": matrix,
        })


class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.select_related("rfq", "supplier").prefetch_related("items")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return QuotationListSerializer
        return QuotationDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        rfq_id = self.request.query_params.get("rfq")
        if rfq_id:
            qs = qs.filter(rfq_id=rfq_id)
        supplier_id = self.request.query_params.get("supplier")
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        quotation = self.get_object()
        quotation.status = Quotation.Status.ACCEPTED
        quotation.save(update_fields=["status"])
        # Auto-reject all other PENDING quotations for the same RFQ
        Quotation.objects.filter(
            rfq=quotation.rfq,
            status=Quotation.Status.PENDING,
        ).exclude(pk=quotation.pk).update(status=Quotation.Status.REJECTED)
        return Response(QuotationDetailSerializer(quotation).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        quotation = self.get_object()
        quotation.status = Quotation.Status.REJECTED
        quotation.save(update_fields=["status"])
        return Response(QuotationDetailSerializer(quotation).data)
