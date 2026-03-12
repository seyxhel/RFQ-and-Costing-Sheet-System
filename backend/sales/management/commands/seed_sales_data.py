import datetime
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from rfq.models import RFQ, RFQItem
from sales.models import Client, FormalQuotation, FormalQuotationItem, SalesOrder

User = get_user_model()

CLIENTS = [
    ("Ayala Land Inc.", "Makati City", "info@ayalaland.com.ph"),
    ("SM Prime Holdings", "Pasay City", "procurement@smprime.com"),
    ("DMCI Holdings", "Makati City", "bids@dmciholdings.com"),
    ("Megaworld Corp.", "Taguig City", "sourcing@megaworld.com.ph"),
    ("Robinsons Land Corp.", "Pasig City", "purchasing@robinsonsland.com"),
    ("Filinvest Land Inc.", "Alabang", "rfq@filinvest.com"),
    ("Century Properties", "Makati City", "vendor@century.com.ph"),
    ("Federal Land Inc.", "Makati City", "procurement@federalland.com"),
    ("Rockwell Land Corp.", "Makati City", "bids@rockwell.com.ph"),
    ("Vista Land & Lifescapes", "Las Piñas", "supply@vistaland.com.ph"),
]

PROJECT_NAMES = [
    "CCTV System Installation — Tower A",
    "Fire Alarm Upgrade — Main Building",
    "Access Control System — Phase 2",
    "Structured Cabling — 5 Floors",
    "PA System — Mall Expansion Wing",
    "UPS & Power Conditioning — Data Center",
    "Elevator Modernization — Bldg 3",
    "HVAC Controls Upgrade — Podium Level",
    "LED Lighting Retrofit — Parking Levels",
    "Solar Panel Array — Rooftop",
    "Generator Set Supply — Backup Power",
    "Water Treatment System — Amenity Area",
    "BMS Integration — Smart Building",
    "Fiber Optic Backbone — Campus LAN",
    "Kitchen Equipment Supply — Commercial Units",
]

RFQ_TITLES = [
    "CCTV Camera Procurement",
    "Fire Detection Equipment",
    "Access Control Hardware",
    "Network Switches & Cables",
    "Public Address Components",
    "UPS Units Procurement",
    "Elevator Parts Supply",
    "HVAC Sensors & Controllers",
    "LED Panel Lights Order",
    "Solar Inverters Procurement",
    "Diesel Generator Set",
    "Filtration System Parts",
    "BMS Controllers & Sensors",
    "Fiber Optic Transceivers",
    "Commercial Kitchen Appliances",
    "Emergency Lighting Supply",
    "Cable Tray & Conduit",
    "Switchgear Procurement",
    "Transformer Supply",
    "Fire Suppression Equipment",
]

ITEMS = [
    ("IP Camera 4MP", "Hikvision", "DS-2CD2143G2", 45000),
    ("Network Video Recorder", "Dahua", "NVR5432-16P", 85000),
    ("Access Control Panel", "ZKTeco", "InBio460", 32000),
    ("Managed Switch 24-Port", "Cisco", "SG350-28P", 28000),
    ("UPS 10kVA", "APC", "SRT10KXLI", 195000),
    ("Smoke Detector", "Notifier", "FSP-851", 3500),
    ("PA Amplifier 240W", "TOA", "A-2240", 18500),
    ("LED Panel 40W", "Philips", "RC065B", 2800),
    ("Solar Panel 450W", "JinkoSolar", "JKM450M", 12000),
    ("Fire Alarm Control Panel", "Notifier", "NFS2-3030", 145000),
    ("BMS Controller", "Honeywell", "Spyder", 65000),
    ("Fiber Patch Cord", "Panduit", "F92ERLNLNSNM002", 850),
]


class Command(BaseCommand):
    help = "Seed won deals, rejected quotations, recent RFQs, and clients for dashboard testing"

    def handle(self, *args, **options):
        sales_user = User.objects.filter(role="SALES").first()
        owner = sales_user or User.objects.first()
        if not owner:
            self.stderr.write("No users found. Run create_default_admin first.")
            return

        # ── Clients ──
        created_clients = 0
        clients = []
        for name, addr, email in CLIENTS:
            client, created = Client.objects.get_or_create(
                name=name,
                defaults={"address": addr, "email": email},
            )
            clients.append(client)
            if created:
                created_clients += 1

        # ── Recent RFQs (20) ──
        rfq_count = RFQ.objects.count()
        created_rfqs = 0
        seeded_rfqs = []
        statuses = ["DRAFT", "PENDING_FOR_CANVASS", "APPROVED", "UNDER_REVIEW", "SENT", "RECEIVED"]
        priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]

        for i, title in enumerate(RFQ_TITLES):
            num = f"RFQ-{rfq_count + i + 1:04d}"
            days_ago = random.randint(0, 45)
            rfq = RFQ.objects.create(
                rfq_number=num,
                title=title,
                description=f"Procurement request: {title}",
                project_title=random.choice(PROJECT_NAMES),
                client_name=random.choice(clients).name,
                status=random.choice(statuses),
                priority=random.choice(priorities),
                issue_date=datetime.date.today() - datetime.timedelta(days=days_ago),
                deadline=datetime.date.today() + datetime.timedelta(days=random.randint(7, 60)),
                created_by=owner,
            )
            for j, (name, brand, model, _) in enumerate(
                random.sample(ITEMS, k=random.randint(2, 5)), start=1
            ):
                RFQItem.objects.create(
                    rfq=rfq, item_number=j, item_name=name,
                    brand=brand, model_number=model,
                    quantity=random.randint(1, 20), unit="pcs",
                )
            seeded_rfqs.append(rfq)
            created_rfqs += 1

        # ── Formal Quotations — Won (15) ──
        fq_count = FormalQuotation.objects.count()
        created_won = 0
        won_fqs = []
        for i in range(15):
            client = clients[i % len(clients)]
            proj = PROJECT_NAMES[i % len(PROJECT_NAMES)]
            subtotal = Decimal(str(random.randint(150000, 2500000)))
            vat = (subtotal * Decimal("0.12")).quantize(Decimal("0.01"))
            total = subtotal + vat
            days_ago = random.randint(1, 30)

            fq = FormalQuotation.objects.create(
                quotation_number=f"FQ-{fq_count + i + 1:04d}",
                date=datetime.date.today() - datetime.timedelta(days=days_ago + 10),
                client=client,
                client_name=client.name,
                project_title=proj,
                subtotal=subtotal,
                vat_amount=vat,
                total_amount=total,
                status="WON",
                created_by=owner,
            )
            # Add 2-4 line items
            for j, (name, brand, model, price) in enumerate(
                random.sample(ITEMS, k=random.randint(2, 4)), start=1
            ):
                qty = random.randint(2, 15)
                up = Decimal(str(price)) * Decimal(str(random.uniform(1.1, 1.5))).quantize(Decimal("0.01"))
                FormalQuotationItem.objects.create(
                    quotation=fq, item_number=j, description=name,
                    brand=brand, model_number=model,
                    quantity=qty, unit="pcs", unit_price=up,
                )
            won_fqs.append(fq)
            created_won += 1

        # ── Formal Quotations — Rejected (5) ──
        created_rejected = 0
        for i in range(5):
            client = clients[(i + 3) % len(clients)]
            proj = PROJECT_NAMES[(i + 5) % len(PROJECT_NAMES)]
            subtotal = Decimal(str(random.randint(80000, 1200000)))
            vat = (subtotal * Decimal("0.12")).quantize(Decimal("0.01"))
            total = subtotal + vat

            fq = FormalQuotation.objects.create(
                quotation_number=f"FQ-{fq_count + 15 + i + 1:04d}",
                date=datetime.date.today() - datetime.timedelta(days=random.randint(5, 40)),
                client=client,
                client_name=client.name,
                project_title=proj,
                subtotal=subtotal,
                vat_amount=vat,
                total_amount=total,
                status="REJECTED",
                created_by=owner,
            )
            for j, (name, brand, model, price) in enumerate(
                random.sample(ITEMS, k=random.randint(2, 3)), start=1
            ):
                qty = random.randint(1, 10)
                up = Decimal(str(price))
                FormalQuotationItem.objects.create(
                    quotation=fq, item_number=j, description=name,
                    brand=brand, model_number=model,
                    quantity=qty, unit="pcs", unit_price=up,
                )
            created_rejected += 1

        # ── Formal Quotations — Sent / Draft (4 each) ──
        created_other_fq = 0
        for i, st in enumerate(["SENT"] * 4 + ["DRAFT"] * 4):
            client = clients[(i + 6) % len(clients)]
            proj = PROJECT_NAMES[(i + 8) % len(PROJECT_NAMES)]
            subtotal = Decimal(str(random.randint(100000, 1800000)))
            vat = (subtotal * Decimal("0.12")).quantize(Decimal("0.01"))
            total = subtotal + vat

            fq = FormalQuotation.objects.create(
                quotation_number=f"FQ-{fq_count + 20 + i + 1:04d}",
                date=datetime.date.today() - datetime.timedelta(days=random.randint(0, 20)),
                client=client,
                client_name=client.name,
                project_title=proj,
                subtotal=subtotal,
                vat_amount=vat,
                total_amount=total,
                status=st,
                created_by=owner,
            )
            for j, (name, brand, model, price) in enumerate(
                random.sample(ITEMS, k=random.randint(2, 3)), start=1
            ):
                qty = random.randint(1, 8)
                up = Decimal(str(price)) * Decimal(str(random.uniform(1.0, 1.4))).quantize(Decimal("0.01"))
                FormalQuotationItem.objects.create(
                    quotation=fq, item_number=j, description=name,
                    brand=brand, model_number=model,
                    quantity=qty, unit="pcs", unit_price=up,
                )
            created_other_fq += 1

        # ── Sales Orders from Won deals (3) ──
        so_count = SalesOrder.objects.count()
        created_so = 0
        for i, fq in enumerate(won_fqs[:3]):
            SalesOrder.objects.create(
                so_number=f"SO-{so_count + i + 1:04d}",
                date=datetime.date.today() - datetime.timedelta(days=random.randint(0, 10)),
                client_name=fq.client_name,
                project_title=fq.project_title,
                formal_quotation=fq,
                contract_amount=fq.total_amount,
                status=random.choice(["CONFIRMED", "IN_PROGRESS"]),
                created_by=owner,
                awarded_date=datetime.date.today() - datetime.timedelta(days=random.randint(1, 7)),
            )
            created_so += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded: {created_clients} clients, {created_rfqs} RFQs, "
            f"{created_won} WON + {created_rejected} REJECTED + {created_other_fq} SENT/DRAFT quotations, "
            f"{created_so} sales orders"
        ))
