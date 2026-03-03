# ============================================================================
# accounts/urls.py — URL routing for accounts app
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"audit-logs", views.AuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.me_view, name="me"),
    path("profile/", views.update_profile_view, name="update-profile"),
    path("change-password/", views.change_password_view, name="change-password"),
    path("reports/project/", views.project_report_view, name="project-report"),
    path("", include(router.urls)),
]
