from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Attachment, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "role", "department", "is_active"]
    list_filter = ["role", "department", "is_active"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Business Info", {"fields": ("role", "department", "phone")}),
    )


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["filename", "file_size", "content_type", "object_id", "uploaded_by", "uploaded_at"]
    list_filter = ["content_type"]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "module", "action", "object_type", "object_repr", "user", "ip_address"]
    list_filter = ["module", "action", "object_type"]
    search_fields = ["object_repr", "object_type"]
    readonly_fields = ["timestamp", "module", "action", "object_type", "object_id",
                       "object_repr", "old_status", "new_status", "details",
                       "user", "ip_address"]
    date_hierarchy = "timestamp"
