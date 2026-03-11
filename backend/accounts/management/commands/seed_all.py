# ============================================================================
# accounts/management/commands/seed_all.py
# Comprehensive seed: users, categories, RFQs, costing, clients,
# formal quotations, sales orders, budgets, suppliers, canvass data
# ============================================================================
import datetime
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

D = Decimal


class Command(BaseCommand):
    help = "Seed all modules with realistic demo data (idempotent — skips existing)"

    # ------------------------------------------------------------------ #
    # helpers
    # ------------------------------------------------------------------ #
    def _get_or_create_user(self, username, password, role, **kw):
        if User.objects.filter(username=username).exists():
            self.stdout.write(f"  User '{username}' already exists — skipping")
            return User.objects.get(username=username)
        u = User.objects.create_user(username=username, password=password, role=role, **kw)
        self.stdout.write(self.style.SUCCESS(f"  Created user '{username}' (role={role})"))
        return u

    # ------------------------------------------------------------------ #
    # Main handler
    # ------------------------------------------------------------------ #
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Seeding Demo Data ===\n"))

        # ---------- 1. USERS ----------
        self.stdout.write(self.style.MIGRATE_LABEL("1) Users"))
        admin = self._get_or_create_user(
            "admin", "admin", "MANAGEMENT",
            first_name="Admin", last_name="Manager",
            email="admin@maptech.ph", is_staff=True, is_superuser=True,
            department="Management",
        )
        sales = self._get_or_create_user(
            "sales", "sales", "SALES",
            first_name="Sales", last_name="Agent",
            email="sales@maptech.ph", department="Sales",
        )
        purchasing = self._get_or_create_user(
            "purchasing", "purchasing", "PURCHASING",
            first_name="Purchasing", last_name="Officer",
            email="purchasing@maptech.ph", department="Procurement",
        )
        owner = admin  # default owner for seeded records

        # ---------- 2. COSTING CATEGORIES & COMMISSION ROLES ----------
        self.stdout.write(self.style.MIGRATE_LABEL("2) Cost Categories & Commission Roles"))
        from costing.models import CostCategory, CommissionRole

        categories_data = [
            ("Hardware / Equipment", True, True, 1),
            ("Cables & Accessories", False, True, 2),
            ("Installation & Labor", False, False, 3),
            ("Software & Licensing", False, True, 4),
            ("Professional Services", False, False, 5),
            ("Freight & Logistics", False, False, 6),
        ]
        cats = []
        for name, is_default, has_input_vat, sort in categories_data:
            obj, created = CostCategory.objects.get_or_create(
                name=name,
                defaults={"is_default": is_default, "has_input_vat": has_input_vat, "sort_order": sort},
            )
            cats.append(obj)
            if created:
                self.stdout.write(f"  Created category: {name}")

        roles_data = [
            ("Sales Executive", D("40.00"), 1),
            ("Project Manager", D("25.00"), 2),
            ("Account Manager", D("20.00"), 3),
            ("Technical Lead", D("15.00"), 4),
        ]
        for name, pct, sort in roles_data:
            _, created = CommissionRole.objects.get_or_create(
                name=name,
                defaults={"default_percent": pct, "sort_order": sort},
            )
            if created:
                self.stdout.write(f"  Created commission role: {name}")
        active_roles = list(CommissionRole.objects.filter(is_active=True))

        # ---------- 3. SUPPLIERS ----------
        self.stdout.write(self.style.MIGRATE_LABEL("3) Suppliers"))
        from rfq.models import Supplier

        suppliers_data = [
            ("TechSource Philippines", "Juan Dela Cruz", "juan@techsource.ph", "+63 917 123 4567"),
            ("GlobeTech Solutions", "Maria Santos", "maria@globetech.com", "+63 918 234 5678"),
            ("Pacific IT Supplies", "Pedro Reyes", "pedro@pacificit.ph", "+63 919 345 6789"),
            ("Manila Hardware Corp", "Ana Garcia", "ana@manilahw.com", "+63 920 456 7890"),
            ("Green Valley Trading", "Carlos Mendoza", "carlos@greenvalley.ph", "+63 921 567 8901"),
            ("Metro Systems Inc", "Sofia Lim", "sofia@metrosys.com", "+63 922 678 9012"),
            ("Island Electronics", "Roberto Tan", "roberto@islandelec.ph", "+63 923 789 0123"),
            ("Prime Office Supplies", "Diana Cruz", "diana@primeoffice.com", "+63 924 890 1234"),
            ("Visayas Tech Hub", "Miguel Flores", "miguel@visayastech.ph", "+63 925 901 2345"),
            ("SouthStar Equipment", "Linda Ramos", "linda@southstar.com", "+63 926 012 3456"),
        ]
        suppliers = []
        for name, contact, email, phone in suppliers_data:
            sup, created = Supplier.objects.get_or_create(
                name=name,
                defaults={
                    "contact_person": contact, "email": email, "phone": phone,
                    "rating": D(str(round(random.uniform(3.5, 5.0), 2))),
                    "on_time_delivery_rate": D(str(round(random.uniform(85.0, 99.0), 2))),
                },
            )
            suppliers.append(sup)
            if created:
                self.stdout.write(f"  Created supplier: {name}")

        # ---------- 4. RFQs ----------
        self.stdout.write(self.style.MIGRATE_LABEL("4) RFQs"))
        from rfq.models import RFQ, RFQItem, Quotation, QuotationItem

        rfq_data = [
            ("Office Furniture Procurement", "APPROVED", "HIGH"),
            ("IT Equipment Upgrade", "PENDING_FOR_CANVASS", "URGENT"),
            ("Building Materials Supply", "DRAFT", "MEDIUM"),
            ("Electrical Components Order", "APPROVED", "HIGH"),
            ("Plumbing Fixtures Procurement", "UNDER_REVIEW", "LOW"),
            ("Safety Equipment Purchase", "APPROVED", "MEDIUM"),
            ("Cleaning Supplies Order", "DRAFT", "LOW"),
            ("Network Infrastructure Upgrade", "CANVASS_DONE", "URGENT"),
            ("HVAC System Components", "APPROVED", "HIGH"),
            ("Laboratory Equipment Procurement", "PENDING_FOR_CANVASS", "MEDIUM"),
        ]
        items_pool = [
            ("Desktop Computer", "HP", "Pro 400 G9", 5, "units"),
            ("Office Chair", "Steelcase", "Leap V2", 10, "pcs"),
            ("LED Monitor", "Dell", "U2723QE", 5, "units"),
            ("Ethernet Cable Cat6", "Panduit", "UTP28SP", 100, "meters"),
            ("Whiteboard", "Quartet", "Q4836", 3, "pcs"),
            ("Network Switch 24-Port", "Cisco", "C9200L-24T", 5, "units"),
            ("Wireless Access Point", "Ubiquiti", "U6-Pro", 10, "pcs"),
            ("Server Rack 42U", "APC", "AR3100", 2, "units"),
        ]
        rfqs = []
        for i, (title, status, priority) in enumerate(rfq_data, 1):
            num = f"RFQ-SEED-{i:04d}"
            if RFQ.objects.filter(rfq_number=num).exists():
                rfqs.append(RFQ.objects.get(rfq_number=num))
                continue
            rfq = RFQ.objects.create(
                rfq_number=num, title=title,
                description=f"Seeded RFQ for testing: {title}",
                project_title=f"Project {title.split()[0]}",
                client_name=f"Client {chr(64 + i)}",
                status=status, priority=priority,
                issue_date=datetime.date.today() - datetime.timedelta(days=random.randint(5, 30)),
                deadline=datetime.date.today() + datetime.timedelta(days=random.randint(14, 60)),
                created_by=owner,
            )
            selected = random.sample(items_pool, k=random.randint(3, len(items_pool)))
            for j, (nm, br, md, qty, un) in enumerate(selected, 1):
                RFQItem.objects.create(
                    rfq=rfq, item_number=j, item_name=nm,
                    brand=br, model_number=md, quantity=qty, unit=un,
                )
            rfqs.append(rfq)
            self.stdout.write(f"  Created {num}: {title}")

        # Add canvass (supplier quotations) for RFQs in PENDING_FOR_CANVASS / CANVASS_DONE
        canvass_rfqs = RFQ.objects.filter(
            rfq_number__startswith="RFQ-SEED-",
            status__in=["PENDING_FOR_CANVASS", "CANVASS_DONE"],
        )
        payment_terms = ["Net 30", "Net 60", "COD", "50% DP, 50% on delivery"]
        for rfq in canvass_rfqs:
            if rfq.quotations.exists():
                continue
            rfq_items = list(rfq.items.all())
            for sup in random.sample(suppliers, k=min(5, len(suppliers))):
                q = Quotation.objects.create(
                    rfq=rfq, supplier=sup,
                    quotation_number=f"Q-{sup.name[:3].upper()}-{rfq.id:04d}",
                    status="PENDING",
                    delivery_days=random.randint(7, 45),
                    payment_terms=random.choice(payment_terms),
                    validity_days=random.choice([15, 30, 45, 60]),
                    notes=f"Quotation from {sup.name}",
                )
                for ri in rfq_items:
                    unit_price = round(random.uniform(500, 50000) * random.uniform(0.8, 1.3), 2)
                    QuotationItem.objects.create(
                        quotation=q, rfq_item=ri,
                        offer_type=random.choice(["SAME", "COUNTER"]),
                        brand=ri.brand, model_number=ri.model_number,
                        description=f"Supplier offer for {ri.item_name}",
                        quantity=ri.quantity, unit=ri.unit,
                        unit_price=D(str(unit_price)),
                        vat_type=random.choice(["VAT_INC", "VAT_EX"]),
                        vat_rate=D("12.00"),
                        availability=random.choice(["ON_STOCK", "ORDER_BASIS"]),
                        availability_detail=random.choice(["Immediate", "7-14 Days", "2-3 Weeks"]),
                        warranty_period=random.choice(["6MOS", "1YR", "3YRS"]),
                        warranty_detail=random.choice(["Parts & Labor", "Parts Only", "Full Coverage"]),
                        price_validity="30 days",
                        delivery_days=random.randint(5, 30),
                    )
                q.recalculate_total()
            self.stdout.write(f"  Added canvass entries for {rfq.rfq_number}")

        # ---------- 5. COSTING SHEETS ----------
        self.stdout.write(self.style.MIGRATE_LABEL("5) Costing Sheets"))
        from costing.models import CostingSheet, CostingMarginLevel, CostingLineItem, CostingCommissionSplit

        costing_data = [
            ("Main Office Renovation", "Accenture Philippines", D("5.00"), D("12.00")),
            ("Server Room Build-Out", "Globe Telecom", D("3.00"), D("12.00")),
            ("Warehouse Expansion", "San Miguel Corporation", D("5.00"), D("12.00")),
            ("Client Portal Development", "BDO Unibank", D("2.00"), D("12.00")),
            ("Security System Installation", "Ayala Land Inc.", D("4.00"), D("12.00")),
            ("Parking Lot Resurfacing", "SM Prime Holdings", D("6.00"), D("12.00")),
            ("Employee Lounge Remodel", "Jollibee Foods Corporation", D("3.00"), D("12.00")),
            ("Data Center Cooling Upgrade", "Meralco", D("5.00"), D("12.00")),
            ("Conference Room AV Setup", "PLDT Inc.", D("4.00"), D("12.00")),
            ("Emergency Generator Install", "Robinsons Retail Holdings", D("5.00"), D("12.00")),
        ]
        line_items_pool = [
            ("Cisco Catalyst 9300 Switches", D("450000.00")),
            ("CAT6A Cabling & Patch Panels", D("185000.00")),
            ("Server Rack & Power Distribution", D("120000.00")),
            ("Fiber Optic Backbone Installation", D("275000.00")),
            ("Network Configuration & Testing", D("95000.00")),
            ("LED Panel Lighting System", D("68000.00")),
            ("HVAC Split-Type Unit (5HP)", D("145000.00")),
            ("Access Control System", D("230000.00")),
            ("CCTV IP Camera Package", D("178000.00")),
            ("Fire Alarm & Detection System", D("92000.00")),
            ("UPS 10kVA Online", D("165000.00")),
            ("Structured Cabling (Cat6A)", D("88000.00")),
        ]
        margin_presets = [
            ("VERY_LOW", D("10.00")),
            ("LOW", D("20.00")),
            ("MEDIUM_LOW", D("30.00")),
            ("MEDIUM_HIGH", D("40.00")),
            ("HIGH", D("50.00")),
            ("VERY_HIGH", D("60.00")),
        ]
        costings = []
        for i, (title, client, contingency, vat) in enumerate(costing_data, 1):
            num = f"CS-SEED-{i:04d}"
            if CostingSheet.objects.filter(sheet_number=num).exists():
                costings.append(CostingSheet.objects.get(sheet_number=num))
                continue
            rfq_link = rfqs[i - 1] if i <= len(rfqs) else None
            cs = CostingSheet.objects.create(
                sheet_number=num, title=title,
                project_title=f"Project {title.split()[0]}",
                client_name=client,
                contingency_percent=contingency, vat_rate=vat,
                commission_rate=D("10.00"),
                rfq=rfq_link,
                created_by=owner,
            )
            # Line items: pick 4-7 random items
            selected_items = random.sample(line_items_pool, k=random.randint(4, min(7, len(line_items_pool))))
            for desc, amt in selected_items:
                cat = random.choice(cats)
                CostingLineItem.objects.create(
                    costing_sheet=cs, category=cat, description=desc, amount=amt,
                )
            # Margin levels
            for label, dm in margin_presets:
                ml = CostingMarginLevel.objects.create(
                    costing_sheet=cs, label=label, desired_margin_percent=dm,
                    commission_percent=D("10.00"),
                )
                for role in active_roles:
                    CostingCommissionSplit.objects.create(
                        margin_level=ml, role=role, percent=role.default_percent,
                    )
            cs.recalculate()
            costings.append(cs)
            self.stdout.write(f"  Created {num}: {title} (cost={cs.total_project_cost})")

        # CS-SEED-0011 with CUSTOM margin
        num = "CS-SEED-0011"
        if not CostingSheet.objects.filter(sheet_number=num).exists():
            cs11 = CostingSheet.objects.create(
                sheet_number=num, title="Network Infrastructure with Custom Margin",
                project_title="Enterprise Network Deployment",
                client_name="Global Tech Solutions",
                contingency_percent=D("5.00"), vat_rate=D("12.00"),
                commission_rate=D("8.00"), created_by=owner,
            )
            for desc, amt in [
                ("Cisco Catalyst 9300 Core Switches", D("450000.00")),
                ("CAT6A Cabling & Patch Panels", D("185000.00")),
                ("Network Rack & Power Distribution", D("120000.00")),
                ("Fiber Optic Backbone Installation", D("275000.00")),
                ("Network Configuration & Testing", D("95000.00")),
                ("Firewall & Security Appliances", D("320000.00")),
            ]:
                CostingLineItem.objects.create(
                    costing_sheet=cs11, category=cats[0], description=desc, amount=amt,
                )
            levels_11 = margin_presets + [("CUSTOM", D("25.00"))]
            for label, dm in levels_11:
                ml = CostingMarginLevel.objects.create(
                    costing_sheet=cs11, label=label, desired_margin_percent=dm,
                    commission_percent=D("8.00"),
                )
                for role in active_roles:
                    CostingCommissionSplit.objects.create(
                        margin_level=ml, role=role, percent=role.default_percent,
                    )
            cs11.recalculate()
            costings.append(cs11)
            self.stdout.write(f"  Created {num}: Network Infrastructure with Custom Margin")
        else:
            costings.append(CostingSheet.objects.get(sheet_number=num))

        # ---------- 6. CLIENTS ----------
        self.stdout.write(self.style.MIGRATE_LABEL("6) Clients"))
        from sales.models import Client

        clients_data = [
            ("Accenture Philippines", "IT Director", "+63 2 8888 1001", "it@accenture.ph", "Makati City"),
            ("SM Prime Holdings", "VP Operations", "+63 2 8888 1002", "ops@smprime.com", "Pasay City"),
            ("Jollibee Foods Corporation", "Facilities Mgr", "+63 2 8888 1003", "facilities@jfc.com", "Pasig City"),
            ("Ayala Land Inc.", "Project Director", "+63 2 8888 1004", "projects@ayalaland.com", "Makati City"),
            ("San Miguel Corporation", "Procurement Head", "+63 2 8888 1005", "procurement@sanmiguel.com", "Mandaluyong"),
            ("Globe Telecom", "Infra Manager", "+63 2 8888 1006", "infra@globe.com.ph", "Taguig City"),
            ("BDO Unibank", "CTO Office", "+63 2 8888 1007", "cto@bdo.com.ph", "Makati City"),
            ("PLDT Inc.", "Network Ops Dir", "+63 2 8888 1008", "network@pldt.com.ph", "Makati City"),
            ("Meralco", "Engineering Dept", "+63 2 8888 1009", "engineering@meralco.com", "Pasig City"),
            ("Robinsons Retail Holdings", "Store Dev Mgr", "+63 2 8888 1010", "storedev@robinsons.com", "Pasig City"),
            ("Global Tech Solutions", "Managing Director", "+63 2 8888 1011", "md@globaltech.ph", "Taguig City"),
        ]
        clients = {}
        for name, desig, phone, email, addr in clients_data:
            obj, created = Client.objects.get_or_create(
                name=name,
                defaults={"designation": desig, "contact_number": phone, "email": email, "address": addr},
            )
            clients[name] = obj
            if created:
                self.stdout.write(f"  Created client: {name}")

        # ---------- 7. FORMAL QUOTATIONS ----------
        self.stdout.write(self.style.MIGRATE_LABEL("7) Formal Quotations"))
        from sales.models import FormalQuotation, FormalQuotationItem

        fq_data = [
            ("FQ-SEED-0001", "Main Office Renovation", "Accenture Philippines", "DRAFT", 0),
            ("FQ-SEED-0002", "Server Room Build-Out", "Globe Telecom", "SENT", 1),
            ("FQ-SEED-0003", "Warehouse Expansion", "San Miguel Corporation", "WON", 2),
            ("FQ-SEED-0004", "Client Portal Development", "BDO Unibank", "DRAFT", 3),
            ("FQ-SEED-0005", "Security System Installation", "Ayala Land Inc.", "SENT", 4),
            ("FQ-SEED-0006", "Parking Lot Resurfacing", "SM Prime Holdings", "DRAFT", 5),
            ("FQ-SEED-0007", "Employee Lounge Remodel", "Jollibee Foods Corporation", "WON", 6),
            ("FQ-SEED-0008", "Data Center Cooling Upgrade", "Meralco", "SENT", 7),
            ("FQ-SEED-0009", "Conference Room AV Setup", "PLDT Inc.", "DRAFT", 8),
            ("FQ-SEED-0010", "Branch Office Renovation", "Robinsons Retail Holdings", "WON", 9),
        ]
        fqs = {}
        for fq_num, proj, client_name, status, cs_idx in fq_data:
            if FormalQuotation.objects.filter(quotation_number=fq_num).exists():
                fqs[fq_num] = FormalQuotation.objects.get(quotation_number=fq_num)
                continue
            cs = costings[cs_idx] if cs_idx < len(costings) else None
            cl = clients.get(client_name)
            margin_level = None
            if cs:
                margin_level = cs.margin_levels.filter(label="MEDIUM_HIGH").first()

            fq = FormalQuotation.objects.create(
                quotation_number=fq_num,
                project_title=proj,
                client=cl,
                client_name=client_name,
                client_designation=cl.designation if cl else "",
                client_contact_number=cl.contact_number if cl else "",
                client_address=cl.address if cl else "",
                client_email=cl.email if cl else "",
                costing_sheet=cs,
                margin_level=margin_level,
                status=status,
                payment_terms="50% downpayment, 50% upon completion",
                delivery_terms="Within 30 working days upon receipt of PO",
                validity_days=30,
                created_by=owner,
            )
            # Add line items from costing sheet costs
            if cs:
                for j, li in enumerate(cs.line_items.all(), 1):
                    FormalQuotationItem.objects.create(
                        quotation=fq, item_number=j,
                        description=li.description,
                        quantity=D("1"), unit="lot",
                        unit_price=li.amount, amount=li.amount,
                    )
                fq.recalculate()
            fqs[fq_num] = fq
            self.stdout.write(f"  Created {fq_num}: {proj} ({status})")

        # ---------- 8. SALES ORDERS ----------
        self.stdout.write(self.style.MIGRATE_LABEL("8) Sales Orders"))
        from sales.models import SalesOrder

        so_data = [
            ("SO-SEED-0001", "Branch Office Renovation", "Robinsons Retail Holdings", "FQ-SEED-0010", "CONFIRMED",
             D("919245.28"), datetime.date(2026, 1, 15), datetime.date(2026, 1, 12), 0),
            ("SO-SEED-0002", "Warehouse Expansion", "San Miguel Corporation", "FQ-SEED-0003", "IN_PROGRESS",
             D("392000.00"), datetime.date(2026, 1, 22), datetime.date(2026, 1, 20), 2),
            ("SO-SEED-0003", "Employee Lounge Remodel", "Jollibee Foods Corporation", "FQ-SEED-0007", "CONFIRMED",
             D("726943.38"), datetime.date(2026, 2, 5), datetime.date(2026, 2, 3), 6),
            ("SO-SEED-0004", "Smart Building Automation", "Ayala Land Inc.", None, "DRAFT",
             D("1250000.00"), datetime.date(2026, 2, 14), None, 4),
            ("SO-SEED-0005", "Fiber Network Backbone Upgrade", "PLDT Inc.", None, "IN_PROGRESS",
             D("2180000.00"), datetime.date(2026, 2, 20), datetime.date(2026, 2, 18), 8),
            ("SO-SEED-0006", "Substation Control Room Modernization", "Meralco", None, "COMPLETED",
             D("875000.00"), datetime.date(2026, 2, 28), datetime.date(2026, 2, 25), 7),
            ("SO-SEED-0007", "ATM Kiosk Deployment", "BDO Unibank", None, "DRAFT",
             D("560000.00"), datetime.date(2026, 3, 1), None, 3),
            ("SO-SEED-0008", "Server Room Build-Out Phase 2", "Globe Telecom", None, "CONFIRMED",
             D("445000.00"), datetime.date(2026, 3, 5), datetime.date(2026, 3, 3), 1),
            ("SO-SEED-0009", "Mall CCTV System Overhaul", "SM Prime Holdings", None, "IN_PROGRESS",
             D("1680000.00"), datetime.date(2026, 3, 8), datetime.date(2026, 3, 6), 5),
            ("SO-SEED-0010", "Office IT Infrastructure Refresh", "Accenture Philippines", None, "CANCELLED",
             D("985000.00"), datetime.date(2026, 3, 10), datetime.date(2026, 3, 9), 0),
        ]
        sales_orders = {}
        for so_num, proj, client, fq_num, status, amount, date, awarded, cs_idx in so_data:
            if SalesOrder.objects.filter(so_number=so_num).exists():
                sales_orders[so_num] = SalesOrder.objects.get(so_number=so_num)
                continue
            fq_link = fqs.get(fq_num) if fq_num else None
            cs_link = costings[cs_idx] if cs_idx < len(costings) else None
            rfq_link = rfqs[cs_idx] if cs_idx < len(rfqs) else None
            so = SalesOrder.objects.create(
                so_number=so_num, date=date,
                client_name=client, project_title=proj,
                description=f"Sales order for {proj}",
                formal_quotation=fq_link, costing_sheet=cs_link, rfq=rfq_link,
                contract_amount=amount, vat_rate=D("12.00"),
                status=status, awarded_date=awarded,
                created_by=owner,
            )
            sales_orders[so_num] = so
            self.stdout.write(f"  Created {so_num}: {proj} ({status})")

        # ---------- 9. BUDGETS ----------
        self.stdout.write(self.style.MIGRATE_LABEL("9) Budgets"))
        from budget.models import Budget

        budget_data = [
            ("BUD-SEED-0001", "Branch Office Renovation Budget", D("1000000.00"), "APPROVED", "SO-SEED-0001", 0, 0),
            ("BUD-SEED-0002", "Warehouse Expansion Budget", D("450000.00"), "APPROVED", "SO-SEED-0002", 2, 2),
            ("BUD-SEED-0003", "IT Infrastructure Budget", D("2500000.00"), "PENDING", None, 1, 1),
            ("BUD-SEED-0004", "CCTV Overhaul Budget", D("1800000.00"), "DRAFT", "SO-SEED-0009", 5, 5),
            ("BUD-SEED-0005", "Building Automation Budget", D("1400000.00"), "APPROVED", "SO-SEED-0004", 4, 4),
        ]
        for bud_num, title, amount, status, so_num, rfq_idx, cs_idx in budget_data:
            if Budget.objects.filter(budget_number=bud_num).exists():
                continue
            so_link = sales_orders.get(so_num) if so_num else None
            rfq_link = rfqs[rfq_idx] if rfq_idx < len(rfqs) else None
            cs_link = costings[cs_idx] if cs_idx < len(costings) else None
            Budget.objects.create(
                budget_number=bud_num, title=title,
                description=f"Budget allocation for {title}",
                allocated_amount=amount, remaining_amount=amount,
                status=status,
                rfq=rfq_link, costing_sheet=cs_link, sales_order=so_link,
                created_by=owner,
            )
            self.stdout.write(f"  Created {bud_num}: {title} ({status})")

        # ---------- SUMMARY ----------
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Seed Complete ==="))
        self.stdout.write(f"  Users:              {User.objects.count()}")
        self.stdout.write(f"  Cost Categories:    {CostCategory.objects.count()}")
        self.stdout.write(f"  Commission Roles:   {CommissionRole.objects.count()}")
        self.stdout.write(f"  Suppliers:          {Supplier.objects.count()}")
        self.stdout.write(f"  RFQs:               {RFQ.objects.count()}")
        self.stdout.write(f"  Costing Sheets:     {CostingSheet.objects.count()}")
        self.stdout.write(f"  Clients:            {Client.objects.count()}")
        self.stdout.write(f"  Formal Quotations:  {FormalQuotation.objects.count()}")
        self.stdout.write(f"  Sales Orders:       {SalesOrder.objects.count()}")
        self.stdout.write(f"  Budgets:            {Budget.objects.count()}")
        self.stdout.write(self.style.SUCCESS("\n  Login credentials:"))
        self.stdout.write(self.style.SUCCESS("    admin / admin       (MANAGEMENT)"))
        self.stdout.write(self.style.SUCCESS("    sales / sales       (SALES)"))
        self.stdout.write(self.style.SUCCESS("    purchasing / purchasing (PURCHASING)"))
