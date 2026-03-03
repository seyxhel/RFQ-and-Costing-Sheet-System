# ============================================================================
# accounts/views.py — Authentication & user management API views
# ============================================================================

from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Sum

from .models import AuditLog, log_action
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, ProfileUpdateSerializer, ChangePasswordSerializer,
    AuditLogSerializer,
)
from .permissions import IsAdminRole

User = get_user_model()


# --------------------------------------------------------------------------
# Session-based authentication endpoints
# --------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def login_view(request):
    """
    POST /api/v1/accounts/login/
    Authenticate user and create a session.
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )
    if user is None:
        return Response(
            {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
        )
    if not user.is_active:
        return Response(
            {"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN
        )

    login(request, user)
    log_action(
        request=request, module=AuditLog.Module.ACCOUNTS,
        action=AuditLog.ActionType.LOGIN, object_type="User",
        object_id=user.id, object_repr=user.username,
    )
    return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    POST /api/v1/accounts/logout/
    End the user session.
    """
    logout(request)
    log_action(
        request=request, user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
        module=AuditLog.Module.ACCOUNTS,
        action=AuditLog.ActionType.LOGOUT, object_type="User",
    )
    return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@ensure_csrf_cookie
def me_view(request):
    """
    GET /api/v1/accounts/me/
    Return the currently authenticated user's profile.
    """
    return Response(UserSerializer(request.user).data)


@api_view(["PUT", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def update_profile_view(request):
    """
    PUT/PATCH /api/v1/accounts/profile/
    Update the currently authenticated user's profile fields.
    """
    serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    """
    POST /api/v1/accounts/change-password/
    Change the currently authenticated user's password.
    Requires current password for verification.
    """
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    if not request.user.check_password(serializer.validated_data["current_password"]):
        return Response(
            {"current_password": ["Current password is incorrect."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.set_password(serializer.validated_data["new_password"])
    request.user.save()
    # Re-authenticate to keep the session alive
    login(request, request.user)
    return Response({"detail": "Password changed successfully."})


# --------------------------------------------------------------------------
# User management (admin only)
# --------------------------------------------------------------------------

class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD for user accounts — restricted to ADMIN role.
    Endpoints:
        GET    /api/v1/accounts/users/
        POST   /api/v1/accounts/users/
        GET    /api/v1/accounts/users/{id}/
        PUT    /api/v1/accounts/users/{id}/
        DELETE /api/v1/accounts/users/{id}/
    """
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserSerializer


# --------------------------------------------------------------------------
# Audit Log (read-only)
# --------------------------------------------------------------------------

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/accounts/audit-logs/          — full system audit trail
    GET /api/v1/accounts/audit-logs/?module=RFQ&action=SUBMIT
    GET /api/v1/accounts/audit-logs/?object_type=PurchaseOrder&object_id=3
    """
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(module=module)
        action = self.request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)
        obj_type = self.request.query_params.get("object_type")
        if obj_type:
            qs = qs.filter(object_type=obj_type)
        obj_id = self.request.query_params.get("object_id")
        if obj_id:
            qs = qs.filter(object_id=obj_id)
        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)
        q = self.request.query_params.get("search")
        if q:
            qs = qs.filter(
                Q(object_repr__icontains=q)
                | Q(object_type__icontains=q)
                | Q(details__icontains=q)
            )
        return qs


# --------------------------------------------------------------------------
# Project Lifecycle Report
# --------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def project_report_view(request):
    """
    GET /api/v1/accounts/reports/project/?budget=1
    GET /api/v1/accounts/reports/project/?rfq=1
    GET /api/v1/accounts/reports/project/?po=1

    Traces the full project chain and returns a consolidated management report.
    """
    from rfq.models import RFQ, Quotation
    from costing.models import CostingSheet
    from sales.models import FormalQuotation, SalesOrder, ContractAnalysis
    from budget.models import Budget
    from procurement.models import PurchaseOrder, ActualCost

    budget_id = request.query_params.get("budget")
    rfq_id = request.query_params.get("rfq")
    po_id = request.query_params.get("po")

    budgets = Budget.objects.none()
    rfqs = RFQ.objects.none()
    pos = PurchaseOrder.objects.none()

    # Start from whichever anchor the user provides
    if budget_id:
        budgets = Budget.objects.filter(id=budget_id)
        b = budgets.first()
        if b:
            if b.rfq_id:
                rfqs = RFQ.objects.filter(id=b.rfq_id)
            if b.costing_sheet_id:
                cs_ids = [b.costing_sheet_id]
            else:
                cs_ids = []
            pos = PurchaseOrder.objects.filter(budget=b)
    elif rfq_id:
        rfqs = RFQ.objects.filter(id=rfq_id)
        rfq_obj = rfqs.first()
        if rfq_obj:
            cs_ids = list(CostingSheet.objects.filter(rfq=rfq_obj).values_list("id", flat=True))
            budgets = Budget.objects.filter(Q(rfq=rfq_obj) | Q(costing_sheet_id__in=cs_ids))
            pos = PurchaseOrder.objects.filter(Q(rfq=rfq_obj) | Q(budget__in=budgets))
        else:
            cs_ids = []
    elif po_id:
        pos = PurchaseOrder.objects.filter(id=po_id)
        p = pos.first()
        if p:
            if p.budget_id:
                budgets = Budget.objects.filter(id=p.budget_id)
                b = budgets.first()
                if b and b.rfq_id:
                    rfqs = RFQ.objects.filter(id=b.rfq_id)
            if p.rfq_id:
                rfqs = RFQ.objects.filter(id=p.rfq_id)
            cs_ids = list(pos.exclude(costing_sheet__isnull=True).values_list("costing_sheet_id", flat=True))
        else:
            cs_ids = []
    else:
        return Response({"detail": "Provide ?budget=, ?rfq=, or ?po= parameter."}, status=400)

    # ---------- Build report data ----------

    # 1. Executive summary
    rfq_data = []
    for r in rfqs.select_related("created_by", "approved_by"):
        rfq_data.append({
            "id": r.id, "rfq_number": r.rfq_number, "title": r.title,
            "project_title": r.project_title, "client_name": r.client_name,
            "status": r.status,
            "created_by": r.created_by.get_full_name() if r.created_by else "",
            "approved_by": r.approved_by.get_full_name() if r.approved_by else "",
            "issue_date": str(r.issue_date) if r.issue_date else "",
            "created_at": r.created_at.isoformat() if r.created_at else "",
        })

    # 2. Quotations accepted
    quotation_data = []
    for r in rfqs:
        for q in Quotation.objects.filter(rfq=r).select_related("supplier"):
            quotation_data.append({
                "id": q.id, "quotation_number": q.quotation_number,
                "supplier_name": q.supplier.name if q.supplier else "",
                "status": q.status, "total_amount": str(q.total_amount),
            })

    # 3. Costing sheets
    costing_data = []
    if "cs_ids" in dir() and cs_ids:
        pass
    else:
        cs_ids = list(CostingSheet.objects.filter(rfq__in=rfqs).values_list("id", flat=True))
    for cs in CostingSheet.objects.filter(id__in=cs_ids).select_related("created_by"):
        costing_data.append({
            "id": cs.id, "sheet_number": cs.sheet_number, "title": cs.title,
            "status": cs.status, "total_project_cost": str(cs.total_project_cost),
            "version": cs.version,
        })

    # 4. Sales data
    formal_quotes = []
    for fq in FormalQuotation.objects.filter(Q(rfq__in=rfqs) | Q(costing_sheet_id__in=cs_ids)).select_related("created_by"):
        formal_quotes.append({
            "id": fq.id, "quotation_number": fq.quotation_number,
            "client_name": fq.client_name, "project_title": fq.project_title,
            "status": fq.status, "total_amount": str(fq.total_amount),
        })

    sales_orders = []
    fq_ids = [fq["id"] for fq in formal_quotes]
    for so in SalesOrder.objects.filter(Q(rfq__in=rfqs) | Q(formal_quotation_id__in=fq_ids)).select_related("created_by"):
        sales_orders.append({
            "id": so.id, "so_number": so.so_number,
            "client_name": so.client_name, "project_title": so.project_title,
            "status": so.status, "contract_amount": str(so.contract_amount),
        })

    contract_analyses = []
    so_ids = [so["id"] for so in sales_orders]
    for ca in ContractAnalysis.objects.filter(sales_order_id__in=so_ids):
        contract_analyses.append({
            "id": ca.id, "sales_order": ca.sales_order_id,
            "contract_price": str(ca.contract_price),
            "net_cash_flow": str(ca.net_cash_flow),
            "net_benefit": str(ca.net_benefit),
        })

    # 5. Budgets
    budget_data = []
    for b in budgets.select_related("created_by", "approved_by"):
        budget_data.append({
            "id": b.id, "budget_number": b.budget_number, "title": b.title,
            "status": b.status,
            "allocated_amount": str(b.allocated_amount),
            "spent_amount": str(b.spent_amount),
            "remaining_amount": str(b.remaining_amount),
            "utilization_percent": str(
                round(float(b.spent_amount) / float(b.allocated_amount) * 100, 1)
                if b.allocated_amount else 0
            ),
            "approved_by": b.approved_by.get_full_name() if b.approved_by else "",
            "approved_at": b.approved_at.isoformat() if b.approved_at else "",
        })

    # 6. Purchase orders + variance
    po_data = []
    total_estimated = 0
    total_actual = 0
    for p in pos.select_related("supplier", "budget"):
        est = float(p.estimated_total)
        act = float(p.actual_total)
        total_estimated += est
        total_actual += act
        variance = act - est
        po_data.append({
            "id": p.id, "po_number": p.po_number, "title": p.title,
            "status": p.status,
            "supplier_name": p.supplier.name if p.supplier else "",
            "estimated_total": str(p.estimated_total),
            "actual_total": str(p.actual_total),
            "variance": str(round(variance, 2)),
            "variance_pct": str(round((variance / est * 100), 1) if est else 0),
        })

    total_variance = total_actual - total_estimated

    # 7. Audit trail for this project
    obj_filters = Q()
    for r in rfqs:
        obj_filters |= Q(object_type="RFQ", object_id=r.id)
    for q_data in quotation_data:
        obj_filters |= Q(object_type="Quotation", object_id=q_data["id"])
    for cs in costing_data:
        obj_filters |= Q(object_type="CostingSheet", object_id=cs["id"])
    for fq in formal_quotes:
        obj_filters |= Q(object_type="FormalQuotation", object_id=fq["id"])
    for so in sales_orders:
        obj_filters |= Q(object_type="SalesOrder", object_id=so["id"])
    for b_data in budget_data:
        obj_filters |= Q(object_type="Budget", object_id=b_data["id"])
    for p_data in po_data:
        obj_filters |= Q(object_type="PurchaseOrder", object_id=p_data["id"])
        obj_filters |= Q(object_type="ActualCost", details__purchase_order_id=p_data["id"])
    
    audit_trail = []
    if obj_filters:
        for log in AuditLog.objects.filter(obj_filters).select_related("user").order_by("timestamp")[:200]:
            audit_trail.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "module": log.module,
                "action": log.action,
                "action_display": log.get_action_display(),
                "object_type": log.object_type,
                "object_id": log.object_id,
                "object_repr": log.object_repr,
                "old_status": log.old_status,
                "new_status": log.new_status,
                "user_name": log.user.get_full_name() if log.user else "System",
                "details": log.details,
            })

    return Response({
        "executive_summary": {
            "project_title": rfq_data[0]["project_title"] if rfq_data else (budget_data[0]["title"] if budget_data else ""),
            "client_name": rfq_data[0]["client_name"] if rfq_data else "",
            "total_estimated": str(round(total_estimated, 2)),
            "total_actual": str(round(total_actual, 2)),
            "total_variance": str(round(total_variance, 2)),
            "total_variance_pct": str(round((total_variance / total_estimated * 100), 1) if total_estimated else 0),
        },
        "rfqs": rfq_data,
        "quotations": quotation_data,
        "costing_sheets": costing_data,
        "formal_quotations": formal_quotes,
        "sales_orders": sales_orders,
        "contract_analyses": contract_analyses,
        "budgets": budget_data,
        "purchase_orders": po_data,
        "audit_trail": audit_trail,
    })
