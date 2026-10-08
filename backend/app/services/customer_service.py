import json
import os
import re
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    CustomerGroup,
    CustomerGroupCreate,
    MessageComposeRequest,
    PersonalizedMessage,
)


# Default Seed Groups
INITIAL_GROUPS = [
    {
        "id": "grp_wholesale",
        "name": "Wholesale Buyers",
        "category": "Electronics",
        "description": "Bulk buyers ordering 20+ units per shipment",
        "color": "#3b82f6",
    },
    {
        "id": "grp_retail_gadgets",
        "name": "Retail Gadgets",
        "category": "Electronics",
        "description": "Retail shop owners focusing on smart watches & earbuds",
        "color": "#10b981",
    },
    {
        "id": "grp_watch_lovers",
        "name": "Watch Retailers",
        "category": "Smart Watches",
        "description": "Specialized in luxury & Ultra series smartwatches",
        "color": "#f59e0b",
    },
    {
        "id": "grp_vip",
        "name": "VIP Clients",
        "category": "High Volume",
        "description": "Top tier recurring clients with direct credit terms",
        "color": "#dc2626",
    },
    {
        "id": "grp_dropship",
        "name": "Dropshippers",
        "category": "E-Commerce",
        "description": "Online page & Daraz BD sellers ordering single units",
        "color": "#8b5cf6",
    },
]

# Default Seed Customers
INITIAL_CUSTOMERS = [
    {
        "id": "cust_1",
        "name": "Rafiqul Islam (Dhaka Gadget Hub)",
        "phone": "+8801711223344",
        "email": "rafiq@gadgethub.bd",
        "group": "Wholesale Buyers",
        "category": "Electronics",
        "city": "Dhaka",
        "address": "Shop 42, Multiplan Center, Elephant Road, Dhaka",
        "notes": "Prefers Ultra 8/9 series AMOLED smart watches. Buys 50+ pcs per order.",
        "preferred_contact": "whatsapp",
        "total_orders": 12,
        "created_at": "2026-09-01T10:00:00Z",
        "updated_at": "2026-10-01T12:00:00Z",
    },
    {
        "id": "cust_2",
        "name": "Tanvir Ahmed (Chittagong Gear)",
        "phone": "+8801819876543",
        "email": "tanvir@ctggear.com",
        "group": "Retail Gadgets",
        "category": "Electronics",
        "city": "Chittagong",
        "address": "GEC Circle, Sanmar Ocean City, Level 3, Chittagong",
        "notes": "Fastest payment clearance. Likes air freight for 7-day arrivals.",
        "preferred_contact": "whatsapp",
        "total_orders": 8,
        "created_at": "2026-09-05T11:30:00Z",
        "updated_at": "2026-10-02T15:20:00Z",
    },
    {
        "id": "cust_3",
        "name": "Shakil Chowdhury (Sylhet Timepiece)",
        "phone": "+8801715556677",
        "email": "sylhettime@gmail.com",
        "group": "Watch Retailers",
        "category": "Smart Watches",
        "city": "Sylhet",
        "address": "Zindabazar Plaza, Level 2, Sylhet",
        "notes": "Interested in Titanium casing and high-res AMOLED displays.",
        "preferred_contact": "whatsapp",
        "total_orders": 5,
        "created_at": "2026-09-10T09:15:00Z",
        "updated_at": "2026-10-05T08:45:00Z",
    },
    {
        "id": "cust_4",
        "name": "Nafisur Rahman (VIP Tech BD)",
        "phone": "+8801912334455",
        "email": "nafis@viptechbd.com",
        "group": "VIP Clients",
        "category": "High Volume",
        "city": "Dhaka",
        "address": "Gulshan-1 DIT Market, Dhaka",
        "notes": "Always wants direct 1688 factory pricing + 5% sourcing commission.",
        "preferred_contact": "whatsapp",
        "total_orders": 19,
        "created_at": "2026-08-15T14:20:00Z",
        "updated_at": "2026-10-06T17:10:00Z",
    },
    {
        "id": "cust_5",
        "name": "Mahmudul Hasan (Rajshahi E-Bazaar)",
        "phone": "+8801618990011",
        "email": "mahmud.ebazaar@yahoo.com",
        "group": "Dropshippers",
        "category": "E-Commerce",
        "city": "Rajshahi",
        "address": "Saheb Bazaar, Rajshahi",
        "notes": "Runs Facebook live commerce. Needs clean high-res product photos.",
        "preferred_contact": "whatsapp",
        "total_orders": 14,
        "created_at": "2026-09-18T16:00:00Z",
        "updated_at": "2026-10-07T11:00:00Z",
    },
]


class CustomerService:
    def __init__(self, storage_dir: str = "backend/data"):
        self.storage_file = os.path.join(storage_dir, "customers.json")
        self._customers: Dict[str, CustomerResponse] = {}
        self._groups: Dict[str, CustomerGroup] = {}
        self._load_data()

    def _ensure_dir(self):
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)

    def _load_data(self):
        self._ensure_dir()
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for c_raw in data.get("customers", []):
                        self._customers[c_raw["id"]] = CustomerResponse(**c_raw)
                    for g_raw in data.get("groups", []):
                        self._groups[g_raw["id"]] = CustomerGroup(**g_raw)
            except Exception as e:
                print(f"Error loading customers from {self.storage_file}: {e}")
                self._seed_defaults()
        else:
            self._seed_defaults()

    def _seed_defaults(self):
        self._customers.clear()
        self._groups.clear()
        for g_data in INITIAL_GROUPS:
            self._groups[g_data["id"]] = CustomerGroup(**g_data)
        for c_data in INITIAL_CUSTOMERS:
            self._customers[c_data["id"]] = CustomerResponse(**c_data)
        self._save_data()

    def _save_data(self):
        try:
            self._ensure_dir()
            data = {
                "customers": [c.model_dump() for c in self._customers.values()],
                "groups": [g.model_dump() for g in self._groups.values()],
            }
            with open(self.storage_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Failed to persist customers data: {e}")

    @staticmethod
    def sanitize_phone_for_whatsapp(phone: str) -> str:
        """
        Cleans phone number into international format for WhatsApp wa.me link.
        e.g. '01711223344' -> '8801711223344'
        '+8801711223344' -> '8801711223344'
        """
        cleaned = re.sub(r"[^\d]", "", phone)
        if cleaned.startswith("01") and len(cleaned) == 11:
            return "88" + cleaned
        elif cleaned.startswith("880") and len(cleaned) == 13:
            return cleaned
        return cleaned

    def list_customers(
        self,
        group: Optional[str] = None,
        category: Optional[str] = None,
        city: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[CustomerResponse]:
        results = list(self._customers.values())

        if group and group != "All":
            results = [c for c in results if c.group.lower() == group.lower()]

        if category and category != "All":
            results = [c for c in results if c.category.lower() == category.lower()]

        if city and city != "All":
            results = [c for c in results if c.city and c.city.lower() == city.lower()]

        if search:
            q = search.lower().strip()
            results = [
                c
                for c in results
                if q in c.name.lower()
                or q in c.phone.lower()
                or (c.email and q in c.email.lower())
                or (c.notes and q in c.notes.lower())
                or (c.address and q in c.address.lower())
            ]

        # Sort by updated_at descending
        return sorted(results, key=lambda x: x.updated_at, reverse=True)

    def get_customer(self, customer_id: str) -> Optional[CustomerResponse]:
        return self._customers.get(customer_id)

    def create_customer(self, data: CustomerCreate) -> CustomerResponse:
        cust_id = f"cust_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        customer = CustomerResponse(
            id=cust_id,
            name=data.name.strip(),
            phone=data.phone.strip(),
            email=data.email.strip() if data.email else None,
            group=data.group.strip(),
            category=data.category.strip(),
            city=data.city.strip() if data.city else "Dhaka",
            address=data.address.strip() if data.address else None,
            notes=data.notes.strip() if data.notes else None,
            preferred_contact=data.preferred_contact or "whatsapp",
            total_orders=0,
            created_at=now,
            updated_at=now,
        )
        self._customers[cust_id] = customer
        self._save_data()
        return customer

    def update_customer(self, customer_id: str, data: CustomerUpdate) -> Optional[CustomerResponse]:
        if customer_id not in self._customers:
            return None

        existing = self._customers[customer_id]
        now = datetime.now(timezone.utc).isoformat()

        updated_dict = existing.model_dump()
        update_data = data.model_dump(exclude_unset=True)

        for k, v in update_data.items():
            if v is not None:
                updated_dict[k] = v

        updated_dict["updated_at"] = now
        updated = CustomerResponse(**updated_dict)
        self._customers[customer_id] = updated
        self._save_data()
        return updated

    def delete_customer(self, customer_id: str) -> bool:
        if customer_id in self._customers:
            del self._customers[customer_id]
            self._save_data()
            return True
        return False

    def list_groups(self) -> List[CustomerGroup]:
        # Count members dynamically
        counts: Dict[str, int] = {}
        for c in self._customers.values():
            counts[c.group] = counts.get(c.group, 0) + 1

        res: List[CustomerGroup] = []
        for g in self._groups.values():
            g_copy = g.model_copy()
            g_copy.member_count = counts.get(g.name, 0)
            res.append(g_copy)

        return res

    def create_group(self, data: CustomerGroupCreate) -> CustomerGroup:
        grp_id = f"grp_{uuid.uuid4().hex[:6]}"
        group = CustomerGroup(
            id=grp_id,
            name=data.name.strip(),
            category=data.category.strip() if data.category else "General",
            description=data.description.strip() if data.description else None,
            color=data.color or "#dc2626",
            member_count=0,
        )
        self._groups[grp_id] = group
        self._save_data()
        return group

    def compose_messages(self, req: MessageComposeRequest) -> List[PersonalizedMessage]:
        target_customers: List[CustomerResponse] = []

        if req.customer_ids and len(req.customer_ids) > 0:
            for cid in req.customer_ids:
                if cid in self._customers:
                    target_customers.append(self._customers[cid])
        elif req.group:
            target_customers = [c for c in self._customers.values() if c.group.lower() == req.group.lower()]
        else:
            target_customers = list(self._customers.values())

        p_name = req.product_title or "Exclusive Sourced Product"
        price_formatted = f"৳{req.price_bdt:,.2f}" if req.price_bdt else "Negotiable / Factory Rate"
        p_url = req.product_url or "https://omni-sourcing.bd"

        results: List[PersonalizedMessage] = []

        for cust in target_customers:
            # Build personalized template
            if req.template_type == "new_arrival":
                msg = (
                    f"Assalamu Alaikum {cust.name}! 🚀\n\n"
                    f"We just sourced an exciting new product directly from China factories:\n"
                    f"📦 *{p_name}*\n"
                    f"💰 Special Client Price: *{price_formatted}*\n"
                    f"🔗 Product Details: {p_url}\n\n"
                    f"Pre-orders and direct air shipment slots are open now for {cust.city or 'Dhaka'} delivery.\n"
                    f"Please reply to this message to reserve your batch units! ✨"
                )
            elif req.template_type == "discount_offer":
                msg = (
                    f"Hello {cust.name}! 🔥\n\n"
                    f"Exclusive Flash Offer for our *{cust.group}* partners:\n"
                    f"🏷️ Product: *{p_name}*\n"
                    f"💵 Offer Price: *{price_formatted}* (Limited Batch)\n\n"
                    f"First come, first served. Let us know how many units you want to lock in today!"
                )
            elif req.template_type == "restock_preorder":
                msg = (
                    f"Dear {cust.name},\n\n"
                    f"Our next scheduled China cargo container is finalizing this week.\n"
                    f"Are you restocking *{p_name}* for your {cust.category} inventory?\n"
                    f"Factory Landed Rate: {price_formatted}\n\n"
                    f"Drop us a message if you want to include your volume in this batch."
                )
            elif req.template_type == "custom" and req.custom_body:
                msg = (
                    req.custom_body.replace("{name}", cust.name)
                    .replace("{group}", cust.group)
                    .replace("{product}", p_name)
                    .replace("{price}", price_formatted)
                    .replace("{city}", cust.city or "")
                    .replace("{url}", p_url)
                )
            else:
                msg = f"Assalamu Alaikum {cust.name}! Sourcing update for {p_name}: {price_formatted}. Details: {p_url}"

            clean_phone = self.sanitize_phone_for_whatsapp(cust.phone)
            encoded_text = urllib.parse.quote(msg)
            wa_url = f"https://wa.me/{clean_phone}?text={encoded_text}"
            sms_url = f"sms:{clean_phone}?body={encoded_text}"

            results.append(
                PersonalizedMessage(
                    customer_id=cust.id,
                    customer_name=cust.name,
                    customer_phone=cust.phone,
                    customer_group=cust.group,
                    message_text=msg,
                    whatsapp_url=wa_url,
                    sms_url=sms_url,
                )
            )

        return results


customer_service = CustomerService()
