import datetime
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from rfq.models import RFQ, RFQItem
from costing.models import CostingSheet

User = get_user_model()

RFQ_TITLES = [
    "Office Furniture Procurement",
    "IT Equipment Upgrade",
    "Building Materials Supply",
    "Electrical Components Order",
    "Plumbing Fixtures Procurement",
    "Safety Equipment Purchase",
    "Cleaning Supplies Order",
    "Network Infrastructure Upgrade",
    "HVAC System Components",
    "Laboratory Equipment Procurement",
]

COSTING_TITLES = [
    "Main Office Renovation",
    "Server Room Build-Out",
    "Warehouse Expansion",
    "Client Portal Development",
    "Security System Installation",
    "Parking Lot Resurfacing",
    "Employee Lounge Remodel",
    "Data Center Cooling Upgrade",
    "Conference Room AV Setup",
    "Emergency Generator Install",
]

STATUSES = ["DRAFT", "PENDING_FOR_CANVASS", "APPROVED", "UNDER_REVIEW"]
PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"]
COSTING_STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED"]

ITEMS = [
    ("Desktop Computer", "HP", "Pro 400 G9", 5, "units"),
    ("Office Chair", "Steelcase", "Leap V2", 10, "pcs"),
    ("LED Monitor", "Dell", "U2723QE", 5, "units"),
    ("Ethernet Cable Cat6", "Panduit", "UTP28SP", 100, "meters"),
    ("Whiteboard", "Quartet", "Q4836", 3, "pcs"),
]


class Command(BaseCommand):
    help = "Seed 10 RFQs and 10 Costing Sheets for dashboard testing"

    def handle(self, *args, **options):
        owner = User.objects.first()
        if not owner:
            self.stderr.write("No users found. Create a user first.")
            return

        # --- Seed RFQs ---
        existing_rfq_count = RFQ.objects.count()
        created_rfqs = 0
        for i, title in enumerate(RFQ_TITLES, start=1):
            num = f"RFQ-SEED-{existing_rfq_count + i:04d}"
            rfq = RFQ.objects.create(
                rfq_number=num,
                title=title,
                description=f"Auto-seeded RFQ for testing: {title}",
                project_title=f"Project {title.split()[0]}",
                client_name=f"Client {chr(64 + i)}",
                status=random.choice(STATUSES),
                priority=random.choice(PRIORITIES),
                issue_date=datetime.date.today() - datetime.timedelta(days=random.randint(0, 30)),
                deadline=datetime.date.today() + datetime.timedelta(days=random.randint(7, 60)),
                created_by=owner,
            )
            for j, (name, brand, model, qty, unit) in enumerate(
                random.sample(ITEMS, k=random.randint(2, len(ITEMS))), start=1
            ):
                RFQItem.objects.create(
                    rfq=rfq,
                    item_number=j,
                    item_name=name,
                    brand=brand,
                    model_number=model,
                    quantity=qty,
                    unit=unit,
                )
            created_rfqs += 1

        # --- Seed Costing Sheets ---
        existing_cs_count = CostingSheet.objects.count()
        created_costings = 0
        for i, title in enumerate(COSTING_TITLES, start=1):
            num = f"CS-SEED-{existing_cs_count + i:04d}"
            CostingSheet.objects.create(
                sheet_number=num,
                title=title,
                description=f"Auto-seeded costing sheet: {title}",
                project_title=f"Project {title.split()[0]}",
                client_name=f"Client {chr(64 + i)}",
                status=random.choice(COSTING_STATUSES),
                total_cost=Decimal(str(random.randint(50000, 500000))),
                total_project_cost=Decimal(str(random.randint(55000, 550000))),
                date=datetime.date.today() - datetime.timedelta(days=random.randint(0, 30)),
                created_by=owner,
            )
            created_costings += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created_rfqs} RFQs and {created_costings} Costing Sheets."
        ))
