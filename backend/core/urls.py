# ============================================================================
# core/urls.py — Root URL configuration
# ============================================================================
# All API endpoints are versioned under /api/v1/
# ============================================================================

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # API v1 endpoints
    path("api/v1/accounts/", include("accounts.urls")),   # Auth & user management
    path("api/v1/rfq/", include("rfq.urls")),             # RFQ module
    path("api/v1/costing/", include("costing.urls")),      # Costing Sheet module

    # DRF browsable API auth (dev convenience)
    path("api-auth/", include("rest_framework.urls")),
]
