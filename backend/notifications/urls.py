from django.urls import path
from . import views

urlpatterns = [
    path("", views.notification_list, name="notification-list"),
    path("mark-read/", views.mark_read, name="notification-mark-read"),
    path("mark-all-read/", views.mark_all_read, name="notification-mark-all-read"),
    path("<int:pk>/", views.delete_notification, name="notification-delete"),
    path("clear/", views.clear_all, name="notification-clear-all"),
    path("send/", views.send_notification, name="notification-send"),
    path("send-to-role/", views.send_to_role, name="notification-send-to-role"),
]
