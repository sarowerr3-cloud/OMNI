import logging
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.customer import Customer as CustomerModel, CustomerOrder as CustomerOrderModel
from backend.app.services.customer_service import customer_service

logger = logging.getLogger(__name__)


async def ensure_customer_columns(db: AsyncSession) -> None:
    """Ensure newly introduced columns exist in customers and customer_orders tables."""
    for col in ["default_delivery_cost", "default_packing_cost"]:
        try:
            await db.execute(text(f"SELECT {col} FROM customers LIMIT 1"))
        except Exception:
            await db.rollback()
            try:
                await db.execute(text(f"ALTER TABLE customers ADD COLUMN {col} FLOAT DEFAULT 0.0"))
                await db.commit()
            except Exception as alter_err:
                await db.rollback()
                logger.debug(f"Could not add {col} to customers: {alter_err}")

    for col in ["delivery_cost", "packing_cost"]:
        try:
            await db.execute(text(f"SELECT {col} FROM customer_orders LIMIT 1"))
        except Exception:
            await db.rollback()
            try:
                await db.execute(text(f"ALTER TABLE customer_orders ADD COLUMN {col} FLOAT DEFAULT 0.0"))
                await db.commit()
            except Exception as alter_err:
                await db.rollback()
                logger.debug(f"Could not add {col} to customer_orders: {alter_err}")


async def sync_customers_to_db(db: AsyncSession) -> None:
    """Sync in-memory/JSON customers to database tables on startup if empty."""
    try:
        await ensure_customer_columns(db)
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
                    default_delivery_cost=getattr(cust, 'default_delivery_cost', 0.0) or 0.0,
                    default_packing_cost=getattr(cust, 'default_packing_cost', 0.0) or 0.0,
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
                        delivery_cost=ord_item.delivery_cost,
                        packing_cost=ord_item.packing_cost,
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
