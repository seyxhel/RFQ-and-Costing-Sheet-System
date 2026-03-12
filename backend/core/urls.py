# ============================================================================
# core/urls.py — Root URL configuration
# ============================================================================
# All API endpoints are versioned under /api/v1/
# ============================================================================

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # API v1 endpoints
    path("api/v1/accounts/", include("accounts.urls")),
    path("api/v1/products/", include("products.urls")),
    path("api/v1/rfq/", include("rfq.urls")),
    path("api/v1/costing/", include("costing.urls")),
    path("api/v1/sales/", include("sales.urls")),
    path("api/v1/budget/", include("budget.urls")),
    path("api/v1/procurement/", include("procurement.urls")),
    path("api/v1/notifications/", include("notifications.urls")),

    # DRF browsable API auth (dev convenience)
    path("api-auth/", include("rest_framework.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
