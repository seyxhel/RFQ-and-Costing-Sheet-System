# ============================================================================
# costing/urls.py — URL routing for the Costing module
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"cost-categories", views.CostCategoryViewSet, basename="costcategory")
router.register(r"commission-roles", views.CommissionRoleViewSet, basename="commissionrole")
router.register(r"sheets", views.CostingSheetViewSet, basename="costingsheet")
router.register(r"line-items", views.CostingLineItemViewSet, basename="costinglineitem")
router.register(r"scenarios", views.ScenarioViewSet, basename="scenario")

urlpatterns = [
    path("", include(router.urls)),
]
