# ============================================================================
# core/settings.py — Django project settings
# ============================================================================
# - Starts with SQLite for development
# - Easily switch to PostgreSQL by changing DATABASES config
# - Integrates DRF, CORS, and app modules
# ============================================================================

import os
import dj_database_url
from pathlib import Path

# Try to load .env values; fall back gracefully if python-decouple is missing
try:
    from decouple import config as env_config
except ImportError:
    # Minimal fallback: read from os.environ
    env_config = lambda key, default="", cast=str: cast(os.environ.get(key, default))

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------------------------------------------
# Security
# --------------------------------------------------------------------------
SECRET_KEY = env_config("DJANGO_SECRET_KEY", default="change-me-in-production-use-long-random-string")
DEBUG = env_config("DJANGO_DEBUG", default="True", cast=lambda v: v.lower() in ("true", "1", "yes"))
ALLOWED_HOSTS = env_config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")

# --------------------------------------------------------------------------
# Installed applications
# --------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",           # Django REST Framework
    "corsheaders",              # Cross-Origin Resource Sharing
    "django_filters",           # DRF filtering

    # Project apps
    "accounts",                 # User management, RBAC, authentication
    "rfq",                      # Request for Quotation module
    "costing",                  # Costing Sheet module
]

# --------------------------------------------------------------------------
# Middleware
# --------------------------------------------------------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",             # CORS — must be near top
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",        # Static files (prod)
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# --------------------------------------------------------------------------
# Database
# --------------------------------------------------------------------------
# DEFAULT: SQLite for local development — zero configuration required.
# PRODUCTION: Swap to PostgreSQL by setting environment variables.
#
# To migrate to PostgreSQL, set these env vars:
#   DB_ENGINE=django.db.backends.postgresql
#   DB_NAME=business_system
#   DB_USER=your_pg_user
#   DB_PASSWORD=your_pg_password
#   DB_HOST=localhost
#   DB_PORT=5432
# --------------------------------------------------------------------------

# DATABASE_URL takes priority (Railway / Heroku / Render style)
# Falls back to individual DB_* env vars, then SQLite for local dev.
DATABASE_URL = os.environ.get("DATABASE_URL", "")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600),
    }
else:
    DB_ENGINE = env_config("DB_ENGINE", default="django.db.backends.sqlite3")
    if DB_ENGINE == "django.db.backends.sqlite3":
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }
    else:
        DATABASES = {
            "default": {
                "ENGINE": DB_ENGINE,
                "NAME": env_config("DB_NAME", default="business_system"),
                "USER": env_config("DB_USER", default="postgres"),
                "PASSWORD": env_config("DB_PASSWORD", default=""),
                "HOST": env_config("DB_HOST", default="localhost"),
                "PORT": env_config("DB_PORT", default="5432"),
            }
        }

# --------------------------------------------------------------------------
# Auth — custom user model
# --------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --------------------------------------------------------------------------
# REST Framework
# --------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

# --------------------------------------------------------------------------
# CORS (allow React dev server)
# --------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    o.strip().rstrip("/") for o in env_config(
        "CORS_ALLOWED_ORIGINS",
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",") if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins — must include the frontend dev server + Railway domains
CSRF_TRUSTED_ORIGINS = [
    o.strip().rstrip("/") for o in env_config(
        "CSRF_TRUSTED_ORIGINS",
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",") if o.strip()
]

# --------------------------------------------------------------------------
# Internationalization
# --------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --------------------------------------------------------------------------
# Static files
# --------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --------------------------------------------------------------------------
# Field-level encryption key (AES-256 via cryptography library)
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# --------------------------------------------------------------------------
FIELD_ENCRYPTION_KEY = env_config("FIELD_ENCRYPTION_KEY", default="")

# --------------------------------------------------------------------------
# HTTPS / Security headers (enable in production)
# --------------------------------------------------------------------------
if not DEBUG:
    # Railway terminates SSL at the proxy; don't redirect inside the container
    SECURE_SSL_REDIRECT = False
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Allow Railway-assigned hosts
    CSRF_COOKIE_DOMAIN = os.environ.get("CSRF_COOKIE_DOMAIN", None)
    SESSION_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SAMESITE = "None"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# WhiteNoise — serve static files with compression
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
