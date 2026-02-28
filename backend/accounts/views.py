# ============================================================================
# accounts/views.py — Authentication & user management API views
# ============================================================================

from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer
from .permissions import IsAdminRole

User = get_user_model()


# --------------------------------------------------------------------------
# Session-based authentication endpoints
# --------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def login_view(request):
    """
    POST /api/v1/accounts/login/
    Authenticate user and create a session.
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )
    if user is None:
        return Response(
            {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
        )
    if not user.is_active:
        return Response(
            {"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN
        )

    login(request, user)
    return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    POST /api/v1/accounts/logout/
    End the user session.
    """
    logout(request)
    return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@ensure_csrf_cookie
def me_view(request):
    """
    GET /api/v1/accounts/me/
    Return the currently authenticated user's profile.
    """
    return Response(UserSerializer(request.user).data)


# --------------------------------------------------------------------------
# User management (admin only)
# --------------------------------------------------------------------------

class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD for user accounts — restricted to ADMIN role.
    Endpoints:
        GET    /api/v1/accounts/users/
        POST   /api/v1/accounts/users/
        GET    /api/v1/accounts/users/{id}/
        PUT    /api/v1/accounts/users/{id}/
        DELETE /api/v1/accounts/users/{id}/
    """
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserSerializer
