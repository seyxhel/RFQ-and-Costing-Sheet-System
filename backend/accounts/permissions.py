# ============================================================================
# accounts/permissions.py — Custom DRF permissions for RBAC
# ============================================================================

from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow access only to users with ADMIN role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin_role


class IsManagerOrAbove(BasePermission):
    """Allow access to ADMIN and MANAGER roles."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_manager_role


class CanApprove(BasePermission):
    """Allow access to users who can approve RFQs / costing sheets."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_approve


class CanEditFinancial(BasePermission):
    """Allow access to users who can edit financial data."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.can_edit_financial


class IsOwnerOrAdmin(BasePermission):
    """Object-level: owner of the record or MANAGEMENT can modify."""

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin_role:
            return True
        # Expect the object to have a `created_by` field
        return hasattr(obj, "created_by") and obj.created_by == request.user
