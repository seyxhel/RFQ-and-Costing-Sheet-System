# ============================================================================
# costing/urls.py — URL routing for the Costing Sheet module
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"sheets", views.CostingSheetViewSet, basename="costingsheet")
router.register(r"line-items", views.CostingLineItemViewSet, basename="costinglineitem")
router.register(r"scenarios", views.ScenarioViewSet, basename="scenario")

urlpatterns = [
    path("", include(router.urls)),
]
