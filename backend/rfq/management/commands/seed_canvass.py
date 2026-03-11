import datetime
import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from rfq.models import RFQ, RFQItem, Supplier, Quotation, QuotationItem

User = get_user_model()

SUPPLIER_NAMES = [
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

RFQ_ITEMS = [
    ("Network Switch 24-Port", "Cisco", "C9200L-24T", 5, "units"),
    ("Wireless Access Point", "Ubiquiti", "U6-Pro", 10, "pcs"),
    ("Server Rack 42U", "APC", "AR3100", 2, "units"),
    ("UPS 3000VA", "APC", "SMT3000RMI2U", 3, "units"),
    ("Cat6 Patch Panel 24-Port", "Panduit", "CP24BLY", 4, "pcs"),
    ("SSD 1TB NVMe", "Samsung", "980 PRO", 20, "pcs"),
    ("Desktop Workstation", "Dell", "Optiplex 7010", 15, "units"),
    ("LED Monitor 27\"", "LG", "27UK850-W", 15, "pcs"),
]

PAYMENT_TERMS = ["Net 30", "Net 60", "COD", "50% DP, 50% on delivery", "Net 15"]
WARRANTY_CHOICES = ["6MOS", "1YR", "3YRS", "5YRS"]
AVAILABILITY_CHOICES = ["ON_STOCK", "ORDER_BASIS"]
VAT_TYPES = ["VAT_INC", "VAT_EX"]


class Command(BaseCommand):
    help = "Seed an RFQ with 3-10 supplier canvass entries for matrix comparison"

    def add_arguments(self, parser):
        parser.add_argument("--suppliers", type=int, default=5, help="Number of canvass entries (3-10)")

    def handle(self, *args, **options):
        num_suppliers = max(3, min(10, options["suppliers"]))
        owner = User.objects.first()
        if not owner:
            self.stderr.write("No users found. Create a user first.")
            return

        # Create or reuse suppliers
        suppliers = []
        for name, contact, email, phone in SUPPLIER_NAMES[:num_suppliers]:
            sup, _ = Supplier.objects.get_or_create(
                name=name,
                defaults={
                    "contact_person": contact,
                    "email": email,
                    "phone": phone,
                    "rating": Decimal(str(round(random.uniform(3.0, 5.0), 2))),
                    "on_time_delivery_rate": Decimal(str(round(random.uniform(80.0, 99.0), 2))),
                    "is_active": True,
                },
            )
            suppliers.append(sup)

        # Create the RFQ
        rfq_count = RFQ.objects.count()
        rfq = RFQ.objects.create(
            rfq_number=f"RFQ-CANVASS-{rfq_count + 1:04d}",
            title="IT Infrastructure Upgrade — Canvass Demo",
            description="Seeded RFQ with multiple supplier quotations for canvass matrix testing.",
            project_title="IT Infrastructure Upgrade",
            client_name="Maptech Information Solutions Inc.",
            status="PENDING_FOR_CANVASS",
            priority="HIGH",
            issue_date=datetime.date.today() - datetime.timedelta(days=5),
            deadline=datetime.date.today() + datetime.timedelta(days=30),
            created_by=owner,
        )

        # Create RFQ line items
        selected_items = random.sample(RFQ_ITEMS, k=random.randint(4, len(RFQ_ITEMS)))
        rfq_items = []
        for j, (name, brand, model, qty, unit) in enumerate(selected_items, start=1):
            ri = RFQItem.objects.create(
                rfq=rfq, item_number=j, item_name=name,
                brand=brand, model_number=model, quantity=qty, unit=unit,
            )
            rfq_items.append(ri)

        # Create quotations (canvass entries) per supplier
        for sup in suppliers:
            q = Quotation.objects.create(
                rfq=rfq,
                supplier=sup,
                quotation_number=f"Q-{sup.name[:3].upper()}-{rfq.id:04d}",
                status="PENDING",
                delivery_days=random.randint(7, 45),
                payment_terms=random.choice(PAYMENT_TERMS),
                validity_days=random.choice([15, 30, 45, 60]),
                notes=f"Quotation from {sup.name}",
            )

            for ri in rfq_items:
                base_price = random.uniform(500, 50000)
                price_variation = random.uniform(0.8, 1.3)
                unit_price = round(base_price * price_variation, 2)
                vat_type = random.choice(VAT_TYPES)

                QuotationItem.objects.create(
                    quotation=q,
                    rfq_item=ri,
                    offer_type=random.choice(["SAME", "COUNTER"]),
                    brand=ri.brand if random.random() > 0.3 else f"{ri.brand} Alt",
                    model_number=ri.model_number if random.random() > 0.3 else f"{ri.model_number}-X",
                    description=f"Supplier offer for {ri.item_name}",
                    quantity=ri.quantity,
                    unit=ri.unit,
                    unit_price=Decimal(str(unit_price)),
                    vat_type=vat_type,
                    vat_rate=Decimal("12.00"),
                    availability=random.choice(AVAILABILITY_CHOICES),
                    availability_detail=random.choice(["Immediate", "7-14 Days", "30 to 45 Days", "2-3 Weeks"]),
                    warranty_period=random.choice(WARRANTY_CHOICES),
                    warranty_detail=random.choice(["Parts & Labor", "Parts Only", "Full Coverage", "Limited"]),
                    price_validity=random.choice(["15 days", "30 days", "45 days"]),
                    delivery_days=random.randint(5, 30),
                )

            q.recalculate_total()

        self.stdout.write(self.style.SUCCESS(
            f"Created RFQ '{rfq.rfq_number}' (ID: {rfq.id}) with {len(rfq_items)} items and {num_suppliers} supplier canvass entries."
        ))
        self.stdout.write(f"  → View at: /rfq/{rfq.id}/compare")
