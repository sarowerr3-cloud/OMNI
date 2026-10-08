import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional
from backend.app.schemas.product_list import ProductListCreate, ProductListResponse, ProductListItem


class ProductListService:
    def __init__(self):
        # In-memory storage with persistent json backing capability
        self._lists: Dict[str, ProductListResponse] = {}

    def calculate_totals(self, items: List[ProductListItem]):
        total_price_bdt = Decimal('0.00')
        total_weight_kg = Decimal('0.000')
        total_quantity = 0
        total_paid_bdt = Decimal('0.00')

        for item in items:
            qty = Decimal(str(item.quantity))
            line_price = item.price_bdt * qty
            total_price_bdt += line_price
            total_weight_kg += item.weight_kg * qty
            total_quantity += item.quantity

            # Calculate item paid and due amounts
            item_paid = item.paid_amount_bdt if item.paid_amount_bdt is not None else Decimal('0.00')
            item_due = max(Decimal('0.00'), line_price - item_paid)
            item.due_amount_bdt = item_due.quantize(Decimal('0.01'))
            item.paid_amount_bdt = item_paid.quantize(Decimal('0.01'))

            if item_due == 0 and item_paid > 0:
                item.payment_status = "paid"
            elif item_paid > 0:
                item.payment_status = "partial"
            else:
                item.payment_status = "unpaid"

            total_paid_bdt += item_paid

        total_due_bdt = max(Decimal('0.00'), total_price_bdt - total_paid_bdt)
        payment_status = "paid" if total_due_bdt == 0 and total_paid_bdt > 0 else ("partial" if total_paid_bdt > 0 else "unpaid")

        return (
            total_price_bdt.quantize(Decimal('0.01')),
            total_weight_kg.quantize(Decimal('0.001')),
            len(items),
            total_quantity,
            total_paid_bdt.quantize(Decimal('0.01')),
            total_due_bdt.quantize(Decimal('0.01')),
            payment_status
        )

    def create_list(self, data: ProductListCreate) -> ProductListResponse:
        list_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        total_price_bdt, total_weight_kg, total_items_count, total_quantity, total_paid_bdt, total_due_bdt, payment_status = self.calculate_totals(data.items)

        product_list = ProductListResponse(
            id=list_id,
            name=data.name,
            date=data.date,
            items=data.items,
            total_price_bdt=total_price_bdt,
            total_weight_kg=total_weight_kg,
            total_items_count=total_items_count,
            total_quantity=total_quantity,
            total_paid_bdt=total_paid_bdt,
            total_due_bdt=total_due_bdt,
            payment_status=payment_status,
            notes=data.notes,
            created_at=now,
            updated_at=now
        )
        self._lists[list_id] = product_list
        return product_list

    def get_list(self, list_id: str) -> Optional[ProductListResponse]:
        return self._lists.get(list_id)

    def list_all(self) -> List[ProductListResponse]:
        return sorted(self._lists.values(), key=lambda x: x.updated_at, reverse=True)

    def update_list(self, list_id: str, data: ProductListCreate) -> Optional[ProductListResponse]:
        if list_id not in self._lists:
            return None

        existing = self._lists[list_id]
        now = datetime.now(timezone.utc).isoformat()
        total_price_bdt, total_weight_kg, total_items_count, total_quantity, total_paid_bdt, total_due_bdt, payment_status = self.calculate_totals(data.items)

        updated = ProductListResponse(
            id=list_id,
            name=data.name,
            date=data.date,
            items=data.items,
            total_price_bdt=total_price_bdt,
            total_weight_kg=total_weight_kg,
            total_items_count=total_items_count,
            total_quantity=total_quantity,
            total_paid_bdt=total_paid_bdt,
            total_due_bdt=total_due_bdt,
            payment_status=payment_status,
            notes=data.notes,
            created_at=existing.created_at,
            updated_at=now
        )
        self._lists[list_id] = updated
        return updated

    def delete_list(self, list_id: str) -> bool:
        if list_id in self._lists:
            del self._lists[list_id]
            return True
        return False


product_list_service = ProductListService()
