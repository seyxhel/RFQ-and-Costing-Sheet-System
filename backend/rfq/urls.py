# ============================================================================
# rfq/urls.py — URL routing for the RFQ module
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"suppliers", views.SupplierViewSet, basename="supplier")
router.register(r"rfqs", views.RFQViewSet, basename="rfq")
router.register(r"quotations", views.QuotationViewSet, basename="quotation")

urlpatterns = [
    path("", include(router.urls)),
]
