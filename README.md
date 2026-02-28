# Business Internal System — RFQ & Costing Sheet

A full-stack internal business system built with **React + TypeScript + Tailwind CSS** (frontend) and **Django + Django REST Framework** (backend). Designed for managing **Request for Quotations (RFQ)** and **Costing Sheets** with RBAC security, multi-level approvals, what-if scenario analysis, version history, and data export.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Backend Setup (Django)](#backend-setup-django)
5. [Frontend Setup (Vite + React)](#frontend-setup-vite--react)
6. [Database: SQLite → PostgreSQL Migration](#database-sqlite--postgresql-migration)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Security Features](#security-features)
9. [Module Details](#module-details)
10. [Complete Workflow](#complete-workflow)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                React + TypeScript Frontend                       │
│  Vite 5 · Tailwind CSS · Recharts · Lucide Icons · Sonner       │
│  (Dashboard, RFQ Forms, Costing Sheets, Quotation Comparison)   │
│                    http://localhost:5173                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │  REST API (JSON + CSRF)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Django Backend (DRF)                          │
│   /api/v1/accounts/   — Authentication & User Management        │
│   /api/v1/rfq/        — RFQ, Suppliers, Quotations              │
│   /api/v1/costing/    — Costing Sheets, Scenarios, Exports      │
│                    http://localhost:8000                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │  Django ORM
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│            SQLite (dev) / PostgreSQL (production)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer        | Technology                                                        |
|--------------|-------------------------------------------------------------------|
| **Frontend** | Vite 5, React 18, TypeScript, Tailwind CSS 3.4, React Router v7  |
| **UI/UX**    | Lucide React icons, Recharts (charts), Sonner (toast), Dark mode  |
| **Backend**  | Django 4.2, Django REST Framework, Session auth + CSRF            |
| **Database** | SQLite (development), PostgreSQL-ready (production)               |
| **Security** | AES-256 field encryption, PBKDF2 password hashing, RBAC          |
| **Design**   | Green gradient theme (#63D44A → #0E8F79), collapsible sidebar     |

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
│       ├── serializers.py            # Nested serializers with auto-generated sheet numbers
│       ├── views.py                  # CRUD + recalculate, versioning, approve, export
│       └── urls.py                   # Costing endpoints
│
└── frontend/                         # Vite + React + TypeScript application
    ├── package.json                  # Node dependencies
    ├── index.html                    # HTML entry point (Vite)
    ├── vite.config.ts                # Vite config with API proxy
    ├── tsconfig.json                 # TypeScript configuration
    ├── tailwind.config.js            # Tailwind CSS configuration
    ├── postcss.config.js             # PostCSS configuration
    └── src/
        ├── index.tsx                 # Entry point
        ├── index.css                 # Tailwind directives + global styles
        ├── App.tsx                   # Root component with routing
        ├── context/
        │   └── AuthContext.tsx        # Global auth state (login/logout/roles)
        ├── services/
        │   ├── api.ts                # Axios instance (CSRF cookie, interceptors)
        │   ├── rfqService.ts         # RFQ, Supplier & Quotation API functions
        │   ├── costingService.ts     # Costing Sheet, Scenario & Export API functions
        │   └── userService.ts        # User management API functions
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.tsx        # App shell (sidebar + topnav + content)
        │   │   ├── Sidebar.tsx       # Collapsible navigation sidebar
        │   │   └── TopNav.tsx        # Top navigation bar with user menu
        │   └── ui/
        │       ├── Card.tsx          # Reusable card component
        │       ├── GreenButton.tsx   # Themed gradient button
        │       ├── StatCard.tsx      # Dashboard statistic card
        │       └── StatusBadge.tsx   # Color-coded status badge
        └── pages/
            ├── Login.tsx             # Login form
            ├── Dashboard.tsx         # Summary dashboard with stats
            ├── rfq/
            │   ├── RFQList.tsx       # RFQ list with filters & status badges
            │   ├── RFQForm.tsx       # Create/Edit RFQ + line items
            │   ├── RFQDetail.tsx     # RFQ detail + approval workflow
            │   ├── SupplierList.tsx  # Supplier directory
            │   ├── SupplierForm.tsx  # Create/Edit supplier
            │   ├── QuotationList.tsx # All quotations with accept/reject actions
            │   ├── QuotationForm.tsx # Create/Edit quotation (auto-populates from RFQ)
            │   └── QuotationCompare.tsx # Side-by-side comparison + accept/reject
            ├── costing/
            │   ├── CostingList.tsx   # Costing sheet list
            │   ├── CostingForm.tsx   # Create/Edit with categorized line items
            │   ├── CostingDetail.tsx # Detail + pie chart + export + version history
            │   ├── ScenarioList.tsx  # What-if scenario list with projections
            │   └── ScenarioForm.tsx  # Create scenario with cost overrides
            └── users/
                ├── UserList.tsx      # User management list (Admin only)
                └── UserForm.tsx      # Create/Edit user with role assignment
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

## Frontend Setup (Vite + React)

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

The React app will be available at `http://localhost:5173/`.
API calls are proxied to `http://localhost:8000` via `vite.config.ts`.

### Build for Production

```bash
npm run build     # Output in dist/
npm run preview   # Preview production build
```

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
| GET/PUT/DELETE | `/suppliers/{id}/`       | Retrieve, update, or delete supplier |
| GET    | `/rfqs/`                       | List RFQs (filterable by status)     |
| POST   | `/rfqs/`                       | Create RFQ with line items           |
| GET    | `/rfqs/{id}/`                  | RFQ detail with items                |
| POST   | `/rfqs/{id}/submit/`           | Submit for approval                  |
| POST   | `/rfqs/{id}/approve/`          | Approve (multi-level)                |
| POST   | `/rfqs/{id}/reject/`           | Reject                               |
| GET    | `/rfqs/{id}/compare/`          | Compare quotations (matrix view)     |
| GET    | `/rfqs/{id}/approvals/`        | Approval audit trail                 |
| GET    | `/quotations/`                 | List all quotations                  |
| POST   | `/quotations/`                 | Submit quotation with items          |
| POST   | `/quotations/{id}/accept/`     | Accept quotation                     |
| POST   | `/quotations/{id}/reject/`     | Reject quotation                     |

### Costing Module (`/api/v1/costing/`)
| Method | Endpoint                           | Description                          |
|--------|------------------------------------|--------------------------------------|
| GET    | `/sheets/`                         | List costing sheets                  |
| POST   | `/sheets/`                         | Create sheet with line items         |
| GET    | `/sheets/{id}/`                    | Sheet detail with calculations       |
| PUT    | `/sheets/{id}/`                    | Update sheet (status, line items)    |
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
| Accept quotation      | ✅    | ✅      | ❌          | ❌      | ❌     |
| Edit financial data   | ✅    | ✅      | ❌          | ✅      | ❌     |
| Approve costing sheet | ✅    | ✅      | ❌          | ❌      | ❌     |
| Manage users          | ✅    | ❌      | ❌          | ❌      | ❌     |
| View data             | ✅    | ✅      | ✅          | ✅      | ✅     |

---

## Module Details

### RFQ Module
- **Create & manage RFQs** with item details, quantities, and specifications
- **Supplier database** with profiles, contacts, and performance history (rating, on-time %)
- **Track quotations** with deadlines and statuses (Pending → Accepted / Rejected)
- **Side-by-side comparison** of quotations by price, delivery time, payment terms, and supplier rating
- **Accept / Reject quotations** directly from the comparison matrix or list view
- **Multi-level approval workflow** with audit trail
- **Integration** with Costing Sheet (approved quotation prices feed into cost calculations)

### Costing Sheet Module
- **Detailed cost breakdown** by category — Material, Labor, Overhead, Logistics
- **Auto-generated sheet numbers** (format: `CS-YYYYMM-NNNN`)
- **Dynamic calculations** — total cost, selling price, and margin computed automatically
- **Pie chart visualization** of cost distribution by category (Recharts)
- **Version control** — save snapshots and browse full version history with expandable details
- **Status workflow** — Draft → In Review → Approved → Archived
- **Profit margin analysis** — target margin % → selling price calculation
- **What-if scenarios** — override unit costs/quantities to project outcomes and compare against baseline
- **Export** — download finalized sheets as CSV or JSON reports

### User Management (Admin)
- **Create and manage users** with role assignment
- **5 built-in roles** — Admin, Manager, Procurement, Finance, Viewer
- **Role-based access control** enforced at both API and UI levels

### Dashboard
- **At-a-glance summary** with stat cards for RFQs, quotations, and costing sheets
- **Quick navigation** to all modules

---

## Complete Workflow

The system supports the following end-to-end business workflow:

```
1. Create Suppliers        → Add vendor profiles with contact info & ratings
           ↓
2. Create RFQ              → Define items needed with quantities & specs
           ↓
3. Submit RFQ              → Push for multi-level approval
           ↓
4. Collect Quotations      → Enter supplier quotes with pricing & delivery terms
           ↓
5. Compare & Accept        → Side-by-side matrix comparison → accept best quote
           ↓
6. Create Costing Sheet    → Break down costs (materials, labor, overhead, logistics)
           ↓
7. What-If Scenarios       → Model cost variations (±% or fixed overrides)
           ↓
8. Save Snapshot           → Lock a version of the costing sheet for records
           ↓
9. Submit for Review       → Change status from Draft → In Review
           ↓
10. Approve                → Manager/Admin approves the costing sheet
           ↓
11. Export                 → Download CSV or JSON for finance/PO creation
```

---

## License

Internal use only.
