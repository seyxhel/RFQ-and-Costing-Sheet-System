# ============================================================================
# sales/urls.py — URL routing for the Sales module
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"clients", views.ClientViewSet, basename="client")
router.register(r"quotations", views.FormalQuotationViewSet, basename="formalquotation")
router.register(r"orders", views.SalesOrderViewSet, basename="salesorder")
router.register(r"contract-analyses", views.ContractAnalysisViewSet, basename="contractanalysis")

urlpatterns = [
    path("dashboard-summary/", views.sales_dashboard_summary, name="sales-dashboard-summary"),
    path("", include(router.urls)),
]
