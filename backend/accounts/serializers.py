# ============================================================================
# accounts/serializers.py — User serialization for REST API
# ============================================================================

from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Full user representation (admin-facing)."""

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "department", "phone", "is_active", "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users (password write-only)."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password", "first_name",
            "last_name", "role", "department", "phone",
        ]

    def create(self, validated_data):
        # Use create_user to ensure password is hashed via PBKDF2
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users — password is optional."""

    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password", "first_name",
            "last_name", "role", "department", "phone", "is_active",
        ]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    """Simple username + password login."""
    username = serializers.CharField()
    password = serializers.CharField()


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Self-service profile update — users can update their own info."""

    class Meta:
        model = User
        fields = [
            "first_name", "last_name", "email", "phone", "department",
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """Self-service password change — requires current password."""
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data


# --------------------------------------------------------------------------
# Attachment (generic file uploads)
# --------------------------------------------------------------------------
class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        from .models import Attachment
        model = Attachment
        fields = [
            "id", "file", "filename", "file_size", "description",
            "content_type", "object_id",
            "uploaded_by", "uploaded_by_name", "uploaded_at",
        ]
        read_only_fields = ["id", "filename", "file_size", "uploaded_by", "uploaded_at"]


# --------------------------------------------------------------------------
# Audit Log
# --------------------------------------------------------------------------
class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    module_display = serializers.CharField(source="get_module_display", read_only=True)
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        from .models import AuditLog
        model = AuditLog
        fields = [
            "id", "module", "module_display", "action", "action_display",
            "object_type", "object_id", "object_repr",
            "old_status", "new_status", "details",
            "reference", "remarks",
            "user", "user_name", "ip_address", "timestamp",
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "System"
