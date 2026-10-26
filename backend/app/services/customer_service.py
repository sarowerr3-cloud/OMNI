import json
import logging
import os
import re
import urllib.parse
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

from backend.app.schemas.customer import (
    CustomerCreate,
    CustomerOrder,
    CustomerOrderCreate,
    CustomerOrderUpdate,
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

# Default Seed Customers with Rich Orders
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
        "created_at": "2026-09-01T10:00:00Z",
        "updated_at": "2026-10-01T12:00:00Z",
        "orders": [
            {
                "id": "ord_101",
                "customer_id": "cust_1",
                "product_name": "HK9 Ultra 2 AMOLED Smart Watch (Titanium Case)",
                "product_image": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&auto=format&fit=crop&q=80",
                "product_link": "https://detail.1688.com/offer/732948210344.html",
                "weight": 0.35,
                "weight_unit": "kg",
                "price": 2850.0,
                "quantity": 10,
                "total_amount": 28500.0,
                "advance_payment": 20000.0,
                "remaining_balance": 8500.0,
                "payment_status": "partial",
                "date_time": "2026-10-15 14:30",
                "is_delivered": False,
                "is_cancelled": False,
                "status": "active",
                "notes": "Urgent air cargo dispatch. Customer requested black and orange ocean straps.",
                "created_at": "2026-10-15T14:30:00Z",
                "updated_at": "2026-10-15T14:30:00Z",
            },
            {
                "id": "ord_102",
                "customer_id": "cust_1",
                "product_name": "ANC TWS Wireless Earbuds Pro 2",
                "product_image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80",
                "product_link": "https://detail.1688.com/offer/684920194821.html",
                "weight": 0.18,
                "weight_unit": "kg",
                "price": 1450.0,
                "quantity": 20,
                "total_amount": 29000.0,
                "advance_payment": 29000.0,
                "remaining_balance": 0.0,
                "payment_status": "paid",
                "date_time": "2026-09-28 11:15",
                "is_delivered": True,
                "is_cancelled": False,
                "status": "delivered",
                "notes": "Delivered to Multiplan shop counter. Paid via bKash merchant.",
                "created_at": "2026-09-28T11:15:00Z",
                "updated_at": "2026-10-02T16:00:00Z",
            }
        ]
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
        "created_at": "2026-09-05T11:30:00Z",
        "updated_at": "2026-10-02T15:20:00Z",
        "orders": [
            {
                "id": "ord_201",
                "customer_id": "cust_2",
                "product_name": "65W GaN Fast Charger Dual Type-C",
                "product_image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80",
                "product_link": "https://detail.1688.com/offer/718294104928.html",
                "weight": 0.22,
                "weight_unit": "kg",
                "price": 1150.0,
                "quantity": 15,
                "total_amount": 17250.0,
                "advance_payment": 10000.0,
                "remaining_balance": 7250.0,
                "payment_status": "partial",
                "date_time": "2026-10-20 16:45",
                "is_delivered": False,
                "is_cancelled": False,
                "status": "active",
                "notes": "Air cargo arrived at Dhaka airport, customs clearance in progress.",
                "created_at": "2026-10-20T16:45:00Z",
                "updated_at": "2026-10-20T16:45:00Z",
            }
        ]
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
        "created_at": "2026-09-10T09:15:00Z",
        "updated_at": "2026-10-05T08:45:00Z",
        "orders": [
            {
                "id": "ord_301",
                "customer_id": "cust_3",
                "product_name": "Luxury Mechanical Automatic Skeleton Watch",
                "product_image": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&auto=format&fit=crop&q=80",
                "product_link": "https://detail.1688.com/offer/654819201948.html",
                "weight": 0.45,
                "weight_unit": "kg",
                "price": 3400.0,
                "quantity": 5,
                "total_amount": 17000.0,
                "advance_payment": 17000.0,
                "remaining_balance": 0.0,
                "payment_status": "paid",
                "date_time": "2026-10-01 10:00",
                "is_delivered": True,
                "is_cancelled": False,
                "status": "delivered",
                "notes": "Sundarban Courier receipt sent via WhatsApp.",
                "created_at": "2026-10-01T10:00:00Z",
                "updated_at": "2026-10-05T08:45:00Z",
            }
        ]
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
        "created_at": "2026-08-15T14:20:00Z",
        "updated_at": "2026-10-06T17:10:00Z",
        "orders": [
            {
                "id": "ord_401",
                "customer_id": "cust_4",
                "product_name": "RGB Mechanical Gaming Keyboard (Hot-swappable)",
                "product_image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=80",
                "product_link": "https://detail.1688.com/offer/701928374651.html",
                "weight": 0.95,
                "weight_unit": "kg",
                "price": 2200.0,
                "quantity": 25,
                "total_amount": 55000.0,
                "advance_payment": 30000.0,
                "remaining_balance": 25000.0,
                "payment_status": "partial",
                "date_time": "2026-10-18 13:00",
                "is_delivered": False,
                "is_cancelled": False,
                "status": "active",
                "notes": "Direct factory batch. Blue clicky switch variant.",
                "created_at": "2026-10-18T13:00:00Z",
                "updated_at": "2026-10-18T13:00:00Z",
            }
        ]
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
        "created_at": "2026-09-18T16:00:00Z",
        "updated_at": "2026-10-07T11:00:00Z",
        "orders": [
            {
                "id": "ord_501",
                "customer_id": "cust_5",
                "product_name": "Mini Magnetic Power Bank 10000mAh",
                "product_image": "https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=400&auto=format&fit=crop&q=80",
                "product_link": "https://detail.1688.com/offer/694820194821.html",
                "weight": 0.25,
                "weight_unit": "kg",
                "price": 1250.0,
                "quantity": 10,
                "total_amount": 12500.0,
                "advance_payment": 0.0,
                "remaining_balance": 12500.0,
                "payment_status": "unpaid",
                "date_time": "2026-10-22 17:30",
                "is_delivered": False,
                "is_cancelled": False,
                "status": "active",
                "notes": "Waiting for customer advance payment verification.",
                "created_at": "2026-10-22T17:30:00Z",
                "updated_at": "2026-10-22T17:30:00Z",
            }
        ]
    },
]

DEFAULT_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class CustomerService:
    def __init__(self, storage_dir: Optional[str] = None):
        if storage_dir is None:
            resolved_dir = DEFAULT_STORAGE_DIR
        else:
            resolved_dir = Path(storage_dir)
        self.storage_file = str(resolved_dir / "customers.json")
        self._customers: Dict[str, CustomerResponse] = {}
        self._groups: Dict[str, CustomerGroup] = {}
        self._load_data()

    def _ensure_dir(self):
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)

    def _recalculate_customer_metrics(self, customer_data: dict) -> dict:
        """
        Recalculates customer aggregate stats from their orders.
        """
        raw_orders = customer_data.get("orders", [])
        parsed_orders = []
        for ord_item in raw_orders:
            if isinstance(ord_item, dict):
                # Ensure calculations
                tot = float(ord_item.get("total_amount", 0.0) or (float(ord_item.get("price", 0.0)) * int(ord_item.get("quantity", 1) or 1)))
                adv = float(ord_item.get("advance_payment", 0.0) or 0.0)
                rem = max(0.0, round(tot - adv, 2))
                
                # Payment status
                if adv >= tot and tot > 0:
                    p_stat = "paid"
                elif adv > 0:
                    p_stat = "partial"
                else:
                    p_stat = "unpaid"

                is_del = bool(ord_item.get("is_delivered", False))
                is_can = bool(ord_item.get("is_cancelled", False))
                
                if is_can:
                    stat = "cancelled"
                elif is_del:
                    stat = "delivered"
                else:
                    stat = "active"

                ord_item["total_amount"] = tot
                ord_item["advance_payment"] = adv
                ord_item["remaining_balance"] = rem
                ord_item["payment_status"] = ord_item.get("payment_status") or p_stat
                ord_item["is_delivered"] = is_del
                ord_item["is_cancelled"] = is_can
                ord_item["status"] = stat
                parsed_orders.append(ord_item)

        total_orders = len(parsed_orders)
        total_spent = sum(o["total_amount"] for o in parsed_orders)
        total_due = sum(o["remaining_balance"] for o in parsed_orders if not o.get("is_cancelled"))
        active_count = sum(1 for o in parsed_orders if not o.get("is_delivered") and not o.get("is_cancelled"))
        delivered_count = sum(1 for o in parsed_orders if o.get("is_delivered"))
        cancelled_count = sum(1 for o in parsed_orders if o.get("is_cancelled"))

        customer_data["orders"] = parsed_orders
        customer_data["total_orders"] = total_orders
        customer_data["total_spent"] = round(total_spent, 2)
        customer_data["total_due"] = round(total_due, 2)
        customer_data["active_orders_count"] = active_count
        customer_data["delivered_orders_count"] = delivered_count
        customer_data["cancelled_orders_count"] = cancelled_count
        return customer_data

    def _load_data(self):
        self._ensure_dir()
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    raw_customers = data.get("customers", [])
                    has_orders_data = any(len(c.get("orders", [])) > 0 for c in raw_customers)

                    # If file had no orders at all, reseed with rich orders
                    if not raw_customers or not has_orders_data:
                        self._seed_defaults()
                        return

                    for c_raw in raw_customers:
                        enriched = self._recalculate_customer_metrics(c_raw)
                        self._customers[enriched["id"]] = CustomerResponse(**enriched)
                    for g_raw in data.get("groups", []):
                        self._groups[g_raw["id"]] = CustomerGroup(**g_raw)
                if not self._customers:
                    self._seed_defaults()
            except Exception as e:
                logger.error(f"Error loading customers from {self.storage_file}: {e}")
                self._seed_defaults()
        else:
            self._seed_defaults()

    def _seed_defaults(self):
        self._customers.clear()
        self._groups.clear()
        for g_data in INITIAL_GROUPS:
            self._groups[g_data["id"]] = CustomerGroup(**g_data)
        for c_data in INITIAL_CUSTOMERS:
            enriched = self._recalculate_customer_metrics(dict(c_data))
            self._customers[enriched["id"]] = CustomerResponse(**enriched)
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
            logger.error(f"Failed to persist customers data: {e}")

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """Removes spaces, dashes, parentheses and non-numeric chars for matching."""
        if not phone:
            return ""
        return re.sub(r"[^\d]", "", phone)

    @staticmethod
    def sanitize_phone_for_whatsapp(phone: str) -> str:
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
        phone: Optional[str] = None,
    ) -> List[CustomerResponse]:
        """
        Universal search allows locating any customer by name, phone, address, or order notes.
        """
        results = list(self._customers.values())

        if group and group != "All":
            results = [c for c in results if c.group.lower() == group.lower()]

        if category and category != "All":
            results = [c for c in results if c.category.lower() == category.lower()]

        if city and city != "All":
            results = [c for c in results if c.city and c.city.lower() == city.lower()]

        if phone:
            target_norm = self.normalize_phone(phone)
            results = [
                c for c in results
                if target_norm in self.normalize_phone(c.phone)
            ]

        if search:
            q = search.lower().strip()
            q_digits = self.normalize_phone(q)

            matched: List[CustomerResponse] = []
            for c in results:
                name_match = q in c.name.lower()
                address_match = bool(c.address and q in c.address.lower())
                notes_match = bool(c.notes and q in c.notes.lower())
                email_match = bool(c.email and q in c.email.lower())
                phone_match = q in c.phone.lower() or (bool(q_digits) and q_digits in self.normalize_phone(c.phone))

                # Check inside customer orders as well
                order_match = any(
                    q in ord.product_name.lower() or (ord.notes and q in ord.notes.lower())
                    for ord in c.orders
                )

                if name_match or address_match or notes_match or email_match or phone_match or order_match:
                    matched.append(c)

            results = matched

        # Sort by updated_at descending
        return sorted(results, key=lambda x: x.updated_at, reverse=True)

    def get_customer(self, customer_id: str) -> Optional[CustomerResponse]:
        return self._customers.get(customer_id)

    def get_customer_by_phone(self, phone: str) -> Optional[CustomerResponse]:
        """
        Fast lookup by phone number when a customer places an order.
        """
        target = self.normalize_phone(phone)
        if not target:
            return None

        # Look for exact or suffix match (e.g. 01711... in 8801711...)
        for c in self._customers.values():
            c_norm = self.normalize_phone(c.phone)
            if c_norm == target or c_norm.endswith(target) or target.endswith(c_norm):
                return c
        return None

    def create_customer(self, data: CustomerCreate) -> CustomerResponse:
        cust_id = f"cust_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        customer_dict = {
            "id": cust_id,
            "name": data.name.strip(),
            "phone": data.phone.strip(),
            "address": data.address.strip() if data.address else None,
            "notes": data.notes.strip() if data.notes else None,
            "email": data.email.strip() if data.email else None,
            "group": data.group.strip() if data.group else "Retail Gadgets",
            "category": data.category.strip() if data.category else "Electronics",
            "city": data.city.strip() if data.city else "Dhaka",
            "preferred_contact": data.preferred_contact or "whatsapp",
            "orders": [],
            "total_orders": 0,
            "total_spent": 0.0,
            "total_due": 0.0,
            "active_orders_count": 0,
            "delivered_orders_count": 0,
            "cancelled_orders_count": 0,
            "created_at": now,
            "updated_at": now,
        }

        customer = CustomerResponse(**customer_dict)
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
        enriched = self._recalculate_customer_metrics(updated_dict)
        updated = CustomerResponse(**enriched)
        self._customers[customer_id] = updated
        self._save_data()
        return updated

    def delete_customer(self, customer_id: str) -> bool:
        if customer_id in self._customers:
            del self._customers[customer_id]
            self._save_data()
            return True
        return False

    # -------------------------------------------------------------
    # CUSTOMER ORDERS MANAGEMENT
    # -------------------------------------------------------------
    def get_orders(self, customer_id: str) -> List[CustomerOrder]:
        cust = self.get_customer(customer_id)
        if not cust:
            return []
        return cust.orders

    def add_order(self, customer_id: str, order_data: CustomerOrderCreate) -> Optional[CustomerOrder]:
        if customer_id not in self._customers:
            return None

        cust = self._customers[customer_id]
        order_id = f"ord_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        # Date and time formatting
        if order_data.date_time:
            dt_str = order_data.date_time.strip()
        else:
            dt_str = datetime.now().strftime("%Y-%m-%d %H:%M")

        qty = order_data.quantity if (order_data.quantity and order_data.quantity > 0) else 1
        unit_price = float(order_data.price)
        total_amt = float(order_data.total_amount) if order_data.total_amount is not None else round(unit_price * qty, 2)
        adv_payment = float(order_data.advance_payment or 0.0)
        rem_balance = max(0.0, round(total_amt - adv_payment, 2))

        # Payment status calculation
        if adv_payment >= total_amt and total_amt > 0:
            payment_status = "paid"
        elif adv_payment > 0:
            payment_status = "partial"
        else:
            payment_status = "unpaid"

        is_delivered = bool(order_data.is_delivered)
        is_cancelled = bool(order_data.is_cancelled)

        if is_cancelled:
            status = "cancelled"
        elif is_delivered:
            status = "delivered"
        else:
            status = order_data.status or "active"

        new_order = CustomerOrder(
            id=order_id,
            customer_id=customer_id,
            product_name=order_data.product_name.strip(),
            product_image=order_data.product_image.strip() if order_data.product_image else None,
            product_link=order_data.product_link.strip() if order_data.product_link else None,
            weight=float(order_data.weight or 0.0),
            weight_unit=order_data.weight_unit or "kg",
            price=unit_price,
            quantity=qty,
            total_amount=total_amt,
            advance_payment=adv_payment,
            remaining_balance=rem_balance,
            payment_status=payment_status,
            date_time=dt_str,
            is_delivered=is_delivered,
            is_cancelled=is_cancelled,
            status=status,
            notes=order_data.notes.strip() if order_data.notes else None,
            created_at=now,
            updated_at=now,
        )

        cust_dict = cust.model_dump()
        cust_dict["orders"].insert(0, new_order.model_dump())
        cust_dict["updated_at"] = now

        enriched = self._recalculate_customer_metrics(cust_dict)
        self._customers[customer_id] = CustomerResponse(**enriched)
        self._save_data()
        return new_order

    def update_order(
        self, customer_id: str, order_id: str, update_data: CustomerOrderUpdate
    ) -> Optional[CustomerOrder]:
        if customer_id not in self._customers:
            return None

        cust = self._customers[customer_id]
        cust_dict = cust.model_dump()
        orders_list = cust_dict.get("orders", [])

        target_idx = -1
        for idx, o in enumerate(orders_list):
            if o.get("id") == order_id:
                target_idx = idx
                break

        if target_idx == -1:
            return None

        now = datetime.now(timezone.utc).isoformat()
        current_order = orders_list[target_idx]
        updates = update_data.model_dump(exclude_unset=True)

        for k, v in updates.items():
            if v is not None:
                current_order[k] = v

        # Re-evaluate calculations
        qty = int(current_order.get("quantity", 1) or 1)
        unit_price = float(current_order.get("price", 0.0))
        
        if "total_amount" in updates and updates["total_amount"] is not None:
            tot = float(updates["total_amount"])
        else:
            tot = round(unit_price * qty, 2)
            
        adv = float(current_order.get("advance_payment", 0.0) or 0.0)
        rem = max(0.0, round(tot - adv, 2))

        if adv >= tot and tot > 0:
            p_stat = "paid"
        elif adv > 0:
            p_stat = "partial"
        else:
            p_stat = "unpaid"

        is_delivered = bool(current_order.get("is_delivered", False))
        is_cancelled = bool(current_order.get("is_cancelled", False))

        if is_cancelled:
            status = "cancelled"
        elif is_delivered:
            status = "delivered"
        else:
            status = "active"

        current_order["total_amount"] = tot
        current_order["advance_payment"] = adv
        current_order["remaining_balance"] = rem
        current_order["payment_status"] = p_stat
        current_order["is_delivered"] = is_delivered
        current_order["is_cancelled"] = is_cancelled
        current_order["status"] = status
        current_order["updated_at"] = now

        orders_list[target_idx] = current_order
        cust_dict["orders"] = orders_list
        cust_dict["updated_at"] = now

        enriched = self._recalculate_customer_metrics(cust_dict)
        self._customers[customer_id] = CustomerResponse(**enriched)
        self._save_data()

        return CustomerOrder(**current_order)

    def delete_order(self, customer_id: str, order_id: str) -> bool:
        if customer_id not in self._customers:
            return False

        cust = self._customers[customer_id]
        cust_dict = cust.model_dump()
        initial_count = len(cust_dict.get("orders", []))
        cust_dict["orders"] = [o for o in cust_dict.get("orders", []) if o.get("id") != order_id]

        if len(cust_dict["orders"]) == initial_count:
            return False

        now = datetime.now(timezone.utc).isoformat()
        cust_dict["updated_at"] = now
        enriched = self._recalculate_customer_metrics(cust_dict)
        self._customers[customer_id] = CustomerResponse(**enriched)
        self._save_data()
        return True

    # -------------------------------------------------------------
    # CUSTOMER GROUPS & OUTREACH
    # -------------------------------------------------------------
    def list_groups(self) -> List[CustomerGroup]:
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
