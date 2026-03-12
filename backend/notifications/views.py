from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from .models import Notification
from .serializers import NotificationSerializer, CreateNotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """Return the current user's notifications (newest first)."""
    qs = Notification.objects.filter(recipient=request.user).select_related("sender")
    serializer = NotificationSerializer(qs[:50], many=True)
    unread = qs.filter(is_read=False).count()
    return Response({"unread_count": unread, "results": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_read(request):
    """Mark specific notifications as read.  Body: { "ids": [1,2,3] }"""
    ids = request.data.get("ids", [])
    if not isinstance(ids, list):
        return Response({"detail": "ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)
    updated = Notification.objects.filter(
        recipient=request.user, id__in=ids, is_read=False
    ).update(is_read=True)
    return Response({"updated": updated})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all of the current user's notifications as read."""
    updated = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).update(is_read=True)
    return Response({"updated": updated})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification(request, pk):
    """Delete a single notification belonging to the current user."""
    deleted, _ = Notification.objects.filter(recipient=request.user, pk=pk).delete()
    if not deleted:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def clear_all(request):
    """Delete all notifications for the current user."""
    Notification.objects.filter(recipient=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_notification(request):
    """
    Create notifications for one or more recipients.
    Body: { notification_type, title, message?, reference_id?, reference_url?, recipients: [user_ids] }
    """
    serializer = CreateNotificationSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    created = serializer.save()
    return Response(
        {"detail": f"Sent {len(created)} notification(s)."},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_to_role(request):
    """
    Send a notification to all users with a given role.
    Body: { role, notification_type, title, message?, reference_id?, reference_url? }
    """
    role = request.data.get("role", "").upper()
    valid_roles = [r[0] for r in User.Role.choices]
    if role not in valid_roles:
        return Response(
            {"detail": f"Invalid role. Choose from: {valid_roles}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    recipient_ids = list(
        User.objects.filter(role=role, is_active=True).values_list("id", flat=True)
    )
    if not recipient_ids:
        return Response({"detail": "No users with that role."}, status=status.HTTP_404_NOT_FOUND)

    data = {**request.data, "recipients": recipient_ids}
    serializer = CreateNotificationSerializer(data=data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    created = serializer.save()
    return Response(
        {"detail": f"Sent {len(created)} notification(s) to {role} users."},
        status=status.HTTP_201_CREATED,
    )
