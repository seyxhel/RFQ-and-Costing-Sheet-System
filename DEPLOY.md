# Railway Deployment Guide

This project is configured for deployment on **Railway** with 3 services:

| Service    | Source          | Description                        |
|------------|-----------------|------------------------------------|
| PostgreSQL | Railway add-on  | Managed database (already created) |
| Backend    | `backend/`      | Django + Gunicorn API server       |
| Frontend   | `frontend/`     | Vite build + Nginx reverse proxy   |

---

## Prerequisites

- A Railway account at [railway.app](https://railway.app)
- Your PostgreSQL service is already running with connection string:
  ```
  Internal: postgresql://postgres:jdkReBRNaEVAsIaXFJPXRxUxuncUDfUo@postgres.railway.internal:5432/railway
  Public:   postgresql://postgres:jdkReBRNaEVAsIaXFJPXRxUxuncUDfUo@ballast.proxy.rlwy.net:13121/railway
  ```

---

## Step 1: Deploy the Backend

1. In your Railway project, click **"New Service"** → **"GitHub Repo"** (or **"Docker Image"**)
2. Point the **Root Directory** to `backend`
3. Railway will detect the Dockerfile automatically
4. Set these **Environment Variables**:

| Variable                      | Value                                                                                         |
|-------------------------------|-----------------------------------------------------------------------------------------------|
| `DATABASE_URL`                | `postgresql://postgres:jdkReBRNaEVAsIaXFJPXRxUxuncUDfUo@postgres.railway.internal:5432/railway` |
| `DJANGO_SECRET_KEY`           | *(generate a long random string)*                                                             |
| `DJANGO_DEBUG`                | `False`                                                                                       |
| `DJANGO_ALLOWED_HOSTS`        | `.railway.app,localhost`                                                                      |
| `CORS_ALLOWED_ORIGINS`        | `https://YOUR-FRONTEND.up.railway.app`                                                        |
| `CSRF_TRUSTED_ORIGINS`        | `https://YOUR-FRONTEND.up.railway.app`                                                        |
| `DJANGO_SUPERUSER_USERNAME`   | `admin`                                                                                       |
| `DJANGO_SUPERUSER_PASSWORD`   | *(your admin password)*                                                                       |
| `DJANGO_SUPERUSER_EMAIL`      | `admin@example.com`                                                                           |
| `PORT`                        | `8000` *(Railway sets this automatically)*                                                    |

5. Click **Deploy** — the `start.sh` script will automatically:
   - Run database migrations
   - Create the admin superuser (first deploy only)
   - Collect static files
   - Start Gunicorn

6. After deploy, note the backend's **public URL** (e.g., `https://backend-xxx.up.railway.app`)

---

## Step 2: Deploy the Frontend

1. In your Railway project, click **"New Service"** → **"GitHub Repo"** (or **"Docker Image"**)
2. Point the **Root Directory** to `frontend`
3. Railway will detect the Dockerfile automatically
4. Set these **Environment Variables**:

| Variable        | Value                                                    |
|-----------------|----------------------------------------------------------|
| `BACKEND_URL`   | `http://backend.railway.internal:8000`                   |
| `PORT`          | `80`                                                     |

> **Note**: Use the **internal** Railway URL for `BACKEND_URL` (service-to-service communication stays within Railway's private network — faster and free of egress charges). The format is `http://SERVICE_NAME.railway.internal:PORT`.

5. Click **Deploy**

6. After deploy, note the frontend's **public URL** (e.g., `https://frontend-xxx.up.railway.app`)

---

## Step 3: Update Backend CORS/CSRF

Once you know the frontend's public Railway URL, go back to the **backend service** and update:

| Variable                 | Value                                          |
|--------------------------|------------------------------------------------|
| `CORS_ALLOWED_ORIGINS`   | `https://YOUR-FRONTEND.up.railway.app`         |
| `CSRF_TRUSTED_ORIGINS`   | `https://YOUR-FRONTEND.up.railway.app`         |

The backend will automatically redeploy when you save.

---

## Step 4: Generate a Custom Domain (Optional)

In Railway, go to each service → **Settings** → **Domains** → Add a custom domain or use the generated `.up.railway.app` domain.

---

## How It Works

```
User Browser
    │
    ▼
[Frontend Nginx] (Railway)
    ├── /api/*  → proxy to Backend (internal network)
    └── /*      → serve React SPA (dist/)
                      │
                      ▼
              [Backend Gunicorn] (Railway)
                      │
                      ▼
              [PostgreSQL] (Railway)
```

- **Nginx** serves the React build and proxies `/api/` requests to the Django backend
- **Backend** connects to PostgreSQL via `DATABASE_URL` (internal Railway network)
- **Static files** are served by WhiteNoise (Django) and Nginx (React)
- **Session auth + CSRF** works across the proxy because:
  - `CORS_ALLOW_CREDENTIALS = True`
  - `SESSION_COOKIE_SAMESITE = "None"` + `SESSION_COOKIE_SECURE = True`
  - `CSRF_TRUSTED_ORIGINS` includes the frontend domain

---

## Local Testing with Docker Compose

```bash
# From the project root (where docker-compose.yml is)
docker-compose up --build

# Access:
# Frontend: http://localhost:8080
# Backend:  http://localhost:8000
# Postgres: localhost:5432
```

---

## Troubleshooting

| Issue                         | Fix                                                                |
|-------------------------------|--------------------------------------------------------------------|
| 403 CSRF error                | Ensure `CSRF_TRUSTED_ORIGINS` includes the exact frontend URL      |
| CORS blocked                  | Ensure `CORS_ALLOWED_ORIGINS` includes the exact frontend URL      |
| 502 Bad Gateway               | Check backend logs — it may still be starting (migrations)         |
| Static files 404              | Backend: check `python manage.py collectstatic` ran in build       |
| Can't login after deploy      | Check `DJANGO_SUPERUSER_PASSWORD` was set before first deploy      |
| Database connection refused   | Use **internal** URL for `DATABASE_URL`, not the public proxy URL  |
