# Business Internal System — RFQ & Costing Sheet

A full-stack internal business system built with **React** (frontend) and **Django + Django REST Framework** (backend). Designed for managing **Request for Quotations (RFQ)** and **Costing Sheets** with RBAC security, multi-level approvals, and what-if scenario analysis.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Backend Setup (Django)](#backend-setup-django)
4. [Frontend Setup (React)](#frontend-setup-react)
5. [Database: SQLite → PostgreSQL Migration](#database-sqlite--postgresql-migration)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Security Features](#security-features)
8. [Module Details](#module-details)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│  (Dashboard, RFQ Forms, Costing Sheets, Quotation Comparison)   │
│                    http://localhost:3000                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │  REST API (JSON)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Django Backend (DRF)                          │
│   /api/v1/accounts/   — Authentication & User Management        │
│   /api/v1/rfq/        — RFQ, Suppliers, Quotations              │
│   /api/v1/costing/    — Costing Sheets, Scenarios               │
│                    http://localhost:8000                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │  Django ORM
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│            SQLite (dev) / PostgreSQL (production)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
├── backend/                          # Django project root
│   ├── manage.py                     # Django management commands
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment variables template
│   ├── core/                         # Django project settings
│   │   ├── settings.py               # Main settings (DB, DRF, CORS, Security)
│   │   ├── urls.py                   # Root URL routing
│   │   └── wsgi.py                   # WSGI entry point
│   ├── accounts/                     # User management & RBAC
│   │   ├── models.py                 # Custom User model with roles
│   │   ├── serializers.py            # User serializers
│   │   ├── views.py                  # Login, logout, user CRUD
│   │   ├── permissions.py            # Custom DRF permission classes
│   │   ├── encryption.py             # AES-256 field encryption utility
│   │   └── urls.py                   # Account endpoints
│   ├── rfq/                          # RFQ module
│   │   ├── models.py                 # Supplier, RFQ, RFQItem, Quotation, ApprovalLog
│   │   ├── serializers.py            # Nested serializers for RFQ & Quotation
│   │   ├── views.py                  # CRUD + workflow (submit, approve, compare)
│   │   └── urls.py                   # RFQ endpoints
│   └── costing/                      # Costing Sheet module
│       ├── models.py                 # CostingSheet, LineItem, Version, Scenario
│       ├── serializers.py            # Nested serializers with calculations
│       ├── views.py                  # CRUD + recalculate, versioning, export
│       └── urls.py                   # Costing endpoints
│
└── frontend/                         # React application
    ├── package.json                  # Node dependencies
    ├── public/index.html             # HTML template
    └── src/
        ├── index.js                  # Entry point
        ├── index.css                 # Global styles
        ├── App.js                    # Root component with routing
        ├── context/
        │   └── AuthContext.js        # Global auth state (login/logout/roles)
        ├── services/
        │   ├── api.js                # Axios instance (CSRF, interceptors)
        │   ├── rfqService.js         # RFQ API call functions
        │   └── costingService.js     # Costing API call functions
        ├── components/common/
        │   ├── Sidebar.js            # Navigation sidebar
        │   ├── DataTable.js          # Reusable data table
        │   ├── StatusBadge.js        # Status badge component
        │   └── ConfirmDialog.js      # Confirmation modal
        └── pages/
            ├── LoginPage.js          # Login form
            ├── Dashboard.js          # Summary dashboard
            ├── rfq/
            │   ├── RFQList.js        # RFQ list with filters
            │   ├── RFQForm.js        # Create/Edit RFQ + line items
            │   ├── RFQDetail.js      # RFQ detail + approval workflow
            │   ├── SupplierList.js   # Supplier database
            │   ├── SupplierForm.js   # Create/Edit supplier
            │   ├── QuotationList.js  # All quotations
            │   ├── QuotationForm.js  # Create/Edit quotation
            │   └── QuotationCompare.js # Side-by-side comparison
            └── costing/
                ├── CostingList.js    # Costing sheet list
                ├── CostingForm.js    # Create/Edit with line items
                ├── CostingDetail.js  # Detail + export + versioning
                ├── ScenarioList.js   # What-if scenario list
                └── ScenarioForm.js   # Create scenario with overrides
```

---

## Backend Setup (Django)

### Prerequisites
- Python 3.10+
- pip

### Steps

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and configure environment
copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux
# Edit .env with your settings

# 4. Run migrations
python manage.py makemigrations accounts rfq costing
python manage.py migrate

# 5. Create superuser (ADMIN role)
python manage.py createsuperuser

# 6. Start development server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/v1/`.
Django admin at `http://localhost:8000/admin/`.

---

## Frontend Setup (React)

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start development server
npm start
```

The React app will be available at `http://localhost:3000/`.
API calls are proxied to `http://localhost:8000` via `package.json`.

---

## Database: SQLite → PostgreSQL Migration

The ORM models are designed to be **database-agnostic**. To switch to PostgreSQL:

### 1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE business_system;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE business_system TO app_user;
```

### 2. Update environment variables in `.env`:
```
DB_ENGINE=django.db.backends.postgresql
DB_NAME=business_system
DB_USER=app_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432
```

### 3. Run migrations:
```bash
python manage.py migrate
```

**That's it!** No model changes needed. The Django ORM handles the translation.

---

## API Endpoints Reference

### Accounts (`/api/v1/accounts/`)
| Method | Endpoint              | Description                  | Auth Required |
|--------|-----------------------|------------------------------|---------------|
| POST   | `/login/`             | Login (session-based)        | No            |
| POST   | `/logout/`            | Logout                       | Yes           |
| GET    | `/me/`                | Current user profile         | Yes           |
| GET    | `/users/`             | List all users               | Admin only    |
| POST   | `/users/`             | Create user                  | Admin only    |

### RFQ Module (`/api/v1/rfq/`)
| Method | Endpoint                       | Description                          |
|--------|--------------------------------|--------------------------------------|
| GET    | `/suppliers/`                  | List suppliers                       |
| POST   | `/suppliers/`                  | Create supplier                      |
| GET    | `/rfqs/`                       | List RFQs (filterable by status)     |
| POST   | `/rfqs/`                       | Create RFQ with line items           |
| GET    | `/rfqs/{id}/`                  | RFQ detail with items                |
| POST   | `/rfqs/{id}/submit/`           | Submit for approval                  |
| POST   | `/rfqs/{id}/approve/`          | Approve (multi-level)                |
| POST   | `/rfqs/{id}/reject/`           | Reject                               |
| GET    | `/rfqs/{id}/compare/`          | Compare quotations (matrix)          |
| GET    | `/rfqs/{id}/approvals/`        | Approval audit trail                 |
| GET    | `/quotations/`                 | List all quotations                  |
| POST   | `/quotations/`                 | Submit quotation                     |
| POST   | `/quotations/{id}/accept/`     | Accept quotation                     |

### Costing Module (`/api/v1/costing/`)
| Method | Endpoint                           | Description                          |
|--------|------------------------------------|--------------------------------------|
| GET    | `/sheets/`                         | List costing sheets                  |
| POST   | `/sheets/`                         | Create sheet with line items         |
| GET    | `/sheets/{id}/`                    | Sheet detail                         |
| POST   | `/sheets/{id}/recalculate/`        | Recalculate totals                   |
| POST   | `/sheets/{id}/save_version/`       | Save version snapshot                |
| GET    | `/sheets/{id}/versions/`           | Version history                      |
| POST   | `/sheets/{id}/approve/`            | Approve sheet                        |
| GET    | `/sheets/{id}/export_csv/`         | Download CSV report                  |
| GET    | `/sheets/{id}/export_json/`        | Download JSON report                 |
| GET    | `/line-items/`                     | List/create line items               |
| GET    | `/scenarios/`                      | List what-if scenarios               |
| POST   | `/scenarios/`                      | Create scenario                      |
| POST   | `/scenarios/{id}/calculate/`       | Run scenario projection              |

---

## Security Features

| Feature                  | Implementation                                              |
|--------------------------|-------------------------------------------------------------|
| **Authentication**       | Django session-based auth (CSRF protected)                  |
| **Password hashing**     | PBKDF2 (Django default, 600K iterations)                    |
| **RBAC**                 | 5 roles: Admin, Manager, Procurement, Finance, Viewer       |
| **Field encryption**     | AES-256 via `cryptography` library (Fernet)                 |
| **HTTPS/TLS**            | Auto-enabled when `DEBUG=False` (HSTS, secure cookies)      |
| **CORS**                 | Restricted to allowed origins via `django-cors-headers`     |
| **Permission classes**   | `IsAdminRole`, `CanApprove`, `CanEditFinancial`, `IsOwner`  |

### Role Permissions Matrix

| Action                | Admin | Manager | Procurement | Finance | Viewer |
|-----------------------|-------|---------|-------------|---------|--------|
| Create RFQ            | ✅    | ✅      | ✅          | ❌      | ❌     |
| Approve RFQ           | ✅    | ✅      | ❌          | ❌      | ❌     |
| Edit financial data   | ✅    | ✅      | ❌          | ✅      | ❌     |
| Manage users          | ✅    | ❌      | ❌          | ❌      | ❌     |
| View data             | ✅    | ✅      | ✅          | ✅      | ✅     |

---

## Module Details

### RFQ Module
- **Create & manage RFQs** with item details, quantities, and specifications
- **Supplier database** with profiles, contacts, and performance history (rating, on-time %)
- **Track quotations** with deadlines and statuses (Draft → Pending → Approved)
- **Side-by-side comparison** of quotations by price, delivery time, and terms
- **Multi-level approval workflow** with audit trail
- **Integration** with Costing Sheet (approved quotation prices feed into cost calculations)

### Costing Sheet Module
- **Detailed cost breakdown** — materials, labor, overhead, logistics
- **Dynamic calculations** based on supplier quotation prices
- **Version control** — save snapshots of costing sheet state
- **Profit margin analysis** — target margin → selling price calculation
- **What-if scenarios** — override unit costs/quantities to project outcomes
- **Export** — download as CSV or JSON report

---

## License

Internal use only.
