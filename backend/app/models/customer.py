from sqlalchemy import (
    Column, String, Float, Boolean, Integer,
    ForeignKey, DateTime, Text, func
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    group = Column(String(100), default="Retail Gadgets")
    category = Column(String(100), default="Electronics")
    city = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    preferred_contact = Column(String(30), default="whatsapp")
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    total_due = Column(Float, default=0.0)
    active_orders_count = Column(Integer, default=0)
    delivered_orders_count = Column(Integer, default=0)
    cancelled_orders_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    orders = relationship(
        "CustomerOrder",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class CustomerOrder(Base):
    __tablename__ = "customer_orders"

    id = Column(String(36), primary_key=True)
    customer_id = Column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    product_name = Column(String(500), nullable=False)
    product_image = Column(Text, nullable=True)
    product_link = Column(Text, nullable=True)
    weight = Column(Float, default=0.0)
    weight_unit = Column(String(10), default="kg")
    price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    total_amount = Column(Float, nullable=False)
    advance_payment = Column(Float, default=0.0)
    remaining_balance = Column(Float, default=0.0)
    payment_status = Column(String(20), default="unpaid")
    date_time = Column(String(30), nullable=True)
    is_delivered = Column(Boolean, default=False)
    is_cancelled = Column(Boolean, default=False)
    status = Column(String(20), default="active")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    customer = relationship("Customer", back_populates="orders")
