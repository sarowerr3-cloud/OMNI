import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.customer import Customer as CustomerModel, CustomerOrder as CustomerOrderModel
from backend.app.services.customer_service import customer_service

logger = logging.getLogger(__name__)


async def sync_customers_to_db(db: AsyncSession) -> None:
    """Sync in-memory/JSON customers to database tables on startup if empty."""
    try:
        result = await db.execute(select(CustomerModel))
        existing = result.scalars().all()
        if not existing:
            for cust in customer_service._customers.values():
                db_cust = CustomerModel(
                    id=cust.id,
                    name=cust.name,
                    phone=cust.phone,
                    email=cust.email,
                    group=cust.group,
                    category=cust.category,
                    city=cust.city,
                    address=cust.address,
                    notes=cust.notes,
                    preferred_contact=cust.preferred_contact,
                    total_orders=cust.total_orders,
                    total_spent=cust.total_spent,
                    total_due=cust.total_due,
                    active_orders_count=cust.active_orders_count,
                    delivered_orders_count=cust.delivered_orders_count,
                    cancelled_orders_count=cust.cancelled_orders_count,
                )
                db.add(db_cust)
                for ord_item in cust.orders:
                    db_ord = CustomerOrderModel(
                        id=ord_item.id,
                        customer_id=cust.id,
                        product_name=ord_item.product_name,
                        product_image=ord_item.product_image,
                        product_link=ord_item.product_link,
                        weight=ord_item.weight,
                        weight_unit=ord_item.weight_unit,
                        price=ord_item.price,
                        quantity=ord_item.quantity,
                        total_amount=ord_item.total_amount,
                        advance_payment=ord_item.advance_payment,
                        remaining_balance=ord_item.remaining_balance,
                        payment_status=ord_item.payment_status,
                        date_time=ord_item.date_time,
                        is_delivered=ord_item.is_delivered,
                        is_cancelled=ord_item.is_cancelled,
                        status=ord_item.status,
                        notes=ord_item.notes,
                    )
                    db.add(db_ord)
            await db.commit()
            logger.info("Successfully synced initial customer and order records to database.")
    except Exception as e:
        logger.error(f"Error syncing customers to database: {e}")
