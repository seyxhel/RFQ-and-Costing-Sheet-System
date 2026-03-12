from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "reference_id",
            "reference_url",
            "is_read",
            "created_at",
            "sender",
            "sender_name",
        ]

    def get_sender_name(self, obj):
        if obj.sender:
            full = f"{obj.sender.first_name} {obj.sender.last_name}".strip()
            return full or obj.sender.username
        return None


class CreateNotificationSerializer(serializers.Serializer):
    notification_type = serializers.ChoiceField(choices=Notification.Type.choices)
    title = serializers.CharField(max_length=255)
    message = serializers.CharField(required=False, default="")
    reference_id = serializers.CharField(required=False, default="")
    reference_url = serializers.CharField(required=False, default="")
    recipients = serializers.ListField(child=serializers.IntegerField(), min_length=1)

    def create(self, validated_data):
        sender = self.context["request"].user
        recipient_ids = validated_data.pop("recipients")
        notifications = [
            Notification(recipient_id=rid, sender=sender, **validated_data)
            for rid in recipient_ids
        ]
        return Notification.objects.bulk_create(notifications)
