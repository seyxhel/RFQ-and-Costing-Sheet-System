from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"purchase-orders", views.PurchaseOrderViewSet, basename="purchaseorder")
router.register(r"actual-costs", views.ActualCostViewSet, basename="actualcost")

urlpatterns = [
    path("", include(router.urls)),
]
