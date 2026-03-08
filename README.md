# Business Internal System — RFQ, Costing & Sales

A full-stack internal business system built with **React + TypeScript + Tailwind CSS** (frontend) and **Django + Django REST Framework** (backend). Covers the complete **Sales & Purchasing workflow**: Supplier canvassing, RFQ management, **PH-tax-aware costing sheets** with 3 margin levels, formal quotations, sales orders, contract analysis, budgets, and procurement variance monitoring — all with RBAC security, multi-level approvals, version history, audit logging, project reports, and configurable cost/commission categories.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Backend Setup (Django)](#backend-setup-django)
5. [Frontend Setup (Vite + React)](#frontend-setup-vite--react)
6. [Default Credentials](#default-credentials)
7. [Database: SQLite → PostgreSQL Migration](#database-sqlite--postgresql-migration)
8. [Docker Deployment](#docker-deployment)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [Security Features](#security-features)
11. [Module Details](#module-details)
12. [PH-Tax-Aware Costing Formula](#ph-tax-aware-costing-formula)
13. [Seeded Configuration Data](#seeded-configuration-data)
14. [Complete Workflow](#complete-workflow)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                  React + TypeScript Frontend                         │
│  Vite 5 · Tailwind CSS 3.4 · Recharts · Lucide Icons · Sonner      │
│  (Dashboard, RFQ, Costing, Sales, Products, Budget, Procurement,    │
│   Variance Monitor, Audit Log, Project Report, Settings)            │
│                     http://localhost:3000                            │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  REST API (JSON + CSRF)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Django Backend (DRF)                              │
│   /api/v1/accounts/     — Auth, Users, Audit Logs, Project Reports   │
│   /api/v1/products/     — Product Catalog & Categories               │
│   /api/v1/rfq/          — RFQ, Suppliers, Quotations (Canvass)       │
│   /api/v1/costing/      — Costing Sheets, Margins, Scenarios         │
│   /api/v1/sales/        — Formal Quotations, Sales Orders, Contract  │
│   /api/v1/budget/       — Budget Approval & Tracking                 │
│   /api/v1/procurement/  — Purchase Orders & Actual Costs             │
│                     http://localhost:8000                             │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  Django ORM
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│             SQLite (dev) / PostgreSQL (production / Docker)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer        | Technology                                                        |
|--------------|-------------------------------------------------------------------|
| **Frontend** | Vite 5, React 18, TypeScript 5.5, Tailwind CSS 3.4, React Router v7 |
| **UI/UX**    | Lucide React 0.522, Recharts 2.12 (charts), Sonner 2.0 (toasts), Dark mode |
| **Backend**  | Django 4.2, Django REST Framework, Session auth + CSRF            |
| **Database** | SQLite (development), PostgreSQL-ready (production)               |
| **Security** | AES-256 field encryption, PBKDF2 password hashing, 5-role RBAC   |
| **Design**   | Green gradient theme (#63D44A → #0E8F79), collapsible sidebar     |

---

## Project Structure

```
├── docker-compose.yml                  # 3-service stack (Postgres + Backend + Frontend)
├── backend/                            # Django project root
│   ├── manage.py                       # Django management commands
│   ├── requirements.txt                # Python dependencies
│   ├── Dockerfile                      # Python 3.12 + Gunicorn
│   ├── start.sh                        # Migration + seed + Gunicorn launcher
│   ├── .env.example                    # Environment variable template
│   ├── .dockerignore
│   ├── core/                           # Django project settings
│   │   ├── settings.py                 # DB, DRF, CORS, CSRF, Auth config
│   │   ├── urls.py                     # Root URL routing (7 API modules)
│   │   └── wsgi.py                     # WSGI entry point
│   ├── accounts/                       # User management, RBAC & Audit
│   │   ├── models.py                   # Custom User (5 roles), Attachment (GenericFK),
│   │   │                               #   AuditLog (system-wide activity trail)
│   │   ├── serializers.py              # User, Login, Profile, Password, AuditLog serializers
│   │   ├── views.py                    # Login/logout/me, user CRUD, audit logs, project report
│   │   ├── permissions.py              # IsAdminRole, IsManagerOrAbove, CanApprove,
│   │   │                               #   CanEditFinancial, IsOwnerOrAdmin
│   │   └── encryption.py              # AES-256 field encryption utility
│   ├── products/                       # Product Catalog
│   │   └── models.py                   # Category, Product (SKU, unit, specs,
│   │                                   #   optional RFQ & Supplier links)
│   ├── rfq/                            # RFQ & Supplier Canvassing
│   │   └── models.py                   # Supplier, RFQ, RFQItem, Quotation,
│   │                                   #   QuotationItem (VAT calc, canvass fields),
│   │                                   #   ApprovalLog
│   ├── costing/                        # PH-Tax-Aware Costing Sheets
│   │   └── models.py                   # CostCategory (CRUD), CommissionRole (CRUD),
│   │                                   #   CostingSheet, CostingLineItem,
│   │                                   #   CostingMarginLevel (LOW/MED/HIGH),
│   │                                   #   CostingCommissionSplit,
│   │                                   #   CostingVersion, Scenario
│   ├── sales/                          # Sales Module
│   │   └── models.py                   # FormalQuotation, FormalQuotationItem,
│   │                                   #   SalesOrder, ContractAnalysis
│   ├── budget/                         # Budget Management
│   │   └── models.py                   # Budget (linked to RFQ/Costing/SalesOrder)
│   └── procurement/                    # Procurement & Variance
│       └── models.py                   # PurchaseOrder, POLineItem, ActualCost
│
└── frontend/                           # Vite + React + TypeScript
    ├── package.json
    ├── vite.config.ts                  # Port 3000, proxy /api → localhost:8000
    ├── Dockerfile                      # Node 20 build + Nginx serve
    ├── nginx.conf                      # Reverse-proxy to backend + SPA fallback
    ├── .dockerignore
    └── src/
        ├── App.tsx                     # 40+ routes (ProtectedRoute + AdminRoute)
        ├── context/
        │   ├── AuthContext.tsx          # Session auth state (login/logout/roles)
        │   └── ThemeContext.tsx         # Dark mode (localStorage + OS preference)
        ├── services/
        │   ├── api.ts                  # Axios instance (CSRF, interceptors)
        │   ├── rfqService.ts           # RFQ, Supplier, Quotation APIs
        │   ├── costingService.ts       # Costing, CostCategory, CommissionRole, Scenario
        │   ├── salesService.ts         # Formal Quotations, Sales Orders, Contract Analysis
        │   ├── productService.ts       # Products & Categories
        │   ├── budgetService.ts        # Budget APIs
        │   ├── procurementService.ts   # PO & Actual Cost APIs
        │   └── userService.ts          # User management, Audit Log & Report APIs
        ├── components/
        │   ├── layout/                 # Layout, Sidebar (collapsible), TopNav
        │   └── ui/                     # Card, GreenButton, StatCard, StatusBadge
        └── pages/
            ├── Dashboard.tsx           # Summary stats with quick navigation
            ├── Login.tsx               # Session-based login
            ├── Settings.tsx            # Profile, password, dark mode,
            │                           #   Cost Categories CRUD, Commission Roles CRUD
            ├── AuditLog.tsx            # System-wide activity log with filters & CSV export
            ├── ProjectReport.tsx       # Project lifecycle report with executive summary
            ├── rfq/                    # RFQ List/Form/Detail, Suppliers, Quotations, Compare
            ├── costing/                # Costing List/Form/Detail (3 margins), Scenarios
            ├── sales/                  # Formal Quotation List/Form/Detail,
            │                           #   Sales Order List/Form/Detail, Contract Analysis
            ├── products/               # Product List/Form, Category List
            ├── budget/                 # Budget List/Form/Detail
            ├── procurement/            # PO List/Form/Detail, Variance Dashboard
            └── users/                  # User List/Form (Admin only)
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

# 3. Run migrations
python manage.py migrate

# 4. Seed default data (cost categories, commission roles, admin user)
python manage.py shell -c "
from accounts.models import User
from costing.models import CostCategory, CommissionRole

# Create superuser
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin',
        first_name='System', last_name='Admin', role='ADMIN')

# Seed cost categories
cats = [
    ('Cost of Goods Sold', True),  ('Implementation Cost', False),
    ('Labor Cost', False),         ('Representation / Meal', False),
    ('Material Cost', False),      ('Transportation Cost', False),
    ('Others / Miscellaneous', False),
]
for i, (name, vat) in enumerate(cats, 1):
    CostCategory.objects.get_or_create(name=name, defaults={
        'is_default': True, 'has_input_vat': vat, 'sort_order': i})

# Seed commission roles
roles = [('Sales', 50), ('President', 20), ('Vice President', 15),
         ('Technical', 10), ('Admin', 5)]
for i, (name, pct) in enumerate(roles, 1):
    CommissionRole.objects.get_or_create(name=name, defaults={
        'default_percent': pct, 'sort_order': i})

print('Seed data created.')
"

# 5. Start development server
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

The React app will be available at `http://localhost:3000/`.
API calls are proxied to `http://localhost:8000` via `vite.config.ts`.

### Build for Production

```bash
npm run build     # Output in dist/
npm run preview   # Preview production build
```

---

## Default Credentials

| Username | Password | Role  | Notes             |
|----------|----------|-------|-------------------|
| `admin`  | `admin`  | ADMIN | Superuser access  |

---

## Database: SQLite → PostgreSQL Migration

The ORM models are **database-agnostic**. To switch to PostgreSQL:

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

No model changes needed. The Django ORM handles the translation.

---

## Docker Deployment

The project includes a full **3-service Docker Compose** setup for production-like local testing.

### Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| **postgres** | `postgres:16-alpine` | 5432 | PostgreSQL database |
| **backend** | Custom (Python 3.12 + Gunicorn) | 8000 | Django API server |
| **frontend** | Custom (Node 20 build + Nginx) | 8080 | React production build |

### Quick Start

```bash
docker-compose up --build
```

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000/api/v1/`
- Default login: `admin` / `admin`

### How It Works

1. **Backend (`start.sh`)**: Runs migrations (auto-drops all tables and retries from scratch if migrations fail), creates default admin user, collects static files, starts Gunicorn with 3 workers
2. **Frontend (`Dockerfile`)**: Multi-stage build — Node 20 builds the Vite app, then Nginx serves the static files with reverse-proxy to the backend
3. **PostgreSQL**: Data persisted via named Docker volume (`pgdata`)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (SQLite) | PostgreSQL connection string |
| `DJANGO_SECRET_KEY` | (dev key) | Django secret key |
| `DJANGO_DEBUG` | `True` | Debug mode |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed host headers |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | CORS whitelist |
| `CSRF_TRUSTED_ORIGINS` | `http://localhost:3000` | CSRF trusted origins |
| `FIELD_ENCRYPTION_KEY` | (empty) | AES-256 Fernet key for field encryption |

See `backend/.env.example` for the full template.

---

## API Endpoints Reference

### Accounts (`/api/v1/accounts/`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/login/` | Session-based login | Public |
| POST | `/logout/` | End session | Yes |
| GET | `/me/` | Current user profile | Yes |
| PUT/PATCH | `/profile/` | Update own profile | Yes |
| POST | `/change-password/` | Change own password | Yes |
| GET/POST | `/users/` | List / Create users | Admin |
| GET/PUT/DELETE | `/users/{id}/` | User detail / update / delete | Admin |
| GET | `/audit-logs/` | System-wide audit trail (filterable by module, action, user) | Yes |
| GET | `/reports/project/` | Project lifecycle report (Budget/RFQ/PO anchor) | Yes |

### Products (`/api/v1/products/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/categories/` | List / Create product categories |
| GET/PUT/DELETE | `/categories/{id}/` | Category CRUD |
| GET/POST | `/products/` | List / Create products (filterable) |
| GET/PUT/DELETE | `/products/{id}/` | Product CRUD |

### RFQ Module (`/api/v1/rfq/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/suppliers/` | List / Create suppliers |
| GET/PUT/DELETE | `/suppliers/{id}/` | Supplier CRUD |
| GET/POST | `/rfqs/` | List / Create RFQs with line items |
| GET/PUT/DELETE | `/rfqs/{id}/` | RFQ CRUD |
| POST | `/rfqs/{id}/submit/` | DRAFT → PENDING |
| POST | `/rfqs/{id}/approve/` | Approve RFQ |
| POST | `/rfqs/{id}/reject/` | Reject RFQ |
| GET | `/rfqs/{id}/compare/` | Canvass comparison matrix |
| GET/POST | `/quotations/` | List / Create quotations (canvass items) |
| GET/PUT/DELETE | `/quotations/{id}/` | Quotation CRUD |
| POST | `/quotations/{id}/accept/` | Accept quotation |
| POST | `/quotations/{id}/reject/` | Reject quotation |

### Costing Module (`/api/v1/costing/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/cost-categories/` | List / Create cost categories (CRUD-configurable) |
| GET/PUT/DELETE | `/cost-categories/{id}/` | Cost category CRUD |
| GET/POST | `/commission-roles/` | List / Create commission roles (CRUD-configurable) |
| GET/PUT/DELETE | `/commission-roles/{id}/` | Commission role CRUD |
| GET/POST | `/sheets/` | List / Create costing sheets |
| GET/PUT/DELETE | `/sheets/{id}/` | Costing sheet CRUD |
| POST | `/sheets/{id}/recalculate/` | Recalculate totals + all 3 margin levels |
| POST | `/sheets/{id}/submit/` | DRAFT → IN_REVIEW |
| POST | `/sheets/{id}/approve/` | IN_REVIEW → APPROVED |
| POST | `/sheets/{id}/save_version/` | Save version snapshot (JSON) |
| GET | `/sheets/{id}/versions/` | Version history list |
| GET/PUT | `/sheets/{id}/margin/{LABEL}/` | Get / Update margin level (LOW, MEDIUM, HIGH) |
| PUT | `/sheets/{id}/margin/{LABEL}/commission-splits/` | Bulk update commission splits |
| GET/POST | `/line-items/` | List / Create line items |
| GET/PUT/DELETE | `/line-items/{id}/` | Line item CRUD |
| GET/POST | `/scenarios/` | List / Create what-if scenarios |
| GET/PUT/DELETE | `/scenarios/{id}/` | Scenario CRUD |
| POST | `/scenarios/{id}/calculate/` | Run scenario projection |

### Sales Module (`/api/v1/sales/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/quotations/` | List / Create formal quotations |
| GET/PUT/DELETE | `/quotations/{id}/` | Formal quotation CRUD |
| POST | `/quotations/{id}/send/` | DRAFT → SENT |
| POST | `/quotations/{id}/accept/` | Accept formal quotation |
| POST | `/quotations/{id}/reject/` | Reject formal quotation |
| GET/POST | `/orders/` | List / Create sales orders |
| GET/PUT/DELETE | `/orders/{id}/` | Sales order CRUD |
| POST | `/orders/{id}/confirm/` | DRAFT → CONFIRMED |
| POST | `/orders/{id}/start/` | → IN_PROGRESS |
| POST | `/orders/{id}/complete/` | → COMPLETED |
| GET/POST | `/contract-analyses/` | List / Create contract analyses |
| GET/PUT/DELETE | `/contract-analyses/{id}/` | Contract analysis CRUD |
| POST | `/contract-analyses/{id}/recalculate/` | Recalculate deductions & VAT |

### Budget Module (`/api/v1/budget/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/budgets/` | List / Create budgets |
| GET/PUT/DELETE | `/budgets/{id}/` | Budget CRUD |
| POST | `/budgets/{id}/submit/` | DRAFT → PENDING |
| POST | `/budgets/{id}/approve/` | PENDING → APPROVED |
| POST | `/budgets/{id}/reject/` | PENDING → REJECTED |
| POST | `/budgets/{id}/close/` | APPROVED → CLOSED |
| POST | `/budgets/{id}/recalculate/` | Recalculate from PO actuals |

### Procurement Module (`/api/v1/procurement/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/purchase-orders/` | List / Create POs |
| GET/PUT/DELETE | `/purchase-orders/{id}/` | PO CRUD |
| POST | `/purchase-orders/{id}/issue/` | DRAFT → ISSUED |
| POST | `/purchase-orders/{id}/complete/` | → COMPLETED (recalculates linked budget) |
| GET/POST | `/actual-costs/` | List / Create actual cost records |
| GET/PUT/DELETE | `/actual-costs/{id}/` | Actual cost CRUD |

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| **Authentication** | Django session-based auth with CSRF protection |
| **Password hashing** | PBKDF2 (Django default, 600K iterations) |
| **RBAC** | 5 roles: Admin, Manager, Procurement, Finance, Viewer |
| **Field encryption** | AES-256 via `cryptography` library (Fernet) |
| **HTTPS/TLS** | Auto-enabled when `DEBUG=False` (HSTS, secure cookies) |
| **CORS** | Restricted to allowed origins via `django-cors-headers` |
| **Permission classes** | `IsAdminRole`, `IsManagerOrAbove`, `CanApprove`, `CanEditFinancial`, `IsOwnerOrAdmin` |
| **File uploads** | Local Django media storage (`MEDIA_ROOT`) |

### Role Permissions Matrix

| Action | Admin | Manager | Procurement | Finance | Viewer |
|--------|-------|---------|-------------|---------|--------|
| Create RFQ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve RFQ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accept quotation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit financial data | ✅ | ✅ | ❌ | ✅ | ❌ |
| Approve costing sheet | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage cost categories | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage commission roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View data | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Module Details

### RFQ & Supplier Canvassing Module
- **Supplier database** with profiles, contacts, ratings, and on-time delivery performance
- **Create RFQs** with project title, client name, item details, brand, model, and product references
- **Supplier quotations (canvass matrix)** — per-line-item granularity with:
  - Offer type (Same Item / Counter Offer) with brand & model
  - VAT handling (VAT Inclusive / VAT Exclusive / VAT Exempt) with configurable rate per item
  - Auto-computed VAT-exclusive price and VAT amount
  - Availability (On Stock / Order Basis), warranty period, price validity
  - Tax type, remarks, reference number, file upload for price proposals
- **Side-by-side canvass comparison** across all suppliers per RFQ
- **Multi-level approval workflow** with full audit trail (ApprovalLog)
- **Status flow:** DRAFT → PENDING → SENT → RECEIVED → UNDER_REVIEW → APPROVED / REJECTED / CLOSED

### Costing Sheet Module (PH-Tax-Aware)
- **CRUD-configurable cost categories** — add/edit/delete categories via Settings (default: COGS, Implementation, Labor, Representation/Meal, Material, Transportation, Others)
- **CRUD-configurable commission roles** — manage roles and default percentages (default: Sales 50%, President 20%, VP 15%, Technical 10%, Admin 5%)
- **Auto-generated sheet numbers** (format: `QUO-YYYYMM-NNNN`)
- **Categorized line items** — each linked to a cost category with optional `has_input_vat` flag
- **Contingency** — configurable percentage applied on top of total cost
- **3 margin levels (LOW / MEDIUM / HIGH)** — each with independently configurable:
  - 7 addon percentages (facilitation, desired margin, JV cost, cost of money, municipal tax, 2× others)
  - 3 government deduction rates (withholding tax, creditable tax, warranty security)
  - Commission percentage with splits across roles
- **25+ auto-computed fields per margin level** — selling price build-up, government deductions, profitability analysis, VAT passthrough, net profit, actual margin %
- **Version control** — save JSON snapshots and browse full version history
- **What-if scenarios** — override costs/quantities to project outcomes vs baseline
- **Status workflow:** DRAFT → IN_REVIEW → APPROVED → ARCHIVED
- **Pie chart visualization** of cost distribution by category
- **Side-by-side margin comparison** table across LOW / MEDIUM / HIGH

### Sales Module
- **Formal Quotations** — client-facing quotes linked to RFQ, costing sheet, and selected margin level
  - Auto-generated numbers (format: `FQ-YYYYMM-NNNN`)
  - Line items with brand, model, quantity, unit price, auto-computed amounts
  - VAT calculation (configurable rate, default 12%)
  - Payment terms, delivery terms, validity, terms & conditions
  - Status flow: DRAFT → SENT → ACCEPTED / REJECTED / REVISED
- **Sales Orders** — awarded projects linked to formal quotations
  - Auto-generated numbers (format: `SO-YYYYMM-NNNN`)
  - Contract amount, VAT rate, awarded date
  - Status flow: DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED / CANCELLED
- **Contract Analysis** — financial breakdown per sales order
  - Contract price decomposition (VAT-exclusive amount, VAT amount)
  - Deductions: warranty security, EWT (5%), LGU (2%), facilitation, COGS, implementation
  - Net cash flow, net cash flow percentage, net benefit
  - VAT passthrough: output VAT, input VAT, VAT payable

### Product Catalog Module
- **Product categories** — create and manage product categories with active/inactive toggle
- **Product CRUD** — name, SKU (auto-generated `PRD-00001`), description, unit, estimated unit cost, specifications, category
- **RFQ & Supplier linking** — optionally link a product to a specific RFQ and supplier for project-based procurement tracking
- **Product picker** — integrated into RFQ item creation for standardized references
- **Search & filter** — filter by category, RFQ, or supplier; search by name/SKU/description/specifications

### Budget Module
- **Create budgets** with title, description, allocated amount, and linked RFQ / costing sheet / sales order
- **Auto-generated numbers** (format: `BUD-YYYYMM-NNNN`)
- **Approval workflow:** DRAFT → PENDING → APPROVED / REJECTED / CLOSED
- **Auto-recalculate** — recalculate spent/remaining amounts from linked PO actual costs
- **Budget tracking** — linked to procurement for actual spend visibility

### Procurement Module
- **Purchase Orders** — linked to supplier, RFQ, quotation, costing sheet, and budget
  - Auto-generated numbers (format: `PO-YYYYMM-NNNN`)
  - Line items with product reference, quantity, unit cost
  - Estimated total vs actual total tracking
- **PO lifecycle:** DRAFT → ISSUED → PARTIALLY_RECEIVED → COMPLETED / CANCELLED
- **Actual cost recording** — per PO with cost type (Material, Labor, Overhead, Logistics, Shipping, Tax, Other)
- **Auto-recalculate** — completing a PO auto-recalculates the linked budget
- **Variance monitoring** — dashboard comparing estimated vs actual costs

### Settings & Administration
- **Profile management** — update first name, last name, email, phone, department
- **Change password** — self-service with current password verification
- **Dark mode** — toggle between light/dark themes (persists via localStorage, defaults to OS preference)
- **Cost Categories CRUD** — inline add/edit/delete with name, description, `has_input_vat` toggle, sort order
- **Commission Roles CRUD** — inline add/edit/delete with name, default %, sort order, active toggle

### Dashboard
- **Summary statistics** with stat cards for RFQs, quotations, costing sheets, and more
- **Quick navigation** to all modules

### Audit Log & Project Reports
- **System-wide audit log** — tracks 14 action types (CREATE, UPDATE, DELETE, SUBMIT, APPROVE, REJECT, STATUS_CHANGE, SEND, ISSUE, COMPLETE, CLOSE, RECALCULATE, SAVE_VERSION, EXPORT) across 8 modules (ACCOUNTS, PRODUCTS, RFQ, COSTING, SALES, BUDGET, PROCUREMENT, SETTINGS)
- **Filterable & exportable** — filter by module, action type, object type, user; export to CSV
- **Expandable detail rows** — view full change details inline
- **Project lifecycle report** — multi-anchor view (Budget / RFQ / PO) with executive summary and CSV export

---

## PH-Tax-Aware Costing Formula

The costing engine implements Philippine-standard tax computations, verified against the QUO costing sheet template:

```
Given:
  TPC = Total Project Cost (sum of line items + contingency)
  sum_pct% = facilitation% + desired_margin% + JV_cost% + cost_of_money%
             + municipal_tax% + others_1% + others_2%

Selling Price Build-Up:
  Gross Selling (VAT Ex) = TPC / (1 − sum_pct% / 100)
  Each addon amount      = Gross Selling × addon% / 100
  VAT Amount             = Gross Selling × VAT Rate / 100
  Net Selling (VAT Inc)  = Gross Selling + VAT Amount

Government Deductions:
  Withholding Tax        = Gross Selling × withholding% / 100
  Creditable Tax         = Gross Selling × creditable% / 100
  Warranty Security      = Net Selling   × warranty_security% / 100
  Net Amount Due         = Net Selling − Total Government Deductions

Profitability:
  Municipal Tax Revenue  = Net Selling × municipal_tax% / 100
  Net Take Home          = Net Amount Due − Facilitation − Municipal Tax Revenue
  Earning Before VAT     = Net Take Home − TPC

VAT Passthrough:
  Output VAT             = VAT Amount
  Input VAT              = Input VAT Base × VAT Rate / (1 + VAT Rate)
  VAT Payable            = Output VAT − Input VAT − Creditable Tax
  Earning After VAT      = Earning Before VAT − VAT Payable

Commission & Net Profit:
  Commission             = Earning Before VAT × commission% / 100
  Net Profit             = Earning After VAT − Commission − JV Cost Amount
  Actual Margin %        = Net Profit / Net Selling × 100
```

> **Note:** Input VAT Base = sum of line items whose cost category has `has_input_vat = true` (typically COGS).

---

## Seeded Configuration Data

### Cost Categories (7 defaults)

| # | Category | Has Input VAT |
|---|----------|---------------|
| 1 | Cost of Goods Sold | ✅ |
| 2 | Implementation Cost | ❌ |
| 3 | Labor Cost | ❌ |
| 4 | Representation / Meal | ❌ |
| 5 | Material Cost | ❌ |
| 6 | Transportation Cost | ❌ |
| 7 | Others / Miscellaneous | ❌ |

### Commission Roles (5 defaults, sum = 100%)

| # | Role | Default % |
|---|------|-----------|
| 1 | Sales | 50% |
| 2 | President | 20% |
| 3 | Vice President | 15% |
| 4 | Technical | 10% |
| 5 | Admin | 5% |

### Default Margin Levels (auto-created per sheet)

| Level | Default Desired Margin |
|-------|----------------------|
| LOW | 20% |
| MEDIUM | 40% |
| HIGH | 50% |

All categories, roles, and margin parameters are **fully editable** via the Settings page or API.

---

## Complete Workflow

The system supports the complete Sales & Purchasing business workflow:

```
 1. Setup Configuration    → Configure cost categories, commission roles, products
            ↓
 2. Create Suppliers       → Add vendor profiles with contacts & performance ratings
            ↓
 3. Create RFQ             → Define items needed (product, brand, model, qty, specs)
            ↓
 4. Submit & Approve RFQ   → Multi-level approval with audit trail
            ↓
 5. Collect Quotations     → Enter supplier canvass data per item:
                              offer type, VAT handling, availability,
                              warranty, price proposals (file upload)
            ↓
 6. Compare & Accept       → Side-by-side canvass matrix → accept best quote
            ↓
 7. Create Costing Sheet   → Categorized line items (from canvass or manual),
                              contingency %, 3 margin levels auto-generated
            ↓
 8. Tune Margin Levels     → Adjust facilitation, desired margin, JV cost,
                              cost of money, municipal tax, commission %,
                              govt deduction rates per level (LOW/MED/HIGH)
            ↓
 9. Review & Approve       → Submit for review → Manager/Admin approves
            ↓
10. Save Version           → Snapshot costing sheet state for audit trail
            ↓
11. Create Formal Quote    → Client-facing quotation linked to selected margin level
            ↓
12. Send & Negotiate       → DRAFT → SENT → ACCEPTED/REJECTED/REVISED
            ↓
13. Create Sales Order     → Awarded project with contract amount
            ↓
14. Contract Analysis      → Financial breakdown: deductions, net cash flow,
                              VAT passthrough, net benefit
            ↓
15. Create Budget          → Allocated amount linked to sales order
            ↓
16. Approve Budget         → Manager/Admin reviews and approves
            ↓
17. Create Purchase Order  → Link to budget, supplier, add line items
            ↓
18. Issue PO               → Send to supplier
            ↓
19. Record Actual Costs    → Track real costs as invoices arrive
            ↓
20. Complete PO            → Auto-recalculate budget spent/remaining
            ↓
21. Monitor Variance       → Dashboard comparing estimated vs actual costs
```

---

## License

Internal use only.
