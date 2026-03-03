from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Attachment


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
